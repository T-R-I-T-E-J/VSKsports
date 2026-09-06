import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Prisma / bcrypt). Shared by middleware and the
// full Node config in lib/auth.ts. Real providers are added there.
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role ?? undefined) as string | undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string | undefined;
      }
      // Surface the issue time so Node-side guards can reject tokens minted
      // before a password reset or role change. Reading `iat` needs no database,
      // so this stays edge-safe.
      session.issuedAt = typeof token.iat === "number" ? token.iat : undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
