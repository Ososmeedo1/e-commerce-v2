"use client";

import { Children, cloneElement, isValidElement, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

// Destructive footer (Phase 8): when `footerVariant="destructive"`, any
// footer child that looks like a Button WITHOUT an explicit `variant` prop
// (i.e. the default primary) is cloned with `variant="destructive"`.
// Fragments are traversed so `<>{...}</>` footers work. Children with an
// explicit variant (e.g. `secondary` Cancel) are left untouched, and callers
// that omit `footerVariant` render EXACTLY as before.
function applyDestructiveVariant(node) {
  if (Array.isArray(node)) return node.map(applyDestructiveVariant);
  if (!isValidElement(node)) return node;
  // Fragment (including <>...</>): recurse into its children.
  if (typeof node.type === "symbol") {
    return cloneElement(node, {
      children: applyDestructiveVariant(
        Children.toArray(node.props.children)
      ),
    });
  }
  // Function/class components only (Button); DOM nodes have no `variant`.
  if (typeof node.type === "function" && node.props.variant === undefined) {
    return cloneElement(node, { variant: "destructive" });
  }
  return node;
}

export default function Modal({
  open,
  onClose,
  title,
  description = "",
  children,
  footer = null,
  footerVariant = "default",
  size = "md",
  closeOnBackdrop = true,
  // Optional ref to the element that should receive initial focus instead
  // of the first focusable (the close button). Form modals pass their first
  // field so Space types instead of activating the close button.
  initialFocusRef = null,
}) {
  const panelRef = useRef(null);
  useFocusTrap(panelRef, { active: open, onClose, initialFocusRef });
  const titleId = useId();
  const footerNodes =
    footerVariant === "destructive" ? applyDestructiveVariant(footer) : footer;

  // Portal only exists client-side while open: server + hydration render null.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={closeOnBackdrop ? onClose : undefined}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-enter relative w-full rounded-lg border border-border bg-surface shadow-lg ${
          SIZES[size] || SIZES.md
        }`}
      >
        <div className="flex items-start justify-between gap-4 p-4 pb-0 sm:p-6 sm:pb-0">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-text-subdued">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-subdued hover:bg-surface-subdued hover:text-text"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
        {footer && (
          <div
            data-footer-variant={footerVariant}
            className="flex justify-end gap-2 border-t border-border p-4 sm:px-6"
          >
            {footerNodes}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
