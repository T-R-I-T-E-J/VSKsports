This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Database (Postgres via Docker)

Postgres runs in Docker, published on host port **5544** (→ container 5432). The
port lives in `docker-compose.yml` and `.env` (`DATABASE_URL`) — no per-session
override is needed.

```bash
cp .env.example .env   # first time only
npm run db:up          # start Postgres (docker compose, waits until healthy)
npm run db:migrate     # apply migrations
npm run db:seed        # optional: seed sample data
```

> **Why port 5544?** 5432/5433 are usually taken by a native Postgres, and 55432
> (a previous choice) falls inside Windows' WinNAT-reserved ephemeral range, where
> Docker can fail to bind it with `bind: ... forbidden by its access permissions`.
> 5544 sits below that range and binds reliably.

### Dev server

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
