"use client";

import Input from "@/components/ui/Input";
import SpecsEditor from "@/components/admin/SpecsEditor";
import { previewDiscountedPrice } from "@/lib/validation";

// Shared field cluster for product create (new page) and product edit
// (in-place on the detail page). Images + catalog triple stay with the
// callers (create-only: multer vs JSON, immutable after create).
export default function ProductFields({
  values, // { title, overview, price, discountAmount, discountType, stock }
  onField, // (key) => (e) => void
  specsRows, // [{ id, key, value }]
  onSpecsChange, // (rows) => void
  errors = {}, // { title?, overview?, price?, discountAmount?, stock?, specs? }
  disabled = false,
}) {
  const preview = previewDiscountedPrice(
    values.price,
    values.discountAmount,
    values.discountType
  );

  const set = (key) => (e) => onField(key)(e);

  return (
    <div className="space-y-3">
      <Input
        label="Title"
        id="product-title"
        value={values.title}
        onChange={set("title")}
        error={errors.title || ""}
        disabled={disabled}
        required
      />
      <div>
        <label
          htmlFor="product-overview"
          className="mb-1 block text-sm font-medium text-text"
        >
          Overview <span aria-hidden="true" className="text-danger"> *</span>
        </label>
        <textarea
          id="product-overview"
          value={values.overview}
          onChange={set("overview")}
          disabled={disabled}
          required
          rows={4}
          className={[
            "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text",
            "placeholder:text-text-disabled",
            "disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-text-disabled",
            errors.overview ? "border-danger" : "border-border-strong",
          ].join(" ")}
        />
        {errors.overview && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {errors.overview}
          </p>
        )}
      </div>
      <SpecsEditor
        rows={specsRows}
        onChange={onSpecsChange}
        error={errors.specs || ""}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Price (min 50)"
          id="product-price"
          type="number"
          min="50"
          value={values.price}
          onChange={set("price")}
          error={errors.price || ""}
          disabled={disabled}
          required
        />
        <Input
          label="Stock (min 10)"
          id="product-stock"
          type="number"
          min="10"
          step="1"
          value={values.stock}
          onChange={set("stock")}
          error={errors.stock || ""}
          disabled={disabled}
          required
        />
      </div>
      <div>
        <span
          id="product-discount-label"
          className="mb-1 block text-sm font-medium text-text"
        >
          Discount type
        </span>
        <div
          role="radiogroup"
          aria-labelledby="product-discount-label"
          className="flex gap-3"
        >
          {["PERCENTAGE", "FIXED"].map((t) => (
            <label
              key={t}
              className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text"
            >
              <input
                type="radio"
                name="discountType"
                value={t}
                checked={values.discountType === t}
                onChange={set("discountType")}
                disabled={disabled}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {t}
            </label>
          ))}
        </div>
      </div>
      <Input
        label={
          values.discountType === "PERCENTAGE"
            ? "Discount % (0–100)"
            : "Discount amount (fixed)"
        }
        id="product-discount"
        type="number"
        min="0"
        value={values.discountAmount}
        onChange={set("discountAmount")}
        error={errors.discountAmount || ""}
        disabled={disabled}
      />
      {preview !== null && (
        <p className="text-sm text-text-subdued" role="status">
          Discounted price preview:{" "}
          <span className="font-semibold text-text">
            {preview.toFixed(2)}
          </span>
        </p>
      )}
    </div>
  );
}
