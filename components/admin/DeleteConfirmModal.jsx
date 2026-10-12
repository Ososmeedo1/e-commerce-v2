import Button from "../ui/Button";
import Modal from "../ui/Modal";

/**
 * Generic destructive-confirm dialog (products now, other entities later).
 * While `pending`, confirm spins and the dialog cannot be dismissed.
 */
export default function DeleteConfirmModal({
  open,
  onClose,
  title,
  itemName,
  note = "", // optional extra copy (e.g. cascade semantics)
  pending = false,
  onConfirm,
  confirmLabel = "Delete",
}) {
  return (
    <Modal
      open={open}
      onClose={() => (pending ? undefined : onClose())}
      title={title}
      description="This cannot be undone."
      footerVariant="destructive"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {itemName && (
        <p className="text-sm text-text">
          <span className="font-semibold">{itemName}</span>
        </p>
      )}
      {note && <p className="mt-2 text-sm text-text-subdued">{note}</p>}
    </Modal>
  );
}
