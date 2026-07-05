import { readFile } from "node:fs/promises";

const base = "http://localhost:3001";
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
  body: new URLSearchParams({ csrfToken, email: "admin@vsksports.in", password: "vsksports", callbackUrl: `${base}/` }),
  redirect: "manual",
});
absorb(r);

r = await fetch(`${base}/admin/media`, { headers: { cookie: ch() } });
let page = await r.text();
console.log("MEDIA_PAGE", r.status, "| title:", page.includes("Media Library"), "| empty-state:", page.includes("No media yet"), "| nav-link:", page.includes("/admin/media"));

// upload one library image
const buf = await readFile("public/vsk-logo.png");
const fd = new FormData();
fd.append("file", new Blob([buf], { type: "image/png" }), "vsk-logo.png");
fd.append("kind", "BLOG_MEDIA");
r = await fetch(`${base}/api/upload`, { method: "POST", headers: { cookie: ch() }, body: fd });
console.log("UPLOAD_BLOG_MEDIA", r.status);

r = await fetch(`${base}/admin/media`, { headers: { cookie: ch() } });
page = await r.text();
const count = (page.match(/(\d+) files?/) || [])[1];
console.log("MEDIA_AFTER", r.status, "| count shows:", count, "| has webp thumb:", /\/uploads\/blog_media\/.+\.webp/.test(page));
