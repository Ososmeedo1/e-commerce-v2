"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export default function Drawer({ open, onClose, title = "Menu", children, mobileOnly = true }) {
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Portal guard: SSR renders nothing (no hydration mismatch) — the
    // Drawer is interactive client-side only.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once portal guard (empty deps, no loop)
    setMounted(true);
  }, []);
  useFocusTrap(panelRef, { active: open, onClose });

  if (!open || !mounted || typeof document === "undefined") return null;

  // Portal'd to document.body: the sticky header ancestor (sticky + z-40 +
  // backdrop-blur) is a containing block for fixed descendants, which
  // trapped the old inline overlay inside the header box (drawer behind page,
  // no full-screen backdrop). At body level, fixed positioning is viewport-
  // relative again. Backdrop z-40 sits above the z-40 header by DOM order;
  // panel z-50 sits above both.
  return createPortal(
    <div className={mobileOnly ? "md:hidden" : ""}>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="drawer-enter fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-lg"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
