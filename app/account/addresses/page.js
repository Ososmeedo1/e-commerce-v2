"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  addAddress,
  listAddresses,
  softDeleteAddress,
  updateAddress,
} from "@/lib/endpoints";
import { useToast } from "@/hooks/useToast";
import { serverFormError } from "@/lib/format";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import AddressForm from "@/components/account/AddressForm";

function composeLine(a) {
  return `${a?.buildingNumber || ""} ${a?.addressLabel || ""}, ${a?.city || ""}, ${a?.country || ""}`
    .replace(/\s+/g, " ")
    .trim();
}

export default function AddressesPage() {
  const toast = useToast();
  const [state, setState] = useState({ status: "loading", items: [] });
  const [modal, setModal] = useState({ open: false, address: null });
  const [formError, setFormError] = useState("");
  const [formPending, setFormPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionPending, setActionPending] = useState("");
  // Initial focus target for the add/edit modal (Country field).
  const firstFieldRef = useRef(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const res = await apiFetch(listAddresses(), { auth: true });
      // 401/403 + auth-shaped 400s never settle here — apiFetch redirects first.
      setState({ status: "ok", items: Array.isArray(res?.data) ? res.data : [] });
    } catch {
      setState({ status: "error", items: [] });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch (sanctioned; resolution is async)
    load();
  }, [load]);

  const openAdd = () => {
    setFormError("");
    setModal({ open: true, address: null });
  };

  const openEdit = (address) => {
    setFormError("");
    setModal({ open: true, address });
  };

  const closeModal = () => {
    if (formPending) return undefined;
    setModal({ open: false, address: null });
    setFormError("");
    return undefined;
  };

  const submitForm = async (body) => {
    setFormError("");
    setFormPending(true);
    try {
      if (modal.address) {
        await apiFetch(updateAddress(modal.address._id), {
          method: "PUT",
          body,
          auth: true,
        });
        toast.success("Address updated");
      } else {
        await apiFetch(addAddress(), { method: "POST", body, auth: true });
        toast.success("Address added");
      }
      setModal({ open: false, address: null });
      load();
    } catch (err) {
      setFormError(serverFormError(err, "Could not save address. Try again."));
      toast.error(serverFormError(err, "Could not save address"));
    } finally {
      setFormPending(false);
    }
  };

  const setDefault = async (address) => {
    setActionPending(address._id);
    try {
      await apiFetch(updateAddress(address._id), {
        method: "PUT",
        body: { setAsDefault: true },
        auth: true,
      });
      toast.success("Default address updated");
      load();
    } catch (err) {
      toast.error(friendlyError(err, "Could not set default address"));
    } finally {
      setActionPending("");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionPending(deleteTarget._id);
    try {
      await apiFetch(softDeleteAddress(deleteTarget._id), {
        method: "PATCH",
        auth: true,
      });
      toast.success("Address deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(friendlyError(err, "Could not delete address"));
    } finally {
      setActionPending("");
    }
  };

  if (state.status === "loading") {
    return (
      <div>
        <div className="h-7 w-44 skeleton-shimmer rounded-sm" aria-hidden="true" />
        <p className="sr-only">Loading addresses…</p>
        <div className="mt-6 space-y-3" aria-hidden="true">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text">Addresses</h1>
        <ErrorState onRetry={load} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Addresses</h1>
        <Button variant="primary" onClick={openAdd}>
          Add address
        </Button>
      </div>

      {state.items.length === 0 ? (
        <EmptyState
          title="No addresses yet"
          description="Add a delivery address to speed up checkout."
          action={<Button onClick={openAdd}>Add address</Button>}
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {state.items.map((a) => (
            <li key={a._id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="break-words text-sm font-semibold text-text">{composeLine(a)}</p>
                  {a.isDefault && <Badge variant="success">Default</Badge>}
                </div>
                <p className="mt-1 text-xs text-text-subdued">
                  {[a.floorNumber !== undefined && a.floorNumber !== null ? `Floor ${a.floorNumber}` : null, a.postalCode ? `Postal ${a.postalCode}` : null]
                    .filter(Boolean)
                    .join(" · ") || "No extra details"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>
                    Edit
                  </Button>
                  {!a.isDefault && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={actionPending === a._id}
                      onClick={() => setDefault(a)}
                    >
                      Set as default
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(a)}>
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.address ? "Edit address" : "Add address"}
        initialFocusRef={firstFieldRef}
      >
        {modal.open && (
          <AddressForm
            key={modal.address?._id || "new"}
            mode={modal.address ? "edit" : "add"}
            initial={modal.address}
            pending={formPending}
            serverError={formError}
            onSubmit={submitForm}
            onCancel={closeModal}
            initialFocusRef={firstFieldRef}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (actionPending ? undefined : setDeleteTarget(null))}
        title="Delete address?"
        description="This address will be removed from your account."
        footerVariant="destructive"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={Boolean(actionPending)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              loading={Boolean(actionPending)}
            >
              Yes, delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          {deleteTarget ? composeLine(deleteTarget) : ""}
        </p>
      </Modal>
    </div>
  );
}
