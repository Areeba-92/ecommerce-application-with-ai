# HAVEN

A premium modest-wear ecommerce storefront (women's, men's, and home &
worship) built with Next.js App Router and TypeScript, backed by a real
database, auth, and PayPal-based checkout — not a demo.

**Live: [ecommerce-application-with-ai.vercel.app](https://ecommerce-application-with-ai.vercel.app)**

## What's real here

- **Auth** — email/password signup and sign-in with email verification
  (6-digit code), backed by [InsForge](https://insforge.dev).
- **Catalogue** — 27 products across three categories (`women`, `men`,
  `home`) with real product photography. Listing, filtering, search and detail
  pages read from a live Postgres table, not static/in-memory data.
- **Dark mode** — a navbar toggle, defaulting to the OS preference and
  persisting an explicit choice. Implemented purely by redefining colour
  tokens; no component has a dark variant.
- **Cart** — persists to `localStorage` for guests and syncs to the database
  for signed-in users (loads on login, write-through on every change).
- **Orders & payment** — checkout creates a real order row, then hands off to
  PayPal (a PayPal.me link, amount pre-filled). Row-level security plus a
  database trigger enforce that a client can only ever move an order from
  `pending`/`unpaid` to `confirmed`/`paid` — once, and touching no other
  field (total, items, address) — no matter what the client sends.
- **Collections** — `/collection/featured`, `/collection/new` and
  `/collection/trending` list every flagged product across all categories;
  the homepage "View All" buttons and footer Shop links point here.
- **Profile** — order history with a payment badge and a
  pending → confirmed → shipped → delivered status tracker, plus a
  **Delete Account** danger zone (type-`DELETE` confirmation). Deletion runs in
  a server-only route that verifies the caller's own session, then removes
  their uploaded files and auth user; their cart and orders go with it via
  `ON DELETE CASCADE`.

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
  women/ men/ home-living/  category listing pages
  collection/[type]/     featured | new | trending listings (all categories)
  checkout/              order placement
  payment/[orderId]/     PayPal handoff interstitial
  payment/return/        payment confirmation (flips order to paid)
  profile/               order history + status tracker + delete account
  api/account/delete/    server-only account deletion (uses INSFORGE_API_KEY)
components/             shared + page-level components (server by default)
lib/api.ts              InsForge-backed data layer — the backend-swap seam
lib/insforge.ts         single InsForge SDK client + auth-state helpers
lib/store.tsx           cart context (localStorage + DB sync)
lib/data.ts             Category type, CATEGORIES, legacy demo catalogue
                        (kept, disconnected — see below)
lib/shipping.ts         free-shipping threshold + flat rate (mirrored in SQL)
components/ThemeToggle.tsx  light/dark switch
migrations/             SQL migrations (schema, RLS policies, triggers)
scripts/import-listings.mjs  CSV → catalogue import pipeline (local/demo only)
incoming/               listings-template.csv, README.md, images/ drop folder
```

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in your own InsForge project URL + keys
npm run dev
```

Env vars:

| Var | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | yes | InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | yes | InsForge anon key |
| `NEXT_PUBLIC_PAYPAL_ME_URL` | no | Your PayPal.me link. Unset = demo mode (a "Simulate Payment" button replaces the real redirect) |
| `INSFORGE_API_KEY` | for account deletion | **Server-only secret** — the project admin key (`api_key` in `.insforge/project.json`). Never give it a `NEXT_PUBLIC_` prefix. Without it, "Delete Account" shows an error and nothing else is affected |

The three `NEXT_PUBLIC_*` values are safe in the browser — row-level security,
not key secrecy, is what protects the data. `INSFORGE_API_KEY` bypasses RLS and
is read only by `app/api/account/delete/route.ts`.

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

## Product catalogue

Live product data lives in the InsForge `products` table; images are served
from the public `product-images` storage bucket. The current catalogue was
imported from a supplied drop folder (`product image/`, gitignored — 72MB of
PNG masters plus WebP renditions) via a one-off script: images uploaded to the
bucket, rows inserted with `ON CONFLICT DO UPDATE`.

Two caveats on that import:

- **Prices are placeholders.** The source CSV shipped with every `price` field
  empty. The current values were chosen by product type to sit inside the
  existing range — they are not costed. Review before taking real orders.
- **Products carry one or two images.** Single-photo products are stored with a
  one-entry array rather than a padded duplicate.
- **7 of 23 colour variants were skipped** because they have no individual
  photograph, only a shared colour-range group shot. Listing a specific
  colourway using a photo of six colours would misrepresent the product.

## Deploying

Already deployed to Vercel's free Hobby tier via the Vercel CLI
(`vercel --prod`) — no server-side cron or filesystem writes at runtime, so
it fits the tier with no extra configuration. Set the env vars from the table
above on the Vercel project (Settings → Environments → **Production** →
Environment Variables) before deploying your own copy — add `INSFORGE_API_KEY`
as type **Secret** — and redeploy after changing any of them; saved variables
only reach the site on the next deployment.

To check the deletion key is wired up without deleting anything,
`curl -X POST <site>/api/account/delete` should answer **401 "Not signed in."**
— a **500** means `INSFORGE_API_KEY` is missing on that deployment.
