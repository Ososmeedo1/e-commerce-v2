"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";

// Multi-image picker for product create (up to 10 files). Native inputs +
// object-URL grid — zero dependencies. Edit mode doesn't use this (backend
// images are immutable after create).
export default function MultiImagePicker({
  files = [], // File[] (controlled)
  onChange, // (File[]) => void
  label = "Images",
  required = false,
  maxFiles = 10, // mirrors backend multer .array("images", 10)
  maxMB = 5, // mirrors backend multer limit (5 MB per image)
  error = "", // string (page-level message, e.g. "Add at least one image")
  disabled = false,
}) {
  const [previews, setPreviews] = useState([]); // [{ file, url }]
  const [localError, setLocalError] = useState("");
  const inputRef = useRef(null);
  const urlsRef = useRef([]);

  // Unmount-only cleanup for live object URLs (no setState inside).
  useEffect(
    () => () => {
      for (const u of urlsRef.current) URL.revokeObjectURL(u);
    },
    []
  );

  const syncPreviews = (nextFiles) => {
    for (const u of urlsRef.current) URL.revokeObjectURL(u);
    urlsRef.current = [];
    const next = nextFiles.map((file) => {
      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);
      return { file, url };
    });
    setPreviews(next);
  };

  const pick = (e) => {
    const chosen = Array.from(e.target.files ?? []);
    setLocalError("");
    if (inputRef.current) inputRef.current.value = "";
    if (chosen.length === 0) return;
    const bad = chosen.find((f) => !f.type.startsWith("image/"));
    if (bad) {
      setLocalError(`"${bad.name}" is not an image file.`);
      return;
    }
    const big = chosen.find((f) => f.size > maxMB * 1024 * 1024);
    if (big) {
      setLocalError(`"${big.name}" exceeds ${maxMB} MB.`);
      return;
    }
    if (files.length + chosen.length > maxFiles) {
      setLocalError(`At most ${maxFiles} images.`);
      return;
    }
    const next = [...files, ...chosen];
    syncPreviews(next);
    onChange(next);
  };

  const remove = (index) => {
    const next = files.filter((_, i) => i !== index);
    syncPreviews(next);
    onChange(next);
    setLocalError("");
  };

  const shown = localError || error;

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-text">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger"> *</span>
        )}
        <span className="ml-2 font-normal text-text-subdued">
          {files.length}/{maxFiles}
        </span>
      </span>
      {previews.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((p, i) => (
            <li
              key={`${p.file.name}-${p.file.size}-${i}`}
              className="relative overflow-hidden rounded-md border border-border"
            >
              {/* Object URL — next/image cannot optimize blob: URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Selected image ${i + 1}`}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white hover:bg-black/80"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < maxFiles && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="mt-2"
        >
          + Add images
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={pick}
        disabled={disabled}
        aria-label={label}
        className="hidden"
      />
      {shown && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {shown}
        </p>
      )}
    </div>
  );
}
