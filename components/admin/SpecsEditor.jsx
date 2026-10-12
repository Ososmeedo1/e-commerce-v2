"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

// Key/value spec rows for the admin product form. Rows carry local ids;
// the page serializes via specsToObject() and parses via specsToRows().
export function specsToObject(rows) {
  return Object.fromEntries(
    rows
      .map((r) => [String(r.key ?? "").trim(), r.value])
      .filter(([k]) => k !== "")
  );
}

/** Defensive parse: backend stores an object, but tolerate a JSON string. */
export function specsToRows(specs) {
  let obj = specs;
  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj);
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.entries(obj).map(([key, value], i) => ({
    id: `spec-${i}`,
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

/** Page-level validation: non-empty + unique keys, ≥1 row. "" = valid. */
export function specsError(rows) {
  if (!rows || rows.length === 0) return "Add at least one spec.";
  const keys = rows.map((r) => String(r.key ?? "").trim());
  if (keys.some((k) => k === "")) return "Spec names cannot be empty.";
  if (new Set(keys).size !== keys.length) {
    return "Spec names must be unique.";
  }
  return "";
}

let nextId = 0;

export default function SpecsEditor({
  rows, // [{ id, key, value }] (controlled)
  onChange, // (rows) => void
  error = "", // string (duplicate/empty-key message from the page)
  disabled = false,
}) {
  const setRow = (id, patch) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    nextId += 1;
    onChange([...rows, { id: `spec-new-${nextId}`, key: "", value: "" }]);
  };

  const removeRow = (id) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-text">
        Specs <span aria-hidden="true" className="text-danger"> *</span>
      </span>
      {rows.length === 0 && (
        <p className="text-sm text-text-subdued">
          No specs yet — add at least one row.
        </p>
      )}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                label=""
                aria-label="Spec name"
                placeholder="Name (e.g. Weight)"
                value={r.key}
                onChange={(e) => setRow(r.id, { key: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="flex-1">
              <Input
                label=""
                aria-label="Spec value"
                placeholder="Value (e.g. 500g)"
                value={r.value}
                onChange={(e) => setRow(r.id, { value: e.target.value })}
                disabled={disabled}
              />
            </div>
            <Button
              variant="plain"
              onClick={() => removeRow(r.id)}
              disabled={disabled}
              aria-label={`Remove spec ${r.key || "row"}`}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        onClick={addRow}
        disabled={disabled}
        className="mt-2"
      >
        + Add spec
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
