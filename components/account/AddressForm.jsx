"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

// Address add/edit form (docs/API_REFERENCE.md §4.8). Rendered inside a
// <Modal> by the addresses page; owns its fields + validation, calls
// onSubmit(payload) with the EXACT body to send.
//   Add  (mode="add"): full body for POST /addresses/add.
//   Edit (mode="edit"): ONLY changed fields for PUT /addresses/update/:id.
export default function AddressForm({
  mode = "add",
  initial = null,
  pending = false,
  serverError = "",
  onSubmit,
  onCancel,
  // Optional ref to the first field (Country) for Modal initial focus.
  // Passed as `ref` to Input — React 19 forwards it as a prop to <input>.
  initialFocusRef = null,
}) {
  const [fields, setFields] = useState({
    country: initial?.country || "",
    city: initial?.city || "",
    postalCode: initial?.postalCode === undefined || initial?.postalCode === null ? "" : String(initial.postalCode),
    buildingNumber: initial?.buildingNumber || "",
    floorNumber: initial?.floorNumber === undefined || initial?.floorNumber === null ? "" : String(initial.floorNumber),
    addressLabel: initial?.addressLabel || "",
    setAsDefault: Boolean(initial?.isDefault),
  });
  const [formError, setFormError] = useState("");

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    const country = fields.country.trim();
    const city = fields.city.trim();
    const buildingNumber = fields.buildingNumber.trim();
    const addressLabel = fields.addressLabel.trim();
    if (!country || !city || !buildingNumber || !addressLabel) {
      setFormError("Country, city, building number, and label are required.");
      return;
    }
    if (fields.postalCode.trim() === "" || !Number.isFinite(Number(fields.postalCode.trim()))) {
      setFormError("Postal code is required and must be a number.");
      return;
    }
    const floorRaw = fields.floorNumber.trim();
    if (floorRaw !== "" && !Number.isFinite(Number(floorRaw))) {
      setFormError("Floor number must be a number.");
      return;
    }
    const full = {
      country,
      city,
      postalCode: Number(fields.postalCode.trim()),
      buildingNumber,
      addressLabel,
      setAsDefault: fields.setAsDefault,
    };
    if (floorRaw !== "") full.floorNumber = Number(floorRaw);

    if (mode === "add" || !initial) {
      onSubmit(full);
      return;
    }
    // Edit: diff vs original — send only changed fields.
    const body = {};
    if (full.country !== (initial.country || "")) body.country = full.country;
    if (full.city !== (initial.city || "")) body.city = full.city;
    if (full.postalCode !== Number(initial.postalCode)) body.postalCode = full.postalCode;
    if (full.buildingNumber !== (initial.buildingNumber || "")) body.buildingNumber = full.buildingNumber;
    if (full.addressLabel !== (initial.addressLabel || "")) body.addressLabel = full.addressLabel;
    const origFloor = initial.floorNumber === undefined || initial.floorNumber === null ? null : Number(initial.floorNumber);
    const newFloor = full.floorNumber === undefined ? null : full.floorNumber;
    if (newFloor !== origFloor) {
      if (newFloor !== null) body.floorNumber = newFloor;
    }
    if (full.setAsDefault !== Boolean(initial.isDefault)) body.setAsDefault = full.setAsDefault;
    if (Object.keys(body).length === 0) {
      setFormError("No changes to save.");
      return;
    }
    onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-3">
        <Input label="Country" id="addr-country" ref={initialFocusRef} value={fields.country} onChange={set("country")} required />
        <Input label="City" id="addr-city" value={fields.city} onChange={set("city")} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Postal code" id="addr-postal" type="number" value={fields.postalCode} onChange={set("postalCode")} required />
          <Input label="Building number" id="addr-building" value={fields.buildingNumber} onChange={set("buildingNumber")} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Floor number (optional)" id="addr-floor" type="number" value={fields.floorNumber} onChange={set("floorNumber")} />
          <Input label="Label (e.g. Home)" id="addr-label" value={fields.addressLabel} onChange={set("addressLabel")} required />
        </div>
        <label htmlFor="addr-default" className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input
            id="addr-default"
            type="checkbox"
            checked={fields.setAsDefault}
            onChange={set("setAsDefault")}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Set as default address
        </label>
      </div>
      {(formError || serverError) && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {formError || serverError}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          {mode === "add" ? "Add address" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
