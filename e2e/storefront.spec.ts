import { test, expect } from "@playwright/test";

/**
 * Smoke coverage for the pages a customer must be able to reach.
 *
 * Deliberately assertion-light on content and strict on *rendering*: the class
 * of bug these catch is a server component throwing, a bad Prisma include, or a
 * route that redirects when it should not. None of those show up in unit tests.
 */

const PUBLIC_PAGES = ["/", "/shop", "/dealers", "/login", "/contact", "/about"];

for (const path of PUBLIC_PAGES) {
  test(`${path} renders for an anonymous visitor`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should return 200`).toBe(200);
    // A Next error page still returns 200, so assert the error overlay is absent.
    await expect(page.locator("text=Application error")).toHaveCount(0);
    await expect(page.locator("body")).not.toBeEmpty();
  });
}

/**
 * Regression guard for the /dealers gating bug.
 *
 * `startsWith("/dealer")` in proxy.ts also matched `/dealers` — the public
 * locator carrying the "Become a Dealer" form, which is in the sitemap.
 * Anonymous visitors were bounced to /login and crawlers saw a redirect.
 */
test("/dealers stays public and does not redirect to login", async ({ page }) => {
  await page.goto("/dealers");
  expect(new URL(page.url()).pathname).toBe("/dealers");
});

/** The gated counterpart must still be gated — the fix must not have opened it. */
test("/dealer redirects an anonymous visitor to login", async ({ page }) => {
  await page.goto("/dealer");
  await expect(page).toHaveURL(/\/login/);
});

test("/admin redirects an anonymous visitor to the admin login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("checkout is gated behind sign-in", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login/);
});

/**
 * The CSP is applied by proxy.ts to every HTML response. If the nonce plumbing
 * breaks, scripts are blocked and the site silently stops being interactive —
 * a failure no server-side test can see.
 */
test("serves a nonce-based CSP and the page's own scripts still run", async ({ page }) => {
  const response = await page.goto("/");
  const csp = response?.headers()["content-security-policy"];
  expect(csp, "every HTML response must carry a CSP").toBeTruthy();
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");

  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) violations.push(m.text());
  });
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  expect(violations, `CSP blocked the page's own resources:\n${violations.join("\n")}`).toEqual([]);
});

test("the health endpoint answers and withholds detail from anonymous callers", async ({
  request,
}) => {
  const res = await request.get("/api/health");
  // 200 healthy or 503 degraded are both valid answers; a 500 is not.
  expect([200, 503]).toContain(res.status());
  const body = await res.json();
  expect(body).toHaveProperty("ok");
  // The per-subsystem breakdown tells an attacker which defences are down.
  expect(body).not.toHaveProperty("checks");
});

test("a product page can be reached from the shop listing", async ({ page }) => {
  await page.goto("/shop");
  const firstProduct = page.locator('a[href^="/product/"]').first();
  const count = await page.locator('a[href^="/product/"]').count();
  test.skip(count === 0, "no products seeded in this database");

  await firstProduct.click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.locator("h1")).toBeVisible();
});
