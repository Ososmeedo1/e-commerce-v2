import Image from "next/image";
import Link from "next/link";

export default function CategoryTile({ category, className = "" }) {
  const img = category.Image?.fileUrl || null;
  return (
    <Link
      href={`/products?categoryId=${category._id}`}
      aria-label={`Shop ${category.name} products`}
      className={[
        "group flex flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {img ? (
        <div className="relative aspect-square w-full bg-surface-subdued">
          <Image
            src={img}
            alt={category.name}
            fill
            sizes="(min-width: 1280px) 16vw, (min-width: 640px) 25vw, 50vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div aria-hidden="true" className="aspect-square w-full bg-surface-subdued" />
      )}
      <span className="p-2 text-center text-sm font-medium text-text group-hover:underline">
        {category.name}
      </span>
    </Link>
  );
}
