// One-time demo-admin seed: registers the demo admin (userType Admin) on
// the backend in NEXT_PUBLIC_API_URL. Built-ins only (global fetch).
// Usage: NEXT_PUBLIC_API_URL=https://<backend> node scripts/seed-demo-admin.mjs
// Safe to re-run: an already-registered account prints a note, exit 0.
const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
if (!base) throw new Error("Set NEXT_PUBLIC_API_URL first.");
const email = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || "admin@gmail.com";
const password = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || "Admin123#";
const res = await fetch(`${base}/users/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  // Address fields are required by the register Joi schema.
  body: JSON.stringify({ username: "Demo Admin", email, password, phone: "01000000000", age: 30, userType: "Admin", gender: "male", country: "Egypt", city: "Cairo", postalCode: "11511", buildingNumber: "1", floorNumber: 1 }),
});
const text = await res.text();
if (res.status === 201) console.log(`OK: demo admin ${email} registered.`);
else if (/already|exist|duplicate/i.test(text)) console.log(`OK: ${email} already registered — nothing to do.`);
else { console.error(`FAIL (${res.status}):`, text.slice(0, 200)); process.exitCode = 1; }
