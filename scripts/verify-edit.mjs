const base = "http://localhost:3001";

// Dev fixture credentials for the locally seeded admin. Override with
// SEED_PASSWORD when the local seed used a non-default password.
const ADMIN_PASSWORD = process.env.SEED_PASSWORD || "vsksports";
const cookies = {};
function absorb(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of list) {
    const kv = c.split(";")[0];
    const i = kv.indexOf("=");
    if (i > 0) cookies[kv.slice(0, i)] = kv.slice(i + 1);
  }
}
const ch = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");

let r = await fetch(`${base}/api/auth/csrf`);
absorb(r);
const { csrfToken } = await r.json();
r = await fetch(`${base}/api/auth/callback/credentials`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: ch() },
  body: new URLSearchParams({ csrfToken, email: "admin@vsksports.in", password: ADMIN_PASSWORD, callbackUrl: `${base}/` }),
  redirect: "manual",
});
absorb(r);

// find a product edit URL from the admin products list
r = await fetch(`${base}/admin/products`, { headers: { cookie: ch() } });
const list = await r.text();
const m = list.match(/\/admin\/products\/([a-z0-9]+)\/edit/i);
if (!m) { console.log("NO_EDIT_LINK (list status " + r.status + ")"); process.exit(0); }

r = await fetch(`${base}${m[0]}`, { headers: { cookie: ch() } });
const page = await r.text();
console.log("EDIT_PAGE", r.status, "id=" + m[1]);
console.log("has 'Product images' section:", page.includes("Product images"));
console.log("has upload dropzone:", page.includes("browse"));
