"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { apiFetch } from "@/lib/api";
import { OTP_TOKEN_KEY, RESET_TOKEN_KEY } from "@/lib/auth";
import { verifyOtp } from "@/lib/endpoints";
import { serverFormError } from "@/lib/format";
import { useSessionValue } from "@/hooks/useSessionValue";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function VerifyInner() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const otpToken = useSessionValue(OTP_TOKEN_KEY);

  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (auth.status === "user") router.replace("/");
  }, [auth.status, router]);

  // Step 1 must complete first — without its token, restart the flow.
  useEffect(() => {
    if (otpToken === null) router.replace("/forgot-password");
  }, [otpToken, router]);

  const submit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setFormError("Enter the code from your email.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const res = await apiFetch(verifyOtp(), {
        method: "POST",
        body: { otp: otp.trim(), otpToken },
      });
      if (res && typeof res.data === "string") {
        window.sessionStorage.setItem(RESET_TOKEN_KEY, res.data);
      }
      toast.success("Code verified");
      router.push("/reset-password");
    } catch (err) {
      // TODO Q15: confirm backend error shape for wrong/expired OTP.
      setFormError(serverFormError(err, "Invalid code. Try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Container className="mx-auto max-w-md py-12">
      <Card padded>
        <h1 className="text-xl font-bold text-text">Verify code</h1>
        <p className="mt-1 text-sm text-text-subdued">
          Enter the verification code we sent to your email.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <Input
            label="Verification code"
            id="verify-otp"
            inputMode="text"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
          <Button variant="primary" fullWidth loading={pending} type="submit">
            Verify
          </Button>
        </form>
      </Card>
    </Container>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
