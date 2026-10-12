// Shared order-status presentation (orders list + detail + timeline).
export function orderStatusVariant(orderStatus) {
  if (orderStatus === "delivered") return "success";
  if (orderStatus === "cancelled") return "danger";
  if (orderStatus === "placed") return "warning";
  return "subdued";
}

export function shortOrderId(id) {
  const s = String(id || "");
  return s.length > 8 ? s.slice(-8) : s;
}
