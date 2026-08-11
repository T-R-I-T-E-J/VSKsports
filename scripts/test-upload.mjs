import { readFile, stat } from "node:fs/promises";

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
const cookieHeader = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");

// wait for server
let up = false;
for (let i = 0; i < 30; i++) {
  try {
    const r = await fetch(`${base}/api/auth/csrf`);
    if (r.ok) { up = true; break; }
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
if (!up) { console.log("SERVER_NOT_UP"); process.exit(1); }

// 1. csrf
let r = await fetch(`${base}/api/auth/csrf`);
absorb(r);
const { csrfToken } = await r.json();

// 2. sign in as admin
const body = new URLSearchParams({ csrfToken, email: "admin@vsksports.in", password: ADMIN_PASSWORD, callbackUrl: `${base}/` });
r = await fetch(`${base}/api/auth/callback/credentials`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
  body,
  redirect: "manual",
});
absorb(r);
console.log("SIGNIN", r.status, "session=", !!cookies["authjs.session-token"]);

// 3. upload a real image (reuse the logo)
const buf = await readFile("public/vsk-logo.png");
const fd = new FormData();
fd.append("file", new Blob([buf], { type: "image/png" }), "vsk-logo.png");
fd.append("kind", "PRODUCT_IMAGE");
r = await fetch(`${base}/api/upload`, { method: "POST", headers: { cookie: cookieHeader() }, body: fd });
const text = await r.text();
console.log("UPLOAD", r.status, text);

// 4. verify the stored file exists on disk
try {
  const parsed = JSON.parse(text);
  if (parsed.file?.url) {
    const rel = parsed.file.url.replace(/^\//, "");
    const s = await stat(`public/${rel}`);
    console.log("STORED_FILE", parsed.file.url, `${s.size}B on disk`);
  }
} catch (e) {
  console.log("VERIFY_ERR", e.message);
}
