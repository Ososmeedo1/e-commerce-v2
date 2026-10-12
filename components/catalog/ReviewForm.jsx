"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { addReview } from "@/lib/endpoints";
import { serverFormError } from "@/lib/format";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

function StarButton({ index, active, onPick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${index} star${index === 1 ? "" : "s"}`}
      onClick={() => onPick(index)}
      className="rounded-sm p-1"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={active ? "text-warning" : "text-border"}
        fill="currentColor"
      >
        <path d="M12 2.5 14.9 8.6 21.5 9.5 16.7 14.2 17.8 20.8 12 17.6 6.2 20.8 7.3 14.2 2.5 9.5 9.1 8.6Z" />
      </svg>
    </button>
  );
}

export default function ReviewForm({ open, onClose, productId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  // Initial focus target: the textarea (a typing field), so Space types a
  // space instead of activating the modal's close button.
  const bodyRef = useRef(null);

  const onGroupKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? Math.min(5, (rating || 1) + 1)
        : Math.max(1, (rating || 2) - 1);
    setRating(next);
  };

  const close = () => {
    if (pending) return;
    setFormError("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (rating < 1 || rating > 5) {
      setFormError("Pick a rating from 1 to 5 stars.");
      return;
    }
    if (body.trim().length < 10) {
      setFormError("Tell us a little more (at least 10 characters).");
      return;
    }
    setPending(true);
    try {
      await apiFetch(addReview(), {
        method: "POST",
        body: { productId, reviewRating: rating, reviewBody: body.trim() },
        auth: true,
      });
      // 401/403 never settles here — apiFetch redirects to login first.
      setRating(0);
      setBody("");
      onSubmitted();
    } catch (err) {
      // TODO Q11: confirm backend messages for purchase-gated / duplicate reviews.
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("bought") || msg.includes("purchase")) {
        setFormError("You can only review products you've purchased.");
      } else if (msg.includes("already")) {
        setFormError("You've already reviewed this product.");
      } else {
        setFormError(serverFormError(err, "Could not submit review. Try again."));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Write a review" size="md" initialFocusRef={bodyRef}>
      <form onSubmit={submit} noValidate>
        <span id="review-rating-label" className="mb-1 block text-sm font-medium text-text">
          Your rating <span aria-hidden="true" className="text-danger"> *</span>
        </span>
        <div
          role="radiogroup"
          aria-labelledby="review-rating-label"
          onKeyDown={onGroupKeyDown}
          className="flex items-center gap-0.5"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <StarButton key={i} index={i} active={i <= rating} onPick={setRating} />
          ))}
        </div>
        <div className="mt-3">
          <label htmlFor="review-body" className="mb-1 block text-sm font-medium text-text">
            Your review <span aria-hidden="true" className="text-danger"> *</span>
          </label>
          <textarea
            id="review-body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            placeholder="What did you think of this product?"
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-disabled"
          />
        </div>
        {formError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="plain" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={pending}>
            Submit review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
