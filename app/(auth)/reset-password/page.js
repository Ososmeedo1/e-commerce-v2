"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { apiFetch } from "@/lib/api";
import { OTP_TOKEN_KEY, RESET_TOKEN_KEY } from "@/lib/auth";
import { resetPassword } from "@/lib/endpoints";
import { serverFormError } from "@/lib/format";
import { passwordError } from "@/lib/validation";
import { useSessionValue } from "@/hooks/useSessionValue";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function ResetInner() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const resetToken = useSessionValue(RESET_TOKEN_KEY);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (auth.status === "user") router.replace("/");
  }, [auth.status, router]);

  // Step 2 must complete first — without its token, restart the flow.
  useEffect(() => {
    if (resetToken === null) router.replace("/forgot-password");
  }, [resetToken, router]);

  const submit = async (e) => {
    e.preventDefault();
    // Password policy shared with register (lib/validation.js, Q12).
    const pwError = passwordError(password);
    if (pwError) {
      setFormError(pwError);
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await apiFetch(resetPassword(), {
        method: "POST",
        body: { newPassword: password, resetToken },
      });
      window.sessionStorage.removeItem(OTP_TOKEN_KEY);
      window.sessionStorage.removeItem(RESET_TOKEN_KEY);
      toast.success("Password reset — please sign in");
      router.replace("/login?reset=1");
    } catch (err) {
      // TODO Q15: confirm backend error shape for expired reset tokens.
      setFormError(serverFormError(err, "Could not reset the password. Try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Container className="mx-auto max-w-md py-12">
      <Card padded>
        <h1 className="text-xl font-bold text-text">Set new password</h1>
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <Input
            label="New password"
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helper="At least 8 characters."
            required
          />
          <Input
            label="Confirm password"
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
          <Button variant="primary" fullWidth loading={pending} type="submit">
            Reset password
          </Button>
        </form>
      </Card>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
