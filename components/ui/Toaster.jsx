"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Toast from "./Toast";

const ToastContext = createContext({
  toasts: [],
  notify: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
});

let nextId = 0;
const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type, message, opts = {}) => {
      const id = `toast-${nextId}`;
      nextId += 1;
      const duration = opts.duration ?? DEFAULT_DURATION;
      setToasts((prev) => [
        ...prev,
        { id, type, message, actionLabel: opts.actionLabel, onAction: opts.onAction },
      ]);
      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration));
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toasts,
      notify,
      success: (message, opts) => notify("success", message, opts),
      error: (message, opts) => notify("error", message, opts),
      info: (message, opts) => notify("info", message, opts),
      dismiss,
    }),
    [toasts, notify, dismiss]
  );

  // Clear pending timers on unmount (no state writes — lint-clean).
  useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    },
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Live region always rendered (empty when idle) so SSR/hydration match. */}
      <div aria-live="polite" className="sr-only" />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// Portal-mounted stack. Mount inside <ToastProvider>, last in the tree,
// so notifications paint above page content. Bottom-center full-width on
// <sm, bottom-right on sm+.
export default function Toaster() {
  const { toasts, dismiss } = useToast();
  // Portal only exists client-side and only while toasts are visible,
  // so the server render and first client render are identical (empty).
  if (toasts.length === 0 || typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
      ))}
    </div>,
    document.body
  );
}
