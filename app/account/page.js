"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { deleteAccount, getProfile, updateAccount } from "@/lib/endpoints";
import { formatDate, friendlyError } from "@/lib/format";
import { ageError, phoneError } from "@/lib/validation";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";

function composeAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [address.buildingNumber, address.addressLabel, address.city, address.country]
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== "")
    .join(", ");
}

function initialOf(name) {
  return (name || "?").charAt(0).toUpperCase();
}

export default function AccountProfilePage() {
  const router = useRouter();
  const { refresh, logout } = useAuth();
  const { clearLocal } = useCart();
  const toast = useToast();
  const [state, setState] = useState({ status: "loading", user: null, address: null });
  const [editing, setEditing] = useState(false);
  // Q13 resolved: PUT /users/update sends ONLY fields the user actually
  // edited (see changedFields below), whitelisted to profile keys present
  // in the Bruno examples (username, phone, age — a subset of the full
  // user/address field list). Empty/unchanged values are dropped, never sent.
  const [form, setForm] = useState({ username: "", phone: "", age: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Initial focus target for the delete modal (type-to-confirm field).
  // Passed as `ref` to Input — React 19 forwards it as a prop to <input>.
  const deleteNameRef = useRef(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const res = await apiFetch(getProfile(), { auth: true });
      // 401/403 + auth-shaped 400s never settle here — apiFetch redirects first.
      setState({
        status: "ok",
        user: res?.data?.user || null,
        address: res?.data?.address || null,
      });
    } catch {
      setState({ status: "error", user: null, address: null });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch (sanctioned; resolution is async)
    load();
  }, [load]);

  const startEdit = (user) => {
    setForm({
      username: user?.username || "",
      phone: user?.phone || "",
      age: user?.age === undefined || user?.age === null ? "" : String(user.age),
    });
    setFormError("");
    setEditing(true);
  };

  const changedFields = (user) => {
    const body = {};
    if (form.username.trim() !== (user?.username || "")) {
      body.username = form.username.trim();
    }
    if (form.phone.trim() !== (user?.phone || "")) {
      body.phone = form.phone.trim();
    }
    const ageRaw = form.age.trim();
    const origAge = user?.age === undefined || user?.age === null ? "" : String(user.age);
    if (ageRaw !== origAge && ageRaw !== "") {
      body.age = Number(ageRaw);
    }
    return body;
  };

  const saveProfile = async (e, user) => {
    e.preventDefault();
    setFormError("");
    if (!form.username.trim()) {
      setFormError("Username is required.");
      return;
    }
    // Backend accepts age 12–100 / Egyptian mobile only (user.schema.js) —
    // mirror it here so the 400 never surprises (Q13).
    if (form.age.trim() !== "") {
      const ageErr = ageError(form.age);
      if (ageErr) {
        setFormError(ageErr);
        return;
      }
    }
    if (form.phone.trim() !== "") {
      const phoneErr = phoneError(form.phone);
      if (phoneErr) {
        setFormError(phoneErr);
        return;
      }
    }
    const body = changedFields(user);
    if (Object.keys(body).length === 0) return;
    setSaving(true);
    try {
      await apiFetch(updateAccount(), { method: "PUT", body, auth: true });
      toast.success("Profile updated");
      await refresh();
      setEditing(false);
      load();
    } catch (err) {
      // A 400 here may reveal a disallowed field (Q13) — surface it verbatim.
      setFormError(friendlyError(err, "Could not update profile. Try again."));
      toast.error(friendlyError(err, "Could not update profile"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(deleteAccount(), { method: "DELETE", auth: true });
      clearLocal();
      logout();
      toast.success("Account deleted");
      router.replace("/");
    } catch (err) {
      toast.error(friendlyError(err, "Could not delete account"));
    } finally {
      setDeleting(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div>
        <div className="h-7 w-40 skeleton-shimmer rounded-sm" aria-hidden="true" />
        <p className="sr-only">Loading profile…</p>
        <div className="mt-6 space-y-3" aria-hidden="true">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return <ErrorState onRetry={load} />;
  }

  const user = state.user;
  if (!user) {
    return (
      <EmptyState
        title="Profile not found"
        titleAs="h1"
        description="We could not load your profile."
        action={<Button href="/products">Continue shopping</Button>}
      />
    );
  }

  const addressLine = composeAddress(state.address);
  const deleteMatches = deleteName.trim() === (user.username || "");

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Profile</h1>

      <Card className="mt-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-primary-subdued text-lg font-bold text-primary"
          >
            {initialOf(user.username)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-text">{user.username}</p>
            <p className="truncate text-sm text-text-subdued">{user.email}</p>
            {user.phone && <p className="text-sm text-text-subdued">{user.phone}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={user.userType === "Admin" ? "info" : "subdued"}>
                {user.userType || "Buyer"}
              </Badge>
              <Badge variant={user.isEmailVerified ? "success" : "warning"}>
                {user.isEmailVerified ? "Email verified" : "Email not verified"}
              </Badge>
            </div>
          </div>
        </div>
        {user.createdAt && (
          <p className="mt-4 text-xs text-text-subdued">
            Member since {formatDate(user.createdAt)}
          </p>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <h2 className="text-base font-semibold text-text">Default address</h2>
        </CardHeader>
        {addressLine ? (
          <p className="text-sm text-text">{addressLine}</p>
        ) : (
          <p className="text-sm text-text-subdued">No default address on file.</p>
        )}
        <div className="mt-3">
          <Button variant="plain" href="/account/addresses">
            Manage addresses
          </Button>
        </div>
      </Card>

      {!editing ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => startEdit(user)}>
            Edit profile
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setDeleteName("");
              setDeleteOpen(true);
            }}
          >
            Delete account
          </Button>
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-base font-semibold text-text">Edit profile</h2>
          </CardHeader>
          <form onSubmit={(e) => saveProfile(e, user)} noValidate>
            {/* Q13: edit form whitelisted to username/phone/age; only changed values are sent. */}
            <div className="space-y-3">
              <Input
                label="Username"
                id="profile-username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
              <Input
                label="Phone"
                id="profile-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                label="Age"
                id="profile-age"
                type="number"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
            </div>
            <p className="mt-3 text-xs text-text-subdued">
              To change email or password, use the{" "}
              <Link href="/forgot-password" className="text-primary hover:underline">
                password reset flow
              </Link>
              .
            </p>
            {formError && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {formError}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                type="submit"
                loading={saving}
                disabled={Object.keys(changedFields(user)).length === 0}
              >
                Save changes
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Irreversible delete: type-to-confirm (username) over plain
          Yes/Cancel. Destructive styling comes from the modal's
          `footerVariant="destructive"` (default-variant footer Button). */}
      <Modal
        open={deleteOpen}
        onClose={() => (deleting ? undefined : setDeleteOpen(false))}
        title="Delete account?"
        description="This permanently deletes your account and cannot be undone. Type your username to confirm."
        footerVariant="destructive"
        initialFocusRef={deleteNameRef}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmDelete()}
              loading={deleting}
              disabled={!deleteMatches}
            >
              Delete my account
            </Button>
          </>
        }
      >
        <Input
          label="Username"
          id="delete-confirm-name"
          ref={deleteNameRef}
          value={deleteName}
          onChange={(e) => setDeleteName(e.target.value)}
          placeholder={user.username}
          disabled={deleting}
        />
      </Modal>
    </div>
  );
}
