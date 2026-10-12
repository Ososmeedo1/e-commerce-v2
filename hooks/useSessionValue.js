"use client";

import { useSyncExternalStore } from "react";

// Reads a sessionStorage key without hydration mismatch or setState-in-effect:
// server snapshot is always null (matches first render), the client snapshot
// reads the live value on mount. Same-tab writes followed by router.push/push
// re-mount and re-read, so no setter/subscription beyond cross-tab `storage`.
export function useSessionValue(key) {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => window.sessionStorage.getItem(key),
    () => null
  );
}
