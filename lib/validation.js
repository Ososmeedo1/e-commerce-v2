// Central password policy (Q12, live-confirmed against the backend).
// Backend rule: minimum 8 chars + upper + lower + digit + special from
// the set @!%*?&#. Shared by register + reset-password so both enforce
// the same rule; error text is user-facing (no raw backend detail).

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Exact backend rule (user.schema.js register/update): upper + lower +
 * digit + special, charset restricted to [A-Za-z\d@!%*?&#], min 8.
 */
export const PASSWORD_RE =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@!%*?&#])[A-Za-z\d@!%*?&#]{8,}$/;

export const PASSWORD_MESSAGE =
  "Password needs an uppercase letter, a lowercase letter, a digit, and a special character (@!%*?&#).";

/** Returns the user-facing error for `password`, or "" when valid (pure). */
export function passwordError(password) {
  const value = typeof password === "string" ? password : "";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!PASSWORD_RE.test(value)) return PASSWORD_MESSAGE;
  return "";
}

// --- Register/profile rules (mirror user.schema.js, Q12/Q13) -------------
// Backend: age optional 12–100, phone optional Egyptian mobile
// (01 + [0125] + 8 digits). Register keeps both required (ref UX); the
// helpers enforce the backend-accepted shape so 400s never surprise.

export const AGE_MIN = 12;
export const AGE_MAX = 100;

/** Returns the user-facing error for `raw` age input, or "" when valid (pure). */
export function ageError(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "Enter a valid age.";
  const age = Number(text);
  if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
    return `Age must be between ${AGE_MIN} and ${AGE_MAX}.`;
  }
  return "";
}

/** Egyptian mobile: 01 + [0125] + 8 digits (backend phone rule). */
export const PHONE_RE = /^01[0125][0-9]{8}$/;

export const PHONE_MESSAGE =
  "Enter a valid Egyptian mobile number (e.g. 01012345678).";

/** Returns the user-facing error for `phone`, or "" when valid (pure). */
export function phoneError(phone) {
  const value = String(phone ?? "").trim();
  if (!value) return "Enter your phone number.";
  if (!PHONE_RE.test(value)) return PHONE_MESSAGE;
  return "";
}

/**
 * Register userType enum. Mirrors ecommerce-backend/src/Utils/enum.utils.js
 * (`UserType = { Buyer: "Buyer", Admin: "Admin" }`) and the register Joi
 * rule `Joi.string().valid('Buyer', 'Admin').required()`. Single source
 * for the register form options, default, and client validation.
 */
export const USER_TYPES = ["Buyer", "Admin"];

export const DEFAULT_USER_TYPE = "Buyer";

/** Returns the user-facing error for `userType`, or "" when valid (pure). */
export function userTypeError(value) {
  if (!USER_TYPES.includes(value)) {
    return `Account type must be one of: ${USER_TYPES.join(", ")}.`;
  }
  return "";
}

// --- Admin product rules (mirror products.schema.js add/update) -----------
// Backend: title 3–100, overview 10–1000, price ≥50, stock ≥10,
// discountAmount ≥0 (≤100 when PERCENTAGE), specs required on add.
// Pure field-level validators; the pages assemble the error map.
export const PRODUCT_TITLE_MIN = 3;
export const PRODUCT_TITLE_MAX = 100;
export const PRODUCT_OVERVIEW_MIN = 10;
export const PRODUCT_OVERVIEW_MAX = 1000;
export const PRODUCT_PRICE_MIN = 50;
export const PRODUCT_STOCK_MIN = 10;

/** Field errors for the admin product form values, or {} when valid (pure). */
export function productFormErrors(values) {
  const errors = {};
  const title = String(values.title ?? "").trim();
  if (!title) errors.title = "Enter a title.";
  else if (title.length < PRODUCT_TITLE_MIN || title.length > PRODUCT_TITLE_MAX) {
    errors.title = `Title must be ${PRODUCT_TITLE_MIN}–${PRODUCT_TITLE_MAX} characters.`;
  }
  const overview = String(values.overview ?? "").trim();
  if (!overview) errors.overview = "Enter an overview.";
  else if (
    overview.length < PRODUCT_OVERVIEW_MIN ||
    overview.length > PRODUCT_OVERVIEW_MAX
  ) {
    errors.overview = `Overview must be ${PRODUCT_OVERVIEW_MIN}–${PRODUCT_OVERVIEW_MAX} characters.`;
  }
  const price = Number(values.price);
  if (values.price === "" || !Number.isFinite(price) || price < PRODUCT_PRICE_MIN) {
    errors.price = `Price must be at least ${PRODUCT_PRICE_MIN}.`;
  }
  const stock = Number(values.stock);
  if (
    values.stock === "" ||
    !Number.isInteger(stock) ||
    stock < PRODUCT_STOCK_MIN
  ) {
    errors.stock = `Stock must be a whole number of at least ${PRODUCT_STOCK_MIN}.`;
  }
  const amount = Number(values.discountAmount);
  if (values.discountAmount === "" || !Number.isFinite(amount) || amount < 0) {
    errors.discountAmount = "Discount must be 0 or more.";
  } else if (values.discountType === "PERCENTAGE" && amount > 100) {
    errors.discountAmount = "Percentage discount must be between 0 and 100.";
  } else if (
    values.discountType === "FIXED" &&
    Number.isFinite(price) &&
    amount >= price
  ) {
    errors.discountAmount = "Fixed discount must be less than the price.";
  }
  return errors;
}

/** Live discounted-price preview (mirrors backend calculateProductPrice). */
export function previewDiscountedPrice(price, amount, type) {
  const p = Number(price);
  const a = Number(amount);
  if (!Number.isFinite(p) || !Number.isFinite(a) || a <= 0) return null;
  if (type === "PERCENTAGE") return Math.max(0, p - (p * Math.min(a, 100)) / 100);
  return Math.max(0, p - a);
}
