"use client";

import { useCallback, useState } from "react";

// Wraps one cart mutation (typically addItem) with a per-product pending
// flag so the triggering button can spin + disable while the promise is in
// flight. Double-clicks while busy are ignored (no second request).
// Each caller owns an instance, so only the clicked surface spins.
export function useCartAction() {
  const [pending, setPending] = useState(null); // productId | null

  const run = useCallback(
    async (productId, fn) => {
      if (pending) return { ok: false, busy: true };
      setPending(productId);
      try {
        return await fn();
      } finally {
        setPending(null);
      }
    },
    [pending]
  );

  const isPending = useCallback((id) => pending === id, [pending]);

  return { pending, isPending, run };
}
