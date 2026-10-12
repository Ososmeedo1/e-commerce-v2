"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ImagePicker from "@/components/admin/ImagePicker";

// Shared create/edit modal for simple image entities (category now;
// brand/subcategory in later tiers via parentPickers + nameLimits).
export default function EntityFormModal({
  open, // boolean
  onClose, // () => void
  title, // string
  description = "", // string
  initialName = "", // string (edit pre-fill)
  currentImageUrl = "", // string (edit thumbnail; blank = replace)
  requireImage = true, // create:true (backend 400s without); edit:false
  imageLabel = "Image", // string
  nameMin = 3, // number (category 3–20; tiers override)
  nameMax = 20, // number
  parentPickers = null, // React node (cascading selects, tiers 2–4)
  submitLabel = "Create", // string ("Create" | "Save changes")
  pending = false, // boolean
  serverErrors = {}, // {field: message} from fieldErrorsFromStack
  banner = "", // string (unpathed server error, rendered below the form)
  extra = null, // opaque page-owned data (e.g. parent picks) forwarded to onSubmit
  extraValid = true, // false disables submit (page validates its extra UI)
  onSubmit, // async ({name, file, extra}) => void — caller owns the fetch
}) {
  // Parent remounts per opening via key (create vs edit row), so initial
  // state is always fresh — no reset effect needed.
  const [name, setName] = useState(initialName);
  const [file, setFile] = useState(null);
  const [localErrors, setLocalErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const errors = {};
    const trimmed = name.trim();
    if (!trimmed) errors.name = "Enter a name.";
    else if (trimmed.length < nameMin || trimmed.length > nameMax) {
      errors.name = `Name must be ${nameMin}–${nameMax} characters.`;
    }
    if (requireImage && !file) errors.image = "Choose an image.";
    if (Object.values(errors).some(Boolean)) {
      setLocalErrors(errors);
      return;
    }
    onSubmit({ name: trimmed, file, extra });
  };

  // Server-mapped errors win over local ones once a submit round-trips.
  const nameError = serverErrors.name || localErrors.name;
  const imageError = serverErrors.image || localErrors.image;

  return (
    <Modal
      open={open}
      onClose={() => (pending ? undefined : onClose())}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={!extraValid}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3" noValidate>
        {parentPickers}
        <div>
          <Input
            label="Name"
            id="entity-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setLocalErrors((f) => ({ ...f, name: undefined }));
            }}
            disabled={pending}
            required
          />
          {nameError && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {nameError}
            </p>
          )}
        </div>
        <div>
          <ImagePicker
            label={imageLabel}
            value={file}
            onChange={(f) => {
              setFile(f);
              setLocalErrors((prev) => ({ ...prev, image: undefined }));
            }}
            required={requireImage}
            currentUrl={currentImageUrl}
            disabled={pending}
          />
          {imageError && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {imageError}
            </p>
          )}
        </div>
        {banner && (
          <p role="alert" className="text-sm text-danger">
            {banner}
          </p>
        )}
      </form>
    </Modal>
  );
}
