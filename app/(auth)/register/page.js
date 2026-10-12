"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { safeNext } from "@/lib/auth";
import { serverFormError } from "@/lib/format";
import { ageError, DEFAULT_USER_TYPE, passwordError, phoneError, USER_TYPES, userTypeError } from "@/lib/validation";
import { ADMIN_ROLE } from "@/lib/config";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

const EMPTY = {
  username: "",
  email: "",
  password: "",
  age: "",
  phone: "",
  gender: "",
  userType: DEFAULT_USER_TYPE,
  country: "",
  city: "",
  postalCode: "",
  buildingNumber: "",
  floorNumber: "",
  addressLabel: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RegisterInner() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/");

  const [values, setValues] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (auth.status !== "user") return;
    router.replace(auth.user?.userType === ADMIN_ROLE ? "/admin" : next);
  }, [auth.status, auth.user, next, router]);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setFormError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    // Minimal client validation (conservative — backend rules unknown, Q12).
    const required = [
      "username",
      "email",
      "password",
      "age",
      "phone",
      "gender",
      "userType",
      "country",
      "city",
      "postalCode",
      "buildingNumber",
      "floorNumber",
    ];
    for (const key of required) {
      if (!String(values[key]).trim()) {
        setFormError("Fill in all required fields.");
        return;
      }
    }
    if (!EMAIL_RE.test(values.email.trim())) {
      setFormError("Enter a valid email address.");
      return;
    }
    // Backend rules confirmed live (docs/API_REFERENCE.md §6 Q12): username min 5,
    // password policy centralized in lib/validation.js (min 8 + upper +
    // lower + digit + special @!%*?&#).
    if (values.username.trim().length < 5) {
      setFormError("Username must be at least 5 characters.");
      return;
    }
    const pwError = passwordError(values.password);
    if (pwError) {
      setFormError(pwError);
      return;
    }
    // TODO Q12: confirm age minimum / numeric rules.
    const ageErr = ageError(values.age);
    if (ageErr) {
      setFormError(ageErr);
      return;
    }
    const phoneErr = phoneError(values.phone);
    if (phoneErr) {
      setFormError(phoneErr);
      return;
    }
    // Backend Joi: Joi.string().valid('Buyer', 'Admin').required().
    const typeErr = userTypeError(values.userType);
    if (typeErr) {
      setFormError(typeErr);
      return;
    }
    const age = Number(values.age);
    setPending(true);
    try {
      const done = await auth.register({
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
        age,
        phone: values.phone.trim(),
        // Backend enum is { Buyer, Admin } only (Utils/enum.utils.js). Both are
        // exposed here to demonstrate the full register contract. Note: the
        // backend currently does NOT gate Admin on the public register route —
        // see README "Known open items". For a production storefront this field
        // would need to be restricted server-side; for this portfolio build the
        // full enum is intentional.
        userType: values.userType,
        gender: values.gender,
        country: values.country.trim(),
        city: values.city.trim(),
        // Backend requires postalCode as a STRING (number → 400
        // "postal code must be a string"). Send the trimmed input as-is.
        postalCode: values.postalCode.trim(),
        buildingNumber: values.buildingNumber.trim(),
        floorNumber: Number(values.floorNumber),
        addressLabel: values.addressLabel.trim() || "home",
      });
      if (done.needsLogin) {
        router.replace(
          `/login?next=${encodeURIComponent(next)}&registered=1`
        );
      } else if (done?.user?.userType === ADMIN_ROLE) {
        toast.success("Account created");
        router.replace("/admin");
      } else {
        toast.success("Account created");
        router.replace(next);
      }
    } catch (err) {
      // Backend 4xx messages (e.g. "Email already exists", field details)
      // are user-facing — surface them, not the generic fallback.
      setFormError(serverFormError(err, "Registration failed. Try again."));
    } finally {
      setPending(false);
    }
  };

  if (auth.status === "loading") {
    return (
      <Container className="mx-auto max-w-md py-12">
        <Skeleton className="h-7 w-40" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Container>
    );
  }

  const selectCls =
    "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-text-disabled";

  return (
    <Container className="mx-auto max-w-md py-12">
      <Card padded>
        <h1 className="text-xl font-bold text-text">Create account</h1>
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <Input label="Username" id="reg-username" value={values.username} onChange={set("username")} required />
          <Input label="Email" id="reg-email" type="email" autoComplete="email" value={values.email} onChange={set("email")} required />
          <Input label="Password" id="reg-password" type="password" autoComplete="new-password" value={values.password} onChange={set("password")} helper="At least 8 characters." required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Age" id="reg-age" type="number" min="1" value={values.age} onChange={set("age")} required />
            <Input label="Phone" id="reg-phone" type="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} required />
          </div>
          {/* gender values confirmed live: exactly "male" / "female". */}
          <div>
            <label htmlFor="reg-gender" className="mb-1 block text-sm font-medium text-text">
              Gender <span aria-hidden="true" className="text-danger"> *</span>
            </label>
            <select id="reg-gender" value={values.gender} onChange={set("gender")} required className={selectCls}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          {/* userType mirrors the backend enum (Utils/enum.utils.js): Buyer / Admin. */}
          <div>
            <span id="reg-usertype-label" className="mb-1 block text-sm font-medium text-text">
              Account type <span aria-hidden="true" className="text-danger"> *</span>
            </span>
            <div role="radiogroup" aria-labelledby="reg-usertype-label" className="flex gap-3">
              {USER_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <input
                    type="radio"
                    name="userType"
                    value={t}
                    checked={values.userType === t}
                    onChange={set("userType")}
                    required
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country" id="reg-country" value={values.country} onChange={set("country")} required />
            <Input label="City" id="reg-city" value={values.city} onChange={set("city")} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Postal code" id="reg-postal" inputMode="numeric" value={values.postalCode} onChange={set("postalCode")} required />
            <Input label="Building" id="reg-building" value={values.buildingNumber} onChange={set("buildingNumber")} required />
            <Input label="Floor" id="reg-floor" inputMode="numeric" value={values.floorNumber} onChange={set("floorNumber")} required />
          </div>
          <Input label="Address label" id="reg-label" value={values.addressLabel} onChange={set("addressLabel")} helper="Optional — defaults to “home”." />
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
          <Button variant="primary" fullWidth loading={pending} type="submit">
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-text-subdued">
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </Card>
    </Container>
  );
}

export default function RegisterPage() {
  // useSearchParams requires a Suspense boundary for static prerender.
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  );
}
