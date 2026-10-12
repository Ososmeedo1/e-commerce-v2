import Image from "next/image";
import Link from "next/link";

export default function BrandCard({ brand, className = "" }) {
  const logo = brand.logo?.fileUrl || null;
  return (
    <Link
      href={`/products?brandId=${brand._id}`}
      aria-label={`Shop ${brand.name} products`}
      className={[
        "flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-4 shadow-sm hover:bg-surface-subdued",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {logo ? (
        <div className="relative h-16 w-16">
          <Image
            src={logo}
            alt={`${brand.name} logo`}
            fill
            sizes="64px"
            className="rounded-pill object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-pill bg-surface-subdued text-lg font-bold text-text-subdued"
        >
          {brand.name?.charAt(0) || "?"}
        </div>
      )}
      <span className="text-center text-sm font-medium text-text">{brand.name}</span>
    </Link>
  );
}
