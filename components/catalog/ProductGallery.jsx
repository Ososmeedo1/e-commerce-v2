"use client";

import { useState } from "react";
import Image from "next/image";

function ImageFallback({ label = "No image" }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex aspect-square w-full items-center justify-center bg-surface-subdued"
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-text-disabled" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" />
        <path d="m5 18 5-5 3 3 3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ProductGallery({ images = [], title = "Product" }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return <ImageFallback label={`No image for ${title}`} />;
  const current = images[Math.min(index, images.length - 1)];

  const step = (delta) => {
    setIndex((i) => (i + delta + images.length) % images.length);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  };

  return (
    <div role="group" aria-label={`${title} images`} onKeyDown={onKeyDown}>
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-surface-subdued">
        <Image
          key={current.fileUrl || current.filePath}
          src={current.fileUrl || current.filePath}
          alt={`${title} — image ${index + 1} of ${images.length}`}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto" role="group" aria-label="Choose image">
          {images.map((img, i) => (
            <button
              key={img.fileUrl || img.filePath || i}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              className={[
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border bg-surface-subdued",
                i === index ? "border-primary" : "border-border",
              ].join(" ")}
            >
              <Image
                src={img.fileUrl || img.filePath}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
