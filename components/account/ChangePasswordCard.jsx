"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { changePassword } from "@/lib/endpoints";
import { serverFormError } from "@/lib/format";
import { passwordError } from "@/lib/validation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import Card, { CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const EMPTY_FORM = { current: "", next: "", confirm: "" };

export default function ChangePasswordCard() {
  const router = useRouter();
  const { logout } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
    if (formError) setFormError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.current) {
      nextErrors.current = "Enter your current password.";
    }
    if (!form.next) {
      nextErrors.next = "Enter a new password.";
    } else {
      const pwError = passwordError(form.next);
      if (pwError) {
        nextErrors.next = pwError;
      } else if (form.next === form.current) {
        nextErrors.next =
          "New password must be different from the current password.";
      }
    }
    if (!form.confirm) {
      nextErrors.confirm = "Confirm your new password.";
    } else if (form.next !== form.confirm) {
      nextErrors.confirm = "Passwords do not match.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (pending) return;
    setFormError("");
    if (!validate()) return;

    setPending(true);
    try {
      await apiFetch(changePassword(), {
        method: "PUT",
        body: {
          currentPassword: form.current,
          newPassword: form.next,
        },
        auth: true,
      });
      setForm(EMPTY_FORM);
      setErrors({});
      // The backend invalidates every JWT issued before the change, including
      // this one. Drop the now-stale local session before returning to login.
      logout();
      toast.success("Password changed. Please log in again.");
      router.replace("/login?passwordChanged=1");
    } catch (err) {
      setFormError(
        serverFormError(err, "Could not change the password. Try again.")
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <h2 className="text-base font-semibold text-text">Change password</h2>
      </CardHeader>
      <p className="text-sm text-text-subdued">
        Enter your current password, then choose a new one. You will be signed
        out after the change.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
        <Input
          label="Current password"
          id="change-current-password"
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={update("current")}
          error={errors.current}
          disabled={pending}
          required
        />
        <Input
          label="New password"
          id="change-new-password"
          type="password"
          autoComplete="new-password"
          value={form.next}
          onChange={update("next")}
          error={errors.next}
          helper="At least 8 characters with uppercase, lowercase, a digit, and a special character."
          disabled={pending}
          required
        />
        <Input
          label="Confirm new password"
          id="change-confirm-password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update("confirm")}
          error={errors.confirm}
          disabled={pending}
          required
        />
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button variant="primary" type="submit" loading={pending} disabled={pending}>
          Change password
        </Button>
      </form>
    </Card>
  );
}
