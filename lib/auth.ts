import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Failed sign-ins tolerated per 15-minute window.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_ACCOUNT = 8;
const LOGIN_MAX_PER_IP = 30;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        // SECURITY: throttle password guessing. Only FAILED attempts count and
        // the window is cleared on success, so a legitimate user is never
        // locked out by their own successful sign-in. Keyed on account AND
        // source IP so neither a single-account brute force nor a spray across
        // many accounts from one host can run unimpeded.
        const ip = await clientIp();
        const accountKey = `login:acct:${normalizedEmail}`;
        const ipKey = `login:ip:${ip}`;
        const [byAccount, byIp] = await Promise.all([
          rateLimit(accountKey, LOGIN_MAX_PER_ACCOUNT, LOGIN_WINDOW_MS),
          rateLimit(ipKey, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS),
        ]);
        // Returning null surfaces as a normal sign-in failure — deliberately
        // indistinguishable from a wrong password, so probing can't map which
        // accounts exist or are currently locked.
        if (!byAccount.ok || !byIp.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await Promise.all([resetRateLimit(accountKey), resetRateLimit(ipKey)]);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
