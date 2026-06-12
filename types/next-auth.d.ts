import type { DefaultSession } from "next-auth";

// Role kept as a plain string here so the edge middleware never imports the
// Prisma enum (which would drag the Prisma client into the edge bundle).
declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
