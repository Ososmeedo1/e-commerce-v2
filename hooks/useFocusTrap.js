"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared trap used by Drawer + Modal (extracted from Drawer, Phase 3).
// On activation: remembers the trigger, focuses the first focusable
// (or the container). Tab cycles inside, Esc calls onClose, cleanup
// unlocks scroll and returns focus. No state writes — lint-clean.
export function useFocusTrap(
  containerRef,
  { active, onClose, lockScroll = true, initialFocusRef = null } = {}
) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    previousFocus.current = document.activeElement;
    const container = containerRef.current;
    if (container) {
      // A caller-provided target (e.g. a modal's first form field) wins over
      // the first focusable element (often the close button).
      const preferred = initialFocusRef?.current;
      if (preferred && container.contains(preferred)) {
        preferred.focus();
      } else {
        const items = container.querySelectorAll(FOCUSABLE);
        (items[0] || container).focus();
      }
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const focusables = Array.from(container.querySelectorAll(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    if (lockScroll) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (lockScroll) document.body.style.overflow = "";
      if (previousFocus.current && previousFocus.current.focus) {
        previousFocus.current.focus();
      }
    };
  }, [active, onClose, lockScroll, containerRef, initialFocusRef]);
}
