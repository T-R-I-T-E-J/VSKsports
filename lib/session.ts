import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Session validation that consults the database.
 *
 * Sessions are stateless JWTs, so two things were previously impossible:
 * revoking a session (a password reset performed *because* an account was
 * compromised left the attacker's token working until it expired) and
 * propagating a role change (a demoted admin kept admin access, because both
 * the middleware and `requireStaff()` read the role out of the token).
 *
 * This resolves both by re-reading the user on the Node side. The token is
 * still what authenticates; the database is what authorizes.
 *
 * Kept out of `auth.config.ts` deliberately — that config is shared with the
 * edge middleware, which cannot import Prisma.
 */
export type ValidatedSession = {
  userId: string;
  /** Authoritative role, read from the database — never the token's copy. */
  role: string;
  email: string | null;
  name: string | null;
};

/**
 * Returns the caller's validated session, or null when there is none, the user
 * no longer exists, or the token predates the account's session floor.
 */
export async function getValidatedSession(): Promise<ValidatedSession | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
      name: true,
      sessionsValidFrom: true,
    },
  });
  // Deleted account with a still-valid token.
  if (!user) return null;

  if (user.sessionsValidFrom) {
    // `iat` is in seconds; compare against the floor with a 1s tolerance so a
    // token minted in the same second as the reset is not spuriously rejected.
    const issuedAtMs = (session?.issuedAt ?? 0) * 1000;
    if (issuedAtMs > 0 && issuedAtMs < user.sessionsValidFrom.getTime() - 1000) {
      return null;
    }
  }

  return { userId: user.id, role: user.role, email: user.email, name: user.name };
}

/** Bump the session floor so every token issued before now stops working. */
export async function revokeSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionsValidFrom: new Date() },
  });
}
