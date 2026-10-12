import { formatDiscount, formatPrice } from "@/lib/format";
import Badge from "../ui/Badge";

export default function PriceBlock({ price, appliedPrice, appliedDiscount }) {
  const { hasDiscount, original, discounted, percent } = formatDiscount(
    appliedPrice,
    price,
    appliedDiscount
  );
  if (!hasDiscount) {
    return (
      <p className="text-sm font-semibold text-text">{formatPrice(original)}</p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-text">
        {formatPrice(discounted)}
      </span>
      <span className="text-xs text-text-subdued line-through">
        {formatPrice(original)}
      </span>
      <Badge variant="success">-{percent}%</Badge>
    </p>
  );
}
