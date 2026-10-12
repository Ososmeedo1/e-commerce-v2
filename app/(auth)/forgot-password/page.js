"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { apiFetch } from "@/lib/api";
import { OTP_TOKEN_KEY, safeNext } from "@/lib/auth";
import { forgotPassword } from "@/lib/endpoints";
import { serverFormError } from "@/lib/format";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function ForgotInner() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/");

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (auth.status === "user") router.replace(next);
  }, [auth.status, next, router]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError("Enter your email address.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const res = await apiFetch(forgotPassword(), {
        method: "PATCH",
        body: { email: email.trim() },
      });
      if (res && typeof res.data === "string") {
        window.sessionStorage.setItem(OTP_TOKEN_KEY, res.data);
      }
      toast.success("Code sent — check your email");
      router.push("/verify-otp");
    } catch (err) {
      // TODO Q15: confirm backend error shape for unknown emails.
      setFormError(serverFormError(err, "Could not send the code. Try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Container className="mx-auto max-w-md py-12">
      <Card padded>
        <h1 className="text-xl font-bold text-text">Forgot password</h1>
        <p className="mt-1 text-sm text-text-subdued">
          Enter your account email and we will send a verification code.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <Input
            label="Email"
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
          <Button variant="primary" fullWidth loading={pending} type="submit">
            Send code
          </Button>
        </form>
        <p className="mt-4 text-sm text-text-subdued">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to log in
          </Link>
        </p>
      </Card>
    </Container>
  );
}

export default function ForgotPasswordPage() {
  // useSearchParams requires a Suspense boundary for static prerender.
  return (
    <Suspense>
      <ForgotInner />
    </Suspense>
  );
}
