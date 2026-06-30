## NeedleWeb

NeedleWeb runs on Next.js and uses Neon Postgres for data storage.

## Environment Setup

Create a `.env.local` file from `.env.example` and set `DATABASE_URL`.

Recommended Neon branch mapping:

- Development: Neon `dev` branch URL
- Preview: Neon `preview` branch URL
- Production: Neon `main` branch URL

In Vercel, set the same variable name (`DATABASE_URL`) in each environment.

## Database Setup

Apply schema:

```bash
npm run db:migrate
```

Import existing JSON data (`data/users.json` and `data/signup-requests.json`) into Neon:

```bash
npm run db:import-json
```

The import script truncates current table data before inserting JSON records.

## Development

First, run the development server:

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

## Build

```bash
npm run build
```

## Deploy on Vercel

Ensure `DATABASE_URL` is configured in Vercel for Development, Preview, and Production.

Run `npm run db:migrate` against each Neon branch before using the app in that environment.

## Deploy on Netlify

This repository includes a root Netlify configuration file at `../netlify.toml`.

When creating the Netlify site from GitHub, use these values:

- Base directory: `webapp`
- Build command: `npm run build`
- Publish directory: `.next`

Environment variables in Netlify should include `DATABASE_URL` for each context:

- Production: Neon main branch URL
- Deploy Previews: Neon preview branch URL
- Branch Deploys/Local: Neon dev branch URL

After setting environment variables, trigger a deploy and verify sign in, admin/member pages, and API routes.

Run `npm run db:migrate` against each Neon branch before using the app in that environment.
