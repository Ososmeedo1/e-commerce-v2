// Formatting + error helpers + coupon math. Written fresh against the new
// contract ({message, data?, stack?}). Pure functions stay unit-testable
// (no fetch, no storage access).

export function formatCurrency(value) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US").format(Number(value));
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export function formatPrice(amount) {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

// Consumes Product.price + Product.appliedPrice + Product.appliedDiscount.
// When discount `type` is "Percentage", percent = amount; otherwise derived
// from price vs appliedPrice. hasDiscount is true when appliedPrice < price.
export function formatDiscount(appliedPrice, price, appliedDiscount) {
  const p = Number(price);
  const ap = appliedPrice === null || appliedPrice === undefined ? p : Number(appliedPrice);
  const hasDiscount = Number.isFinite(p) && Number.isFinite(ap) && ap < p;
  let percent = 0;
  if (hasDiscount) {
    if (
      appliedDiscount &&
      appliedDiscount.type === "Percentage" &&
      Number(appliedDiscount.amount) > 0
    ) {
      percent = Math.round(Number(appliedDiscount.amount));
    } else if (p > 0) {
      percent = Math.round(((p - ap) / p) * 100);
    }
  }
  return { hasDiscount, original: p, discounted: ap, percent };
}

// --- User-safe error text -----------------------------------------------
// Caught errors surface via toast or inline form errors — backend messages
// are usually readable, but empty or runtime-technical text must never
// reach the user.
const TECHNICAL_ERROR_PATTERN =
  /TypeError|ReferenceError|SyntaxError|undefined|Cannot read propert|null is not an object|MongoError|failed to fetch|fetch failed|NetworkError|ApiError|status \d{3}|<!doctype|<html|NEXT_PUBLIC_/i;

export function friendlyError(err, fallback = "Something went wrong") {
  const raw =
    (err && typeof err === "object" && (err.message || err.data?.message)) ||
    (typeof err === "string" ? err : "");
  const message = String(raw || "").trim();
  if (!message) return fallback;
  if (TECHNICAL_ERROR_PATTERN.test(message)) return fallback;
  return message;
}

// --- Validation errors (new shape: {message, stack?}) --------------------
// `stack` may hold Joi-style detail items ({message, path}). Pure helpers
// below so form code + future unit tests share one parser.

const VALIDATION_STATUS = new Set([400, 409, 422]);

/** Flatten a Joi-style `stack` payload into [{path,message}] (pure). */
export function extractJoiDetails(stack) {
  if (typeof stack === "string") {
    const message = stack.trim();
    return message ? [{ path: "", message }] : [];
  }
  const flat = Array.isArray(stack) ? stack.flat(Infinity) : [];
  const out = [];
  for (const item of flat) {
    if (item && typeof item === "object" && typeof item.message === "string") {
      const path = Array.isArray(item.path)
        ? item.path.join(".")
        : typeof item.path === "string"
          ? item.path
          : "";
      out.push({ path, message: String(item.message).trim() });
    } else if (typeof item === "string" && item.trim()) {
      out.push({ path: "", message: item.trim() });
    }
  }
  return out;
}

/**
 * Map Joi details to per-field errors: {fieldName: message} (pure).
 * Unpathed details collapse under the "" key for the form-level banner.
 */
export function fieldErrorsFromStack(stack) {
  const fields = {};
  for (const { path, message } of extractJoiDetails(stack)) {
    if (!message || TECHNICAL_ERROR_PATTERN.test(message)) continue;
    const key = path && !path.includes(".") ? path : "";
    if (key && !fields[key]) fields[key] = message;
    else if (!key && !fields[""]) fields[""] = message;
  }
  return fields;
}

/**
 * Form-level message for a failed mutation. Validation statuses surface
 * the backend message (or first Joi detail); anything else falls back
 * to friendlyError(). For per-field mapping use fieldErrorsFromStack().
 */
export function serverFormError(err, fallback = "Something went wrong") {
  const status = err && typeof err === "object" ? err.status : null;
  if (!VALIDATION_STATUS.has(status)) return friendlyError(err, fallback);
  const details = extractJoiDetails(err?.data?.stack);
  const first = details.find((d) => d.message && !TECHNICAL_ERROR_PATTERN.test(d.message));
  if (first) return first.message;
  const raw = err?.data?.message || err?.message || "";
  const message = String(raw || "").trim();
  if (!message || TECHNICAL_ERROR_PATTERN.test(message)) {
    return friendlyError(err, fallback);
  }
  return message;
}

// --- Coupons (real schema: {couponCode,couponAmount,couponType,from,till,Users,isEnabled}) ---

/** Case-insensitive trim match on couponCode (pure). */
export function findCouponByCode(coupons, code) {
  const want = String(code || "").trim().toLowerCase();
  if (!want) return null;
  const items = Array.isArray(coupons) ? coupons : [];
  return (
    items.find(
      (c) => String(c?.couponCode || "").trim().toLowerCase() === want
    ) || null
  );
}

/**
 * Usability check against window + per-user limits (pure).
 * Returns {ok:true} or {ok:false, reason}. Never blocks checkout —
 * callers show `reason` inline and proceed without the coupon.
 */
export function couponUsability(coupon, { userId = null, now = new Date() } = {}) {
  if (!coupon || typeof coupon !== "object") {
    return { ok: false, reason: "Coupon not found." };
  }
  if (coupon.isEnabled === false) {
    return { ok: false, reason: "This coupon is disabled." };
  }
  const t = now instanceof Date ? now.getTime() : Number(now);
  if (coupon.from && t < new Date(coupon.from).getTime()) {
    return { ok: false, reason: "This coupon is not active yet." };
  }
  if (coupon.till && t > new Date(coupon.till).getTime()) {
    return { ok: false, reason: "This coupon has expired." };
  }
  if (userId && Array.isArray(coupon.Users)) {
    const entry = coupon.Users.find(
      (u) => String(u?.userId) === String(userId) || String(u?.userId?._id) === String(userId)
    );
    if (entry && Number(entry.maxCount) > 0 && Number(entry.usageCount) >= Number(entry.maxCount)) {
      return { ok: false, reason: "You have used this coupon the maximum times." };
    }
  }
  return { ok: true };
}

/** Discount value for a subtotal (pure). Fixed → amount; Percentage → subtotal * amount / 100. */
export function couponDiscountFor(subtotal, coupon) {
  const base = Number(subtotal) || 0;
  const amount = Number(coupon?.couponAmount) || 0;
  if (base <= 0 || amount <= 0) return 0;
  if (coupon?.couponType === "Percentage") {
    return Math.min(base, (base * amount) / 100);
  }
  return Math.min(base, amount);
}
