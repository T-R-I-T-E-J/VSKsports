import { readFile } from "node:fs/promises";

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

// wait for server
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`${base}/api/auth/csrf`); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

// login admin
let r = await fetch(`${base}/api/auth/csrf`); absorb(r);
const { csrfToken } = await r.json();
r = await fetch(`${base}/api/auth/callback/credentials`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: ch() },
  body: new URLSearchParams({ csrfToken, email: "admin@vsksports.in", password: ADMIN_PASSWORD, callbackUrl: `${base}/` }),
  redirect: "manual",
});
absorb(r);
console.log("LOGIN", r.status, "session=", !!cookies["authjs.session-token"]);

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers: { cookie: ch() } });
  return { status: res.status, html: await res.text() };
}
// scrape a list page for the first detail link, then fetch it
async function detail(listPath, re, needle) {
  const l = await get(listPath);
  const m = l.html.match(re);
  if (!m) return `${listPath} -> NO_LINK (list ${l.status})`;
  const d = await get(m[0]);
  return `${m[0]} -> ${d.status} | "${needle}": ${d.html.includes(needle)}`;
}

console.log("--- direct pages ---");
for (const [p, needle] of [
  ["/admin/media", "Media Library"],
  ["/profile", "Upload a new photo"],
  ["/dealers", "Upload GST"],
  ["/returns", "Upload a photo of the issue"],
]) {
  const g = await get(p);
  console.log(`${p} -> ${g.status} | "${needle}": ${g.html.includes(needle)}`);
}

console.log("--- detail pages (scraped) ---");
console.log(await detail("/admin/orders", /\/admin\/orders\/[a-z0-9]+/i, "Documents"));
console.log(await detail("/admin/events", /\/admin\/events\/[a-z0-9]+/i, "Upload image"));
console.log(await detail("/admin/training", /\/admin\/training\/[a-z0-9]+/i, "Upload image"));
console.log(await detail("/admin/blog", /\/admin\/blog\/[a-z0-9]+\/edit/i, "cover image"));

console.log("--- private doc upload + gated download ---");
const buf = await readFile("public/vsk-logo.png");
const fd = new FormData();
fd.append("file", new Blob([buf], { type: "image/png" }), "invoice.png");
fd.append("kind", "ORDER_DOC");
r = await fetch(`${base}/api/upload`, { method: "POST", headers: { cookie: ch() }, body: fd });
const up = await r.json();
console.log("UPLOAD ORDER_DOC", r.status, "| url is null (private):", up.file?.url === null, "| id:", up.file?.id);
if (up.file?.id) {
  const a = await fetch(`${base}/api/files/${up.file.id}`, { headers: { cookie: ch() } });
  console.log("DOWNLOAD (admin)", a.status, "| content-type:", a.headers.get("content-type"));
  const b = await fetch(`${base}/api/files/${up.file.id}`); // no cookie
  console.log("DOWNLOAD (anon) blocked:", b.status === 401);
}
