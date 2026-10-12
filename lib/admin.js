// ── ADMIN ─────────────────────────────────────────────────────────────
// Reserved for future admin UI. Typed service path builders ONLY —
// no routes, no components, no nav links import from here.
// (Deliver/moderate + admin CRUD from the new API docs.)

// --- Orders ---
/** GET (auth/admin) → 200 {message,data:order(status delivered)} */
export function deliverOrder(id) {
  return `/orders/deliver/${id}`;
}

// --- Reviews ---
/** PATCH (auth/admin) — body: {action:"accepted"|"rejected"} → 200 {message,data:review} */
export function moderateReview(id) {
  return `/reviews/action/${id}`;
}

/**
 * GET (auth/admin) → 200 {message,data:[review]} (populated userId/productId).
 * Caveat: the backend answers 404 {"message":"No Reviews yet"} on an empty
 * collection — callers must treat that 404 as an empty list, not an error.
 */
export function listAllReviews() {
  return "/reviews/";
}

// --- Products (admin, multipartForm for image fields) ---
/** POST — query: {category,subCategory,brand}, multipart → 201 {message,data:product} */
export function adminAddProduct() {
  return "/products/add";
}

/** PUT — multipart partial → 200 {message,data:product} */
export function adminUpdateProduct(id) {
  return `/products/update/${id}`;
}

/** DELETE → 200 {message} */
export function adminDeleteProduct(id) {
  return `/products/${id}`;
}

// --- Categories (admin, multipartForm) ---
/** POST — multipart {name,image} → 201 {message,data:category} */
export function adminAddCategory() {
  return "/categories/add";
}

/** PUT — multipart partial → 200 {message,data:category} */
export function adminUpdateCategory(id) {
  return `/categories/update/${id}`;
}

/** DELETE → 200 {message} */
export function adminDeleteCategory(id) {
  return `/categories/delete/${id}`;
}

// --- Sub-categories (admin, multipartForm) ---
/** POST — query: {categoryId}, multipart {name,image} → 201 {message,data:subcategory} */
export function adminAddSubCategory() {
  return "/subcategories/add";
}

/** PUT — multipart partial → 200 {message,data:subcategory} */
export function adminUpdateSubCategory(id) {
  return `/subcategories/${id}`;
}

/** DELETE (cascades to brands) → 200 {message} */
export function adminDeleteSubCategory(id) {
  return `/subcategories/${id}`;
}

/** GET — query: {id|name|slug} → 200 {message,data:subcategory} */
export function adminGetSubCategory() {
  return "/subcategories/specific";
}

// --- Brands (admin, multipartForm) ---
/** POST — query: {category,subCategory}, multipart {name,logo} → 201 {message,data:brand} */
export function adminAddBrand() {
  return "/brands/add";
}

/** PUT — multipart partial → 200 {message,data:brand} */
export function adminUpdateBrand(id) {
  return `/brands/${id}`;
}

/** DELETE → 200 {message} */
export function adminDeleteBrand(id) {
  return `/brands/${id}`;
}

/** GET — query: {name|id|slug} → 200 {message,data:brand} */
export function adminGetBrand() {
  return "/brands/specific";
}

// --- Coupons (admin) ---
/** POST — body: {couponCode,couponAmount,couponType,from,till,Users,isEnabled} → 201 {message,data:coupon} */
export function adminAddCoupon() {
  return "/coupons/add";
}

/** PUT — body: partial coupon → 200 {message,data:coupon} */
export function adminUpdateCoupon(id) {
  return `/coupons/update/${id}`;
}

// --- Categories single (admin/support) ---
/** GET — query: {id|name|slug} → 200 {message,data:category} */
export function adminGetCategory() {
  return "/categories/specific";
}
