"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthGateModal from "./AuthGateModal";
import Button from "../ui/Button";

const AuthGateContext = createContext({
  // requireAuth(next, actionLabel) → true if already authed (proceed),
  // false otherwise (modal opens for guests; no-op while loading).
  requireAuth: () => false,
});

// Global provider — mounted once in app/layout.js so any component can gate
// an action via useAuthGate().requireAuth(...) (Phase 4+ click handlers).
export function AuthGateProvider({ children }) {
  const auth = useAuth();
  const [request, setRequest] = useState(null);

  const requireAuth = useCallback(
    (next, actionLabel = "continue") => {
      if (auth.status === "user") return true;
      if (auth.status === "guest") setRequest({ next, actionLabel });
      return false;
    },
    [auth.status]
  );

  const api = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <AuthGateContext.Provider value={api}>
      {children}
      <AuthGateModal
        open={request !== null}
        onClose={() => setRequest(null)}
        actionLabel={(request && request.actionLabel) || "continue"}
        next={(request && request.next) || "/"}
      />
    </AuthGateContext.Provider>
  );
}

export function useAuthGateContext() {
  return useContext(AuthGateContext);
}

// Declarative wrapper (Phase 4 product cards use this):
// user → children; loading → fallback (or nothing); guest → fallback trigger
// (component or render callback receiving { open }) that opens the modal.
export default function AuthGate({
  children,
  action = "continue",
  next = "/",
  fallback = null,
  mode = "auto",
}) {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  void mode; // Reserved: 'auto' (modal) vs future inline variants.

  if (status === "user") return <>{children}</>;
  if (status === "loading") return <>{fallback && typeof fallback !== "function" ? fallback : null}</>;

  const openGate = () => setOpen(true);
  const trigger =
    typeof fallback === "function" ? (
      fallback({ open: openGate })
    ) : (
      fallback || <Button variant="primary" onClick={openGate}>Sign in</Button>
    );

  return (
    <>
      {trigger}
      <AuthGateModal
        open={open}
        onClose={() => setOpen(false)}
        actionLabel={action}
        next={next}
      />
    </>
  );
}
