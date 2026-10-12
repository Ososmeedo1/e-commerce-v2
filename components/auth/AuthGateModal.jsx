"use client";

import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function AuthGateModal({
  open,
  onClose,
  actionLabel = "continue",
  next = "/",
}) {
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sign in to continue"
      description={`You need an account to ${actionLabel}.`}
      size="sm"
    >
      <p className="text-sm text-text-subdued">
        Members get product details, cart, orders, and faster checkout.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="primary" fullWidth href={loginHref}>
          Log in
        </Button>
        <Button variant="secondary" fullWidth href={registerHref}>
          Create account
        </Button>
        <Button variant="plain" onClick={onClose}>
          Keep browsing
        </Button>
      </div>
    </Modal>
  );
}
