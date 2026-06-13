// Lightweight role-boundary smoke test against a running server.
//   BASE_URL=http://localhost:3000 node scripts/smoke.mjs
// Verifies public pages render and middleware RBAC gates redirect unauthenticated
// users per role (customer / dealer / admin). Exits non-zero on any failure.

const BASE = process.env.BASE_URL || "http://localhost:3000";
const REDIRECTS = [301, 302, 303, 307, 308];

const checks = [
  { name: "public: home renders", path: "/", ok: (r) => r.status === 200 },
  { name: "public: shop renders", path: "/shop", ok: (r) => r.status === 200 },
  {
    name: "customer gate: /account -> /login",
    path: "/account",
    ok: (r) => REDIRECTS.includes(r.status) && loc(r).includes("/login"),
  },
  {
    name: "dealer gate: /dealer -> /login",
    path: "/dealer",
    ok: (r) => REDIRECTS.includes(r.status) && loc(r).includes("/login"),
  },
  {
    name: "admin gate: /admin -> /admin/login",
    path: "/admin",
    ok: (r) => REDIRECTS.includes(r.status) && loc(r).includes("/admin/login"),
  },
  {
    name: "404: unknown route",
    path: "/no-such-page-xyz",
    ok: (r) => r.status === 404,
  },
];

const loc = (r) => r.headers.get("location") || "";

let failed = 0;
for (const c of checks) {
  try {
    const r = await fetch(BASE + c.path, { redirect: "manual" });
    const pass = c.ok(r);
    const where = loc(r) ? ` -> ${loc(r)}` : "";
    console.log(`${pass ? "PASS" : "FAIL"}  ${c.name}  [${r.status}${where}]`);
    if (!pass) failed++;
  } catch (e) {
    console.log(`FAIL  ${c.name}  [error: ${e.message}]`);
    failed++;
  }
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
