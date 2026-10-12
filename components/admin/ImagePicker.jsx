"use client";

import { useEffect, useRef, useState } from "react";

// Single-image picker for admin entity forms (category/brand/subcategory).
// Native file input + object-URL preview — zero dependencies.
export default function ImagePicker({
  value = null, // File | null (controlled)
  onChange, // (file | null) => void
  label = "Image",
  required = false,
  maxMB = 5, // mirrors backend multer limit (5 MB per image)
  currentUrl = "", // existing image (edit mode) shown until replaced
  disabled = false,
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const urlRef = useRef("");

  // Unmount-only cleanup for the last object URL (no setState inside).
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const setFileUrl = (file) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = file ? URL.createObjectURL(file) : "";
    setPreview(urlRef.current);
  };

  const pick = (e) => {
    const file = e.target.files?.[0] || null;
    setError("");
    if (!file) {
      setFileUrl(null);
      onChange(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      setFileUrl(null);
      onChange(null);
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Image must be under ${maxMB} MB.`);
      setFileUrl(null);
      onChange(null);
      return;
    }
    setFileUrl(file);
    onChange(file);
  };

  const clear = () => {
    onChange(null);
    setFileUrl(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-text">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger"> *</span>
        )}
      </span>
      {preview ? (
        <div className="flex items-center gap-3">
          {/* Local object URL — next/image cannot optimize blob: URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Selected image preview"
            className="h-16 w-16 rounded-md border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm text-text">{value?.name}</p>
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : currentUrl ? (
        <div className="flex items-center gap-3">
          {/* Edit-mode thumbnail from ImageKit (fixed 64px, no optimization needed). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt="Current image"
            className="h-16 w-16 rounded-md border border-border object-cover"
          />
          <p className="text-sm text-text-subdued">
            Keep the current image, or choose a file below to replace it.
          </p>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={pick}
        disabled={disabled}
        aria-label={label}
        className="mt-2 block w-full text-sm text-text file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text hover:file:bg-surface-subdued"
      />
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
