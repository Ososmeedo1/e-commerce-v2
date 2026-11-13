// Path builders ONLY — consumer (storefront) routes.
// Naming: flat `domainVerbNoun` (e.g. registerUser, getProfile).
// Each returns a path string; HTTP method + auth live with the caller.
// Admin routes live in lib/admin.js (ADMIN block, services only, no UI).

// --- Users / auth ---
/** POST — body: {username,email,password,age,phone,userType,gender,country,city,postalCode,buildingNumber,floorNumber,addressLabel?} → 201 {message,data:{userResponse,newAddress}} */
export function registerUser() {
  return "/users/register";
}

/** POST — body: {email,password} → 200 {message,data:JWT string} */
export function loginUser() {
  return "/users/login";
}

/** GET (auth) → 200 {message,data:{user,address}} */
export function getProfile() {
  return "/users/profile";
}

/** PUT (auth) — body: partial profile fields → 200 {message} */
export function updateAccount() {
  return "/users/update";
}

/** PATCH — body: {email} → 200 {message,data:otpToken} */
export function forgotPassword() {
  return "/users/forgot-password";
}

/** POST — body: {otp,otpToken} → 200 {message,data:resetToken} */
export function verifyOtp() {
  return "/users/verify-otp";
}

/** POST — body: {newPassword,resetToken} → 200 {message} */
export function resetPassword() {
  return "/users/reset-password";
}

/** PUT (auth) — body: {currentPassword,newPassword} → 200 {message} */
export function changePassword() {
  return "/users/change-password";
}

/** DELETE (auth) → 200 {message} */
export function deleteAccount() {
  return "/users/delete";
}

// --- Product detail + reviews ---
/** GET — query used by callers: none → 200 {message,data:product} (populated categoryId/subCategoryId/brandId) */
export function getProductById(id) {
  return `/products/${id}`;
}

/**
 * GET (auth) — all reviews for one product: GET /reviews/list/:productId
 * → 200 {message:"done",data:[review]} with review.userId populated as
 *   {username,email} and review.productId populated as {title}.
 * Empty reviews → 404 {"message":"No Reviews yet"} (callers treat it as empty).
 * No pagination/total: the backend returns the full list.
 */
export function listProductReviews(productId) {
  return `/reviews/list/${encodeURIComponent(productId)}`;
}

// --- Cart / orders / reviews ---
/** POST (auth) — body: {quantity} → 201 {message,data:cart} */
export function addToCart(productId) {
  return `/carts/add/${productId}`;
}

/** GET (auth) → 200 {message,data:{_id,userId,products:[{productId,quantity,price}]}} */
export function getCart() {
  return "/carts";
}

/** PATCH (auth) — body: {quantity} → 200 {message,data:cart} */
export function updateCartItem(productId) {
  return `/carts/update/${productId}`;
}

/**
 * PATCH (auth, no body) → 200 {message} ONLY (no payload).
 * Callers must refetch GET /carts on success, roll back on error.
 */
export function removeCartItem(productId) {
  return `/carts/remove/${productId}`;
}

// TODO: shipping/VAT policy TBD — currently 0, docs example shows 30/30.
// Order body sends ORDER_SHIPPING_FEE / ORDER_VAT from lib/config.js
// (one-line change there or via env when the rule is confirmed).
/** POST (auth) — body: {couponCode?,paymentMethod:"cash",address,contactNumber,shippingFee,VAT} → 201 {message,data:order} */
export function addOrder() {
  return "/orders/add";
}

/** GET (auth) → 200 {message,data:order} */
export function getOrderById(id) {
  return `/orders/${id}`;
}

/** POST (auth) — body: {productId,reviewRating,reviewBody} → 201 {message,data:review(status pending)} */
export function addReview() {
  return "/reviews/add";
}

/** GET (auth) — query: {isEnabled} → 200 {message,page,total,data:[coupon]} */
export function listCoupons() {
  return "/coupons/";
}

/** GET (auth) — /coupons/:id → 200 {message,data:coupon} */
export function getCouponById(id) {
  return `/coupons/${id}`;
}

// --- Account / addresses / orders ---
// getProfile, updateAccount, deleteAccount (users) and getOrderById (orders)
// already exist above — reused here.
/** GET (auth) → 200 {message,data:[address]} */
export function listAddresses() {
  return "/addresses";
}

/** POST (auth) — body: {country,city,postalCode,buildingNumber,floorNumber,addressLabel,setAsDefault?} → 201 {message,data:address} */
export function addAddress() {
  return "/addresses/add";
}

/** PUT (auth) — body: partial address | {setAsDefault} → 200 {message} */
export function updateAddress(id) {
  return `/addresses/update/${id}`;
}

/** PATCH (auth, no body) → 200 {message} (soft delete) */
export function softDeleteAddress(id) {
  return `/addresses/soft-delete/${id}`;
}

/** GET (auth) — query: {page,limit} → 200 {message,total?,data:[order]} */
export function listOrders() {
  return "/orders";
}

/** GET (auth, METHOD GET not PATCH) → 200 {message,data:order(status cancelled)} */
export function cancelOrder(id) {
  return `/orders/cancel/${id}`;
}

// --- Public catalog lists ---
/** GET — query: {page,limit,search,sort,categoryId,subCategoryId,brandId} → 200 {message,page,total,data:[product]} */
export function listProducts() {
  return "/products/list";
}

/** GET — query: {page,limit,search,sort} → 200 {message,total,page,data:[brand]} */
export function listBrands() {
  return "/brands/";
}

/** GET — query: {category?,subCategory?} → 200 {message,data:[brand]} */
export function getRelatedBrands() {
  return "/brands/related";
}

/** GET — query: {page,limit,search,sort} → 200 {message,page,total,data:[category]} */
export function listCategories() {
  return "/categories/list";
}

/** GET — query: {page,limit,search,categoryId} → 200 {message,page,total,data:[subcategory]} */
export function listSubCategories() {
  return "/subcategories";
}
