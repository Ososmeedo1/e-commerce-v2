"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { listBrands, listCategories, listSubCategories } from "@/lib/endpoints";
import {
  adminAddBrand,
  adminDeleteBrand,
  adminUpdateBrand,
} from "@/lib/admin";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/hooks/useToast";
import {
  fieldErrorsFromStack,
  formatDate,
  friendlyError,
  serverFormError,
} from "@/lib/format";
import DataTable from "@/components/admin/DataTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import EntityFormModal from "@/components/admin/EntityFormModal";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";

const LIMIT = 12; // buyer list convention
const TAG = "[admin/brands]";

// Query is the source of truth (URL-driven, buyer convention): Pagination
// links and back/forward work without extra state sync.
function queryFor(searchParams, patch) {
  const qs = new URLSearchParams(searchParams.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v) qs.set(k, v);
    else qs.delete(k);
  }
  const s = qs.toString();
  return s ? `/admin/brands?${s}` : "/admin/brands";
}

function truncId(value) {
  const s = String(value?._id ?? value ?? "");
  return s.length > 8 ? `${s.slice(0, 8)}…` : s || "—";
}

function refName(ref) {
  if (ref && typeof ref === "object") return ref.name || truncId(ref);
  return truncId(ref);
}

function refId(ref) {
  return String(ref?._id ?? ref ?? "");
}

function toFormData(name, file) {
  const fd = new FormData();
  fd.append("name", name);
  if (file) fd.append("image", file);
  return fd;
}

const fetchAll = (builder) => () =>
  apiFetch(builder(), { auth: true, params: { limit: 200 } }).then((res) =>
    Array.isArray(res?.data) ? res.data : []
  );

export default function AdminBrandsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

  const [retryKey, setRetryKey] = useState(0);
  // Optimistic override, pinned to the query it belongs to — a page change
  // naturally drops it (categories-page pattern, no stale masks).
  const [override, setOverride] = useState(null); // { query, rows, total } | null
  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", row }
  const [parents, setParents] = useState({ category: "", subCategory: "" });
  const [modalErrors, setModalErrors] = useState({});
  const [modalBanner, setModalBanner] = useState("");
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null); // brand | null (delete)
  const [deleting, setDeleting] = useState(false);

  const result = useAsyncData(
    () =>
      apiFetch(listBrands(), { auth: true, params: { page, limit: LIMIT } })
        .then((res) => ({
          rows: Array.isArray(res?.data) ? res.data : [],
          total: typeof res?.total === "number" ? res.total : 0,
        }))
        .catch((err) => {
          console.error(TAG, err);
          throw err;
        }),
    [page, retryKey]
  );
  // Picker sources stay small; single capped fetches (no pager needed).
  const cats = useAsyncData(fetchAll(listCategories));
  const subs = useAsyncData(fetchAll(listSubCategories));
  const categories = cats.data ?? [];
  const subCategories = subs.data ?? [];

  const queryKey = `${page}|${retryKey}`;
  const rows =
    override && override.query === queryKey
      ? override.rows
      : (result.data?.rows ?? []);
  const total =
    override && override.query === queryKey
      ? override.total
      : (result.data?.total ?? 0);

  // Subcategory options follow the picked category (backend validates the
  // pair as a triple — a cross-category pick 404s, so don't offer it).
  const subOptions = parents.category
    ? subCategories.filter((s) => refId(s.categoryId) === parents.category)
    : subCategories;

  const openCreate = () => {
    setModal({ mode: "create" });
    setParents({ category: "", subCategory: "" });
    setModalErrors({});
    setModalBanner("");
  };

  const openEdit = (row) => {
    setModal({ mode: "edit", row });
    setModalErrors({});
    setModalBanner("");
  };

  const failModal = (err, fallback) => {
    // Joi details (err.data.stack) map to fields by backend path name;
    // unpathed details collapse to the banner below the form.
    const fields = fieldErrorsFromStack(err?.data?.stack);
    const banner = fields[""];
    delete fields[""];
    setModalErrors(fields);
    setModalBanner(banner || serverFormError(err, fallback));
  };

  const submitModal = async ({ name, file, extra }) => {
    const creating = modal?.mode === "create";
    if (!creating && name === (modal.row.name ?? "") && !file) {
      setModalBanner("No changes to save.");
      return;
    }
    setPending(true);
    setModalErrors({});
    setModalBanner("");
    try {
      if (creating) {
        // Parent ids travel as QUERY (?category=&subCategory=); only
        // {name, image} go in the multipart body (brands.schema.js).
        const res = await apiFetch(adminAddBrand(), {
          method: "POST",
          auth: true,
          rawBody: true,
          params: { category: extra.category, subCategory: extra.subCategory },
          body: toFormData(name, file),
        });
        const created = res?.data;
        if (created && created._id) {
          setOverride({
            query: queryKey,
            rows: [created, ...rows],
            total: total + 1,
          });
        } else {
          setRetryKey((k) => k + 1);
        }
        toast.success("Brand created");
      } else {
        const id = modal.row._id;
        const res = await apiFetch(adminUpdateBrand(id), {
          method: "PUT",
          auth: true,
          rawBody: true,
          body: toFormData(name, file),
        });
        const updated = res?.data;
        if (updated && updated._id) {
          setOverride({
            query: queryKey,
            rows: rows.map((r) => (r._id === id ? updated : r)),
            total,
          });
        } else {
          setRetryKey((k) => k + 1);
        }
        toast.success("Brand updated");
      }
      setModal(null);
    } catch (err) {
      console.error(TAG, err);
      failModal(err, creating ? "Could not create brand. Try again." : "Could not update brand. Try again.");
    } finally {
      setPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!target) return;
    const snapshot = { rows, total };
    setDeleting(true);
    setOverride({
      query: queryKey,
      rows: rows.filter((b) => b._id !== target._id),
      total: Math.max(0, total - 1),
    });
    try {
      await apiFetch(adminDeleteBrand(target._id), {
        method: "DELETE",
        auth: true,
      });
      toast.success("Brand deleted");
      setTarget(null);
    } catch (err) {
      console.error(TAG, err);
      setOverride({ query: queryKey, ...snapshot });
      toast.error(friendlyError(err, "Could not delete brand. Try again."));
    } finally {
      setDeleting(false);
    }
  };

  const setParent = (key) => (e) => {
    const v = e.target.value;
    setParents((p) =>
      key === "category"
        ? { category: v, subCategory: "" } // category change resets the child pick
        : { ...p, subCategory: v }
    );
    setModalErrors({});
    setModalBanner("");
  };

  const selectClass =
    "h-10 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-text";

  const parentPickers = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="brand-category" className="mb-1 block text-sm font-medium text-text">
          Category <span aria-hidden="true" className="text-danger"> *</span>
        </label>
        <select
          id="brand-category"
          value={parents.category}
          onChange={setParent("category")}
          disabled={pending}
          required
          className={selectClass}
        >
          <option value="">Pick a category…</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="brand-subcategory" className="mb-1 block text-sm font-medium text-text">
          Subcategory <span aria-hidden="true" className="text-danger"> *</span>
        </label>
        <select
          id="brand-subcategory"
          value={parents.subCategory}
          onChange={setParent("subCategory")}
          disabled={pending || !parents.category}
          required
          className={selectClass}
        >
          <option value="">
            {parents.category ? "Pick a subcategory…" : "Pick a category first"}
          </option>
          {subOptions.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const columns = [
    {
      key: "name",
      label: "Brand",
      render: (b) => (
        <span className="flex items-center gap-2 font-medium text-text">
          {b.logo?.fileUrl && (
            <Image
              src={b.logo.fileUrl}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm object-cover"
            />
          )}
          {b.name}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (b) => (
        <span title={refId(b.categoryId)}>{refName(b.categoryId)}</span>
      ),
    },
    {
      key: "subcategory",
      label: "Subcategory",
      render: (b) => (
        <span title={refId(b.subCategoryId)}>{refName(b.subCategoryId)}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (b) => (b.createdAt ? formatDate(b.createdAt) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (b) => (
        <span className="inline-flex gap-2">
          <Button variant="plain" onClick={() => openEdit(b)}>
            Edit
          </Button>
          <Button variant="plain" onClick={() => setTarget(b)}>
            Delete
          </Button>
        </span>
      ),
    },
  ];

  const creating = modal?.mode === "create";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Brands</h1>
          <p className="mt-1 text-sm text-text-subdued" role="status">
            {total} brand{total === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + New brand
        </Button>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          loading={result.loading}
          error={result.error}
          emptyMessage="No brands yet. Create the first one above."
          onRetry={() => setRetryKey((k) => k + 1)}
          footer={
            total > 0 ? (
              <Pagination
                page={page}
                total={total}
                limit={LIMIT}
                baseHref={queryFor(searchParams, { page: "" })}
              />
            ) : null
          }
        />
      </div>

      <EntityFormModal
        key={modal === null ? "closed" : `${modal.mode}-${modal.row?._id ?? "new"}`}
        open={modal !== null}
        onClose={() => (pending ? undefined : setModal(null))}
        title={creating ? "New brand" : "Edit brand"}
        description={
          creating
            ? "Pick the parent category + subcategory, then name and logo."
            : "Rename and/or replace the logo. Parents cannot be changed after creation."
        }
        initialName={!creating && modal ? (modal.row.name ?? "") : ""}
        currentImageUrl={!creating && modal ? (modal.row.logo?.fileUrl ?? "") : ""}
        requireImage={creating}
        imageLabel="Brand logo"
        nameMin={2}
        nameMax={100}
        parentPickers={creating ? parentPickers : null}
        extra={parents}
        extraValid={!creating || (Boolean(parents.category) && Boolean(parents.subCategory))}
        submitLabel={creating ? "Create brand" : "Save changes"}
        pending={pending}
        serverErrors={modalErrors}
        banner={modalBanner}
        onSubmit={submitModal}
      />

      <DeleteConfirmModal
        open={target !== null}
        onClose={() => (deleting ? undefined : setTarget(null))}
        title="Delete brand"
        itemName={target?.name}
        note="Related products are not affected."
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
