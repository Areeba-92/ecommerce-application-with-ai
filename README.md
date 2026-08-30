# VELOUR

A premium fashion ecommerce storefront (men's & women's apparel) built with
Next.js App Router and TypeScript, backed by a real database, auth, and
PayPal-based checkout — not a demo.

**Live: [ecommerce-application-with-ai.vercel.app](https://ecommerce-application-with-ai.vercel.app)**

## What's real here

- **Auth** — email/password signup and sign-in with email verification
  (6-digit code), backed by [InsForge](https://insforge.dev).
- **Catalogue** — product listing, filtering, search, and detail pages read
  from a live Postgres table, not static/in-memory data.
- **Cart** — persists to `localStorage` for guests and syncs to the database
  for signed-in users (loads on login, write-through on every change).
- **Orders & payment** — checkout creates a real order row, then hands off to
  PayPal (a PayPal.me link, amount pre-filled). Row-level security plus a
  database trigger enforce that a client can only ever move an order from
  `pending`/`unpaid` to `confirmed`/`paid` — once, and touching no other
  field (total, items, address) — no matter what the client sends.
- **Profile** — order history with a payment badge and a
  pending → confirmed → shipped → delivered status tracker.

## Stack

- Next.js (App Router) + TypeScript + React, deployed on Vercel
- No Tailwind — `app/globals.css` holds the entire design system as CSS
  variables + hand-written responsive rules
- [InsForge](https://insforge.dev) for Postgres (with RLS), auth, and object
  storage — accessed through `@insforge/sdk` via the single client in
  `lib/insforge.ts`

## A deliberate tradeoff, not a bug

Payment is via a plain [PayPal.me](https://paypal.me) link rather than
PayPal's full Checkout API. That means there's no server-side payment
webhook — confirming payment is trust-based (the "I've paid" button is the
only signal the app gets). For a portfolio project this was a conscious
scope call to keep the free-tier stack simple; a production version would
move to PayPal Orders API or Stripe for real server-side verification. See
`PROGRESS.md` for the full writeup.

## Project structure

```
app/                    routes + layout.tsx + globals.css
  checkout/              order placement
  payment/[orderId]/     PayPal handoff interstitial
  payment/return/        payment confirmation (flips order to paid)
  profile/               order history + status tracker
components/             shared + page-level components (server by default)
lib/api.ts              InsForge-backed data layer — the backend-swap seam
lib/insforge.ts         single InsForge SDK client + auth-state helpers
lib/store.tsx           cart context (localStorage + DB sync)
lib/data.ts             legacy demo catalogue (kept, disconnected — see below)
migrations/             SQL migrations (schema, RLS policies, triggers)
scripts/import-listings.mjs  CSV → catalogue import pipeline (local/demo only)
incoming/               listings-template.csv, README.md, images/ drop folder
```

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in your own InsForge project URL + anon key
npm run dev
```

Env vars (all `NEXT_PUBLIC_*`, safe for the client):

| Var | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | yes | InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | yes | InsForge anon key |
| `NEXT_PUBLIC_PAYPAL_ME_URL` | no | Your PayPal.me link. Unset = demo mode (a "Simulate Payment" button replaces the real redirect) |

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (must pass with zero type errors)
- `npm run start` — run the production build
- `npm run import-listings` — CSV → catalogue import pipeline (see below)

## Demo catalogue pipeline (separate from the live data)

`lib/data.ts` and `scripts/import-listings.mjs` are a leftover CSV → static
catalogue pipeline from before the InsForge backend existed. It's still
useful for quickly previewing new product photography/copy locally, but it
targets `lib/generated-products.ts`, not the live `products` table — see
`incoming/README.md` if you want to use it.

## Deploying

Already deployed to Vercel's free Hobby tier via the Vercel CLI
(`vercel --prod`) — no server-side cron or filesystem writes at runtime, so
it fits the tier with no extra configuration. Set the same env vars from the
table above as Production environment variables on the Vercel project before
deploying your own copy.
