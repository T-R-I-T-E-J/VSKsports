import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";

// The session is the one thing a test must control. Everything below it — the
// database lookup, the role comparison — is the behaviour under test and runs
// for real.
const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: authMock }));

const { getValidatedSession, revokeSessions } = await import("@/lib/session");
const { requireStaff } = await import("@/app/admin/(panel)/_lib/admin");
const { prisma, createUser, cleanup } = await import("@/test/fixtures");

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

beforeEach(() => authMock.mockReset());

/** Build the session shape NextAuth hands back, with a controllable issue time. */
const sessionFor = (id: string, role: string, issuedAt = Math.floor(Date.now() / 1000)) => ({
  user: { id, role },
  issuedAt,
});

describe("requireStaff", () => {
  it("rejects a customer", async () => {
    const user = await createUser({ role: "CUSTOMER" });
    authMock.mockResolvedValue(sessionFor(user.id, "CUSTOMER"));

    await expect(requireStaff()).rejects.toThrow("Forbidden");
  });

  it("rejects an anonymous caller", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireStaff()).rejects.toThrow("Forbidden");
  });

  it("admits ADMIN and STAFF", async () => {
    const admin = await createUser({ role: "ADMIN" });
    authMock.mockResolvedValue(sessionFor(admin.id, "ADMIN"));
    await expect(requireStaff()).resolves.toMatchObject({ user: { id: admin.id, role: "ADMIN" } });

    const staff = await createUser({ role: "STAFF" });
    authMock.mockResolvedValue(sessionFor(staff.id, "STAFF"));
    await expect(requireStaff()).resolves.toMatchObject({ user: { id: staff.id, role: "STAFF" } });
  });

  /**
   * The privilege-escalation case. Sessions are stateless JWTs, so a token
   * minted while the account was an ADMIN still *claims* ADMIN after a
   * demotion. The guard previously read that claim and let the demoted user
   * keep full admin access until the token expired.
   */
  it("refuses a demoted admin whose token still claims ADMIN", async () => {
    const user = await createUser({ role: "ADMIN" });
    // The token was issued while they were an admin, and still says so.
    authMock.mockResolvedValue(sessionFor(user.id, "ADMIN"));
    await expect(requireStaff()).resolves.toBeTruthy();

    await prisma.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } });

    // Same unchanged token — the database is now the authority.
    await expect(requireStaff()).rejects.toThrow("Forbidden");
  });

  it("refuses a token belonging to a deleted account", async () => {
    const user = await createUser({ role: "ADMIN" });
    await prisma.user.delete({ where: { id: user.id } });
    authMock.mockResolvedValue(sessionFor(user.id, "ADMIN"));

    await expect(requireStaff()).rejects.toThrow("Forbidden");
  });
});

describe("session revocation", () => {
  /**
   * A password reset is usually performed BECAUSE an account was compromised.
   * With a stateless JWT the attacker's existing token previously stayed valid
   * until it expired — the reset locked the front door and left them inside.
   */
  it("invalidates tokens issued before the session floor", async () => {
    const user = await createUser({ role: "CUSTOMER" });
    const issuedAt = Math.floor(Date.now() / 1000) - 3600; // an hour old
    authMock.mockResolvedValue(sessionFor(user.id, "CUSTOMER", issuedAt));

    // Valid before the floor is raised.
    await expect(getValidatedSession()).resolves.toMatchObject({ userId: user.id });

    await revokeSessions(user.id);

    // Same token, now rejected.
    await expect(getValidatedSession()).resolves.toBeNull();
  });

  it("keeps tokens issued after the floor working", async () => {
    const user = await createUser({ role: "CUSTOMER" });
    await revokeSessions(user.id);

    // A fresh sign-in mints a token after the floor.
    const issuedAt = Math.floor(Date.now() / 1000) + 5;
    authMock.mockResolvedValue(sessionFor(user.id, "CUSTOMER", issuedAt));

    await expect(getValidatedSession()).resolves.toMatchObject({ userId: user.id });
  });

  it("reports the database role, not the token's copy", async () => {
    const user = await createUser({ role: "STAFF" });
    // A forged or stale token claiming ADMIN must not confer ADMIN.
    authMock.mockResolvedValue(sessionFor(user.id, "ADMIN"));

    await expect(getValidatedSession()).resolves.toMatchObject({ role: "STAFF" });
  });
});
