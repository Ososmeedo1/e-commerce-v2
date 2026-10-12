"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { listCategories } from "@/lib/endpoints";
import {
  adminAddCategory,
  adminDeleteCategory,
  adminUpdateCategory,
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
const TAG = "[admin/categories]";

// Query is the source of truth (URL-driven, buyer convention): Pagination
// links and back/forward work without extra state sync.
function queryFor(searchParams, patch) {
  const qs = new URLSearchParams(searchParams.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v) qs.set(k, v);
    else qs.delete(k);
  }
  const s = qs.toString();
  return s ? `/admin/categories?${s}` : "/admin/categories";
}

function toFormData(name, file) {
  const fd = new FormData();
  fd.append("name", name);
  if (file) fd.append("image", file);
  return fd;
}

export default function AdminCategoriesPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

  const [retryKey, setRetryKey] = useState(0);
  // Optimistic override, pinned to the query it belongs to — a page change
  // naturally drops it (products-page pattern, no stale masks).
  const [override, setOverride] = useState(null); // { query, rows, total } | null
  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", row }
  const [modalErrors, setModalErrors] = useState({});
  const [modalBanner, setModalBanner] = useState("");
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null); // category | null (delete)
  const [deleting, setDeleting] = useState(false);

  const result = useAsyncData(
    () =>
      apiFetch(listCategories(), { auth: true, params: { page, limit: LIMIT } })
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
  const queryKey = `${page}|${retryKey}`;
  const rows =
    override && override.query === queryKey
      ? override.rows
      : (result.data?.rows ?? []);
  const total =
    override && override.query === queryKey
      ? override.total
      : (result.data?.total ?? 0);

  const openCreate = () => {
    setModal({ mode: "create" });
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

  const submitModal = async ({ name, file }) => {
    const creating = modal?.mode === "create";
    // No-op guard (do NOT remove): the backend update rejects re-saving the
    // unchanged name as a duplicate — findOne({name}) matches the doc
    // itself → 400. Skip the round-trip when nothing changed.
    if (!creating && name === (modal.row.name ?? "") && !file) {
      setModalBanner("No changes to save.");
      return;
    }
    setPending(true);
    setModalErrors({});
    setModalBanner("");
    try {
      if (creating) {
        const res = await apiFetch(adminAddCategory(), {
          method: "POST",
          auth: true,
          rawBody: true,
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
        toast.success("Category created");
      } else {
        const id = modal.row._id;
        const res = await apiFetch(adminUpdateCategory(id), {
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
        toast.success("Category updated");
      }
      setModal(null);
    } catch (err) {
      console.error(TAG, err);
      failModal(err, creating ? "Could not create category. Try again." : "Could not update category. Try again.");
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
      rows: rows.filter((c) => c._id !== target._id),
      total: Math.max(0, total - 1),
    });
    try {
      await apiFetch(adminDeleteCategory(target._id), {
        method: "DELETE",
        auth: true,
      });
      toast.success("Category deleted");
      setTarget(null);
    } catch (err) {
      console.error(TAG, err);
      setOverride({ query: queryKey, ...snapshot });
      toast.error(friendlyError(err, "Could not delete category. Try again."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Category",
      render: (c) => (
        <span className="flex items-center gap-2 font-medium text-text">
          {c.Image?.fileUrl && (
            <Image
              src={c.Image.fileUrl}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm object-cover"
            />
          )}
          {c.name}
        </span>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      render: (c) => (
        <span className="font-mono text-sm text-text-subdued">{c.slug || "—"}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (c) => (c.createdAt ? formatDate(c.createdAt) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (c) => (
        <span className="inline-flex gap-2">
          <Button variant="plain" onClick={() => openEdit(c)}>
            Edit
          </Button>
          <Button variant="plain" onClick={() => setTarget(c)}>
            Delete
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Categories</h1>
          <p className="mt-1 text-sm text-text-subdued" role="status">
            {total} categor{total === 1 ? "y" : "ies"}
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + New category
        </Button>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          loading={result.loading}
          error={result.error}
          emptyMessage="No categories yet. Create the first one above."
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
        title={modal?.mode === "edit" ? "Edit category" : "New category"}
        description="Name plus one image. The image is required on create."
        initialName={modal?.mode === "edit" ? (modal.row.name ?? "") : ""}
        currentImageUrl={
          modal?.mode === "edit" ? (modal.row.Image?.fileUrl ?? "") : ""
        }
        requireImage={modal?.mode !== "edit"}
        imageLabel="Category image"
        nameMin={3}
        nameMax={20}
        submitLabel={modal?.mode === "edit" ? "Save changes" : "Create category"}
        pending={pending}
        serverErrors={modalErrors}
        banner={modalBanner}
        onSubmit={submitModal}
      />

      <DeleteConfirmModal
        open={target !== null}
        onClose={() => (deleting ? undefined : setTarget(null))}
        title="Delete category"
        itemName={target?.name}
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
