"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { safeNext } from "@/lib/auth";
import { ADMIN_ROLE } from "@/lib/config";
import { ApiError } from "@/lib/api";
import { serverFormError } from "@/lib/format";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

function LoginInner() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const next = safeNext(rawNext, "/");
  const justRegistered = searchParams.get("registered") === "1";
  const justReset = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  // Logged-in visitors don't need the form (docs/AUTH_FLOW.md §3).
  // Admins always land on the dashboard, even with ?next= (no buyer cart).
  useEffect(() => {
    if (auth.status !== "user") return;
    router.replace(auth.user?.userType === ADMIN_ROLE ? "/admin" : next);
  }, [auth.status, auth.user, next, router]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!email.trim() || !password) {
      setFormError("Enter your email and password.");
      return;
    }
    setPending(true);
    try {
      const done = await auth.login(email.trim(), password);
      toast.success("Welcome back");
      router.replace(done?.user?.userType === ADMIN_ROLE ? "/admin" : next);
    } catch (err) {
      // TODO Q15: confirm backend error shape/status for bad credentials.
      // Observed live: 400 {"message":"Invalid Credentials"} (not 401).
      setFormError(
        err instanceof ApiError && (err.status === 401 || err.status === 400)
          ? "Invalid email or password."
          : serverFormError(err, "Login failed. Try again.")
      );
    } finally {
      setPending(false);
    }
  };

  if (auth.status === "loading") {
    return (
      <Container className="mx-auto max-w-md py-12">
        <Skeleton className="h-7 w-32" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="mx-auto max-w-md py-12">
      <Card padded>
        <h1 className="text-xl font-bold text-text">Log in</h1>
        {justRegistered && (
          <p role="status" className="mt-3 rounded-md bg-success-bg px-3 py-2 text-sm text-success">
            Account created — please sign in.
          </p>
        )}
        {justReset && (
          <p role="status" className="mt-3 rounded-md bg-success-bg px-3 py-2 text-sm text-success">
            Password reset — please sign in.
          </p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <Input
            label="Email"
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
          <Button variant="primary" fullWidth loading={pending} type="submit">
            Log in
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="font-medium text-primary hover:underline"
          >
            Create account
          </Link>
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
      </Card>
    </Container>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary for static prerender.
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
