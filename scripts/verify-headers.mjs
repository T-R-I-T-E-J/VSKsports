import { readFile } from "node:fs/promises";
const base = "http://localhost:3001";
const cookies = {};
const absorb = (res) => { for (const c of (res.headers.getSetCookie?.() ?? [])) { const kv = c.split(";")[0]; const i = kv.indexOf("="); if (i > 0) cookies[kv.slice(0, i)] = kv.slice(i + 1); } };
const ch = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");

let r = await fetch(`${base}/api/auth/csrf`); absorb(r);
const { csrfToken } = await r.json();
r = await fetch(`${base}/api/auth/callback/credentials`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", cookie: ch() }, body: new URLSearchParams({ csrfToken, email: "admin@vsksports.in", password: "vsksports", callbackUrl: `${base}/` }), redirect: "manual" });
absorb(r);

const buf = await readFile("public/vsk-logo.png");
const fd = new FormData();
fd.append("file", new Blob([buf], { type: "image/png" }), "invoice.png");
fd.append("kind", "ORDER_DOC");
r = await fetch(`${base}/api/upload`, { method: "POST", headers: { cookie: ch() }, body: fd });
const up = await r.json();
const dl = await fetch(`${base}/api/files/${up.file.id}`, { headers: { cookie: ch() } });
console.log("status", dl.status);
console.log("content-disposition:", dl.headers.get("content-disposition"));
console.log("x-content-type-options:", dl.headers.get("x-content-type-options"));
console.log("content-security-policy:", dl.headers.get("content-security-policy"));
// also confirm html/svg still rejected at upload for a doc kind
const fd2 = new FormData();
fd2.append("file", new Blob(["<script>alert(1)</script>"], { type: "text/html" }), "x.html");
fd2.append("kind", "DEALER_DOC");
const bad = await fetch(`${base}/api/upload`, { method: "POST", headers: { cookie: ch() }, body: fd2 });
console.log("html-as-DEALER_DOC rejected:", bad.status, (await bad.json()).error);
