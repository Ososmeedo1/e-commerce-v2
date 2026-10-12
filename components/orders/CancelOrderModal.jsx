"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { cancelOrder } from "@/lib/endpoints";
import { useToast } from "@/hooks/useToast";
import { friendlyError } from "@/lib/format";
import { shortOrderId } from "./orderStatus";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

// Confirm-then-cancel for an order. Cancel is METHOD GET
// (docs/API_REFERENCE.md §4.7) — not PATCH. Calls onCancelled() after a
// successful cancel so the caller can refresh its data.
export default function CancelOrderModal({ order, open, onClose, onCancelled }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    if (!order?._id || pending) return;
    setPending(true);
    try {
      await apiFetch(cancelOrder(order._id), { auth: true });
      toast.success("Order cancelled");
      onClose();
      onCancelled();
    } catch (err) {
      toast.error(friendlyError(err, "Could not cancel order"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => (pending ? undefined : onClose())}
      title="Cancel order?"
      description={`Order #${shortOrderId(order?._id)} will be cancelled. This cannot be undone.`}
      footerVariant="destructive"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Keep order
          </Button>
          <Button onClick={confirm} loading={pending}>
            Yes, cancel order
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-subdued">
        Only orders with status “placed” can be cancelled.
      </p>
    </Modal>
  );
}
