"use client";

import { useEffect, useState } from "react";

/**
 * One async fetch mapped to a { data, error, loading } triple. Each call
 * site owns its state — a failed section can never blank its siblings
 * (no fail-fast Promise.all). `fetcher` must be stable (module-scope or
 * useCallback); extra effect deps go in `deps`.
 */
export function useAsyncData(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, error: err, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetcher stability is the caller's contract; extra deps listed explicitly
  }, deps);
  return state;
}
