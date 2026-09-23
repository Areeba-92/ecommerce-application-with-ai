# HAVEN — Progress Notes

> **Naming note:** the brand was renamed on 2026-08-29, and on 2026-09-23 the
> old name was scrubbed from the entire project at the owner's request — the
> InsForge backend project was renamed to `haven` too. Every entry below now
> reads "HAVEN", including ones describing work done before the rename, where
> the strings at the time (throwaway test-account emails, the PayPal test
> handle, the verification-email sender name) literally used the old name.

> **Site is LIVE as of 2026-09-23** at
> https://ecommerce-application-with-ai.vercel.app — the owner re-activated it
> on Vercel themselves, after it had been deliberately taken private on
> 2026-08-30. The InsForge backend had auto-paused in the meantime and was
> restored the same day (see the 2026-09-23 entry below). `VERCEL_PRIVACY.md`
> covers taking it private again.

Read this first when picking the project back up. It covers what exists, what
was just built, what's known-broken/untested, and what to do next.

## Server-side order pricing — the CRITICAL audit finding is fixed (2026-09-23)

The open CRITICAL finding from `SECURITY_AUDIT.md` is closed, plus a second hole
found while fixing it.

- **What was wrong:** `app/checkout/page.tsx` inserted `items[].price`, `subtotal`
  and `total` straight from browser cart state, and `orders_insert_own` only checks
  `auth.uid() = user_id`. Anyone could place an order at any price from devtools.
- **Second hole, not in the original audit:** `authenticated` held a table-wide
  INSERT grant, so a client could insert a row already marked
  `status='confirmed', payment_status='paid'` and skip payment entirely. The existing
  `orders_guard_payment_update` trigger never saw it — it only fires on UPDATE.
- **Fix:** two migrations (`20260923151447_enforce-order-integrity.sql`, then
  `20260923151851_harden-order-integrity-trigger.sql`) adding a `BEFORE INSERT`
  trigger that recomputes every line from `products.price`, recomputes
  subtotal/shipping/total, forces `pending`/`unpaid`/`paypal`, nulls
  `payment_receipt_url`, pins `created_at`, and rejects unknown products, bad
  quantities, unavailable sizes and carts over 50 lines. Mirrors the existing payment
  guard's style, including the `project_admin` exemption. The dead `DELETE` grant on
  `orders` was revoked too.
- **Tampered values are corrected, not rejected** — deliberate. A stale cart after a
  genuine price change still checks out, and `/payment/<id>` re-reads `total` from the
  DB, so the real amount is shown before any money moves.
- **`lib/shipping.ts`** now holds the free-shipping threshold and flat rate, imported
  by both `app/cart/page.tsx` and `app/checkout/page.tsx` (they each had their own
  copy). The trigger keeps its own commented copy — that SQL one is authoritative.
- **Checkout now surfaces the DB's rejection message** instead of a generic
  "Could not place your order".

### Testing note — read this before re-testing

`npx @insforge/cli db query` runs as **`project_admin`, which the trigger exempts by
design.** Attack attempts run that way sail through and prove nothing. All verification
must run from a signed-in SDK session.

Verified as a real authenticated throwaway user — forged price `0.01` stored at the true
148; forged total overwritten; forged item name replaced from the catalogue; negative,
zero, fractional, string and >999 quantities rejected; unknown `productId` rejected
rather than silently dropped; empty `items` rejected; unavailable size rejected; 60-line
cart rejected; an insert claiming `confirmed`/`paid` stored as `pending`/`unpaid`;
backdated `created_at` and forged receipt URL both overwritten. Free-shipping boundary
checked both sides (24 -> 9.95 shipping; 296 -> free).

Existing payment flow re-verified unchanged: the `pending/unpaid -> confirmed/paid`
transition still succeeds exactly once, a repeat is still rejected, and forging `total`
on an existing order still fails with `permission denied`.

Full happy path re-run in a real browser (Playwright, production build): sign in ->
cart -> checkout showing `$296.00` with free shipping -> Place Order -> payment page
showing the same `$296.00` -> Simulate Payment -> return -> `/profile` showing the
`PAID` badge, `CONFIRMED` tracker and `Open-Front Abaya x 2 (M) $296.00`. Only console
error is the pre-existing guest `auth/refresh` 401.

Both throwaway accounts and all test orders were deleted afterwards; the owner's real
$310 order is untouched.

### Note: the free-tier backend is slow right after a restore

During this pass `/product/[id]` took 16s and a direct InsForge call took 28s, which
made the first browser runs time out and looked like an app bug. It wasn't — `lib/api.ts`
and the product page were never modified. If pages hang, check backend latency before
suspecting the code.

## Name scrub + backend restore (2026-09-23)

- **The old brand name was removed from the entire project** at the owner's
  request. No source file had ever contained it — it lived only in docs plus
  the backend's own project name. `grep -rni` for it across the repo now
  returns nothing.
  - **InsForge project renamed to `haven`** via
    `npx @insforge/cli projects update --name haven` (verified with
    `projects get`). Display-name only: the API host is id-based
    (`r8x92gz9.us-east.insforge.app`) and unchanged, so no keys, env vars,
    code, or data were touched. `.insforge/project.json`'s `project_name`
    was updated to match. One real side effect, for the better:
    verification emails now show `haven <noreply@insforge.dev>` as the sender.
  - **Docs scrubbed:** `CLAUDE.md` (project line + the now-obsolete paragraph
    explaining why the backend still had the old name), `AGENTS.md`,
    `01_create_frontend.md` (the original brief's BRAND line), and
    `PROGRESS.md`. Per the owner's explicit decision, the historical strings
    in this file were rewritten too — throwaway test-account emails, the
    PayPal test handle, and the verification-email sender name. Those strings
    literally used the old name at the time, so treat them as normalized, not
    as verbatim quotes.
- **Backend was found auto-paused** (free tier, inactivity): health endpoint
  503, `Failed to fetch products: No backend services available for app:
  r8x92gz9` in the build log, so the site rendered an empty catalogue.
  Restored with `npx @insforge/cli projects restore`; status went
  `paused` → `active` and health returned 200 after ~30s. All 20 products
  intact — a `relation "products" does not exist` error seen seconds after
  restore was transient boot noise, not data loss.
- **Verified live:** `/`, `/women`, `/men`, `/login` all 200 on the public URL,
  and the pages genuinely render DB-backed products (212 product cards on the
  homepage, 122 on `/women`) — confirming the statically prerendered homepage
  was not frozen with an empty catalogue.
- `npm run build` clean, zero type errors.

## Hero video + security audit (2026-08-30)

- **Hero section** now plays a real video (`public/videos/hero.mp4`,
  transcoded H.264/faststart, audio stripped) instead of the 3-image Unsplash
  crossfade — see `components/Hero.tsx` (the video branch already existed,
  just needed the file). Raw source kept on disk at `herosection .mp4`
  (gitignored, never delete it — see `.gitignore`) in case a re-encode is
  ever needed.
- **Full read-only security audit performed** — see `SECURITY_AUDIT.md` for
  the complete report. One-line summary: auth/RLS/admin-authorization/secrets
  all came back SAFE; the one real (CRITICAL-rated) finding is that
  **`app/checkout/page.tsx` inserts client-supplied `price`/`subtotal`/`total`
  into the `orders` table with no server-side revalidation against the live
  `products.price`** — low real-world blast radius today since PayPal.me
  payment is already manual/trust-based and decoupled from the DB total, but
  would become genuinely exploitable if a real payment API is ever wired in.
  Not fixed yet — waiting on approval (see SECURITY_AUDIT.md's "Top 5").
- **Site was then taken private** at the user's request — see the banner at
  the top of this file and `VERCEL_PRIVACY.md`.

## Live deployment (Vercel Hobby tier)

**Live URL: https://ecommerce-application-with-ai.vercel.app**
(Vercel project `ecommerce-application-with-ai`, scope `me-5a10`, first
deploy this pass — `npx vercel link` created it fresh, nothing pre-existed.)

### What was set up

- Logged in via `npx vercel login` (device-code browser auth, done by the
  account owner interactively — CLI can't do this step itself).
- `npx vercel link --yes` created and linked the Vercel project (no
  `vercel.json`/`vercel.ts` needed — Next.js auto-detected).
- Production env vars set via `npx vercel env add <NAME> production`, values
  piped from temp files (never typed into command text) and deleted right
  after:
  - `NEXT_PUBLIC_INSFORGE_URL`
  - `NEXT_PUBLIC_INSFORGE_ANON_KEY`
  - `NEXT_PUBLIC_PAYPAL_ME_URL` — **intentionally left unset**, so production
    runs in the same PayPal "demo mode" as local (Simulate Payment button,
    no external redirect) until a real PayPal.me handle is provided.
- `npm run build` verified clean locally, then `npx vercel --prod` deployed.
- `.vercel/` and `.env.local` are both already gitignored — confirmed
  nothing sensitive got committed.
- `npx -y @insforge/cli config export` was run to check auth redirect/CORS
  settings, which incidentally wrote `insforge.toml` to the project root
  (untracked, no secrets — safe to commit or delete, your call).

### Live verification (Playwright against the deployed URL + InsForge CLI for DB checks)

- Homepage, `/women`, `/men`, `/login` all return 200.
- Product listing and detail pages render real DB rows (e.g. "Open-Front
  Abaya" — confirmed against `SELECT name FROM products`), not stale/demo
  data — `lib/api.ts`'s InsForge-backed fetch is working in production.
- Product images load with zero broken `<img>` tags — confirms
  `next.config.ts`'s dynamic `remotePatterns` (derived from
  `NEXT_PUBLIC_INSFORGE_URL`) is correctly picking up the InsForge storage
  domain in the Vercel build, not just locally.
- **CORS: not an issue, confirmed empirically, not just by reading docs.**
  Guest-visitor console 401s on `.../api/auth/refresh` are real HTTP 401
  responses from the InsForge domain — the browser cross-origin request
  reached the server and got a real (expected, pre-existing) "no session"
  response back. A genuine CORS block would show as a browser-level network
  error instead, and none appeared. `allowed_redirect_urls` in InsForge's
  auth config is empty, but that setting only applies to OAuth/link-based
  redirect flows — HAVEN uses code-based email/password auth, which
  doesn't touch it, so nothing needed changing there.
- Signup flow reaches the "enter your 6-digit code" screen cleanly on the
  live URL, no errors. (Note: at the time this deployment pass was run, real
  code delivery was believed broken due to no SMTP provider configured —
  see the correction below dated the same day. That belief was wrong; real
  delivery works fine. The throwaway test account used for the checks below
  was still verified via CLI rather than waiting on a real inbox, since
  disposable `@example.com` addresses can't receive mail regardless.)
- Full cart → checkout → payment flow verified live end-to-end with a
  throwaway `haven-live-check-*@example.com` account (email-verified via
  CLI since it's a disposable test address, deleted after testing): add to
  cart → checkout → order `pending`/`unpaid` in DB → payment interstitial
  correctly showed the demo-mode "Simulate Payment" banner (confirming
  `NEXT_PUBLIC_PAYPAL_ME_URL` really is unset in prod) → return page →
  DB shows `confirmed`/`paid` → `/profile` shows the `Paid` badge and
  `CONFIRMED` tracker state.

### Nothing needs your attention from this pass

No CORS/domain-allowlist issue turned up (the most common "works locally,
breaks in prod" failure for this setup) — verified empirically above, not
assumed.

## Latest pass: PayPal payments (replaces receipt upload)

Checkout's payment-receipt upload has been **removed and replaced with
PayPal**. Verified end-to-end (Playwright, real InsForge backend) in both
modes described below; two real bugs were found and fixed during testing.

### What changed

- **Migration** `migrations/20260830041706_add-paypal-payment-to-orders.sql`:
  - `orders` gains `payment_status` (`unpaid`/`paid`, default `unpaid`) and
    `payment_method` (default `paypal`).
  - `status` CHECK constraint's vocabulary changed from
    `pending/paid/shipped/delivered` to
    **`pending/confirmed/shipped/delivered`**.
  - New RLS `orders_update_own` policy (owner-only UPDATE), but the broad
    default UPDATE grant is revoked and replaced with a **column-level grant**
    on just `(payment_status, status)` — a signed-in user cannot touch
    `total`, `items`, `user_id`, etc. via the API even though they now have
    UPDATE access to the row.
  - New trigger `orders_guard_payment_update` (skipped when
    `current_user = 'project_admin'`, i.e. CLI/dashboard admin work is
    unaffected) enforces the **only** legal client-side transition is
    `pending`+`unpaid` → `confirmed`+`paid`, exactly once. Verified by hand:
    forging `total` → `permission denied`; jumping straight to `shipped` →
    `invalid payment transition`; repeating the transition on an
    already-paid order → `order is no longer pending payment`.
- **`app/checkout/page.tsx`** — receipt upload field and the
  `payment-uploads` storage call are gone. On success it now does
  `router.push(`/payment/${orderId}`)` instead of showing an inline
  confirmation.
- **New `app/payment/[orderId]/page.tsx`** — interstitial: fetches the order
  (RLS-scoped, so a stranger's order id 404s as "not found"), shows the
  total, then:
  - **Real mode** (`NEXT_PUBLIC_PAYPAL_ME_URL` set): builds
    `${url}/${total.toFixed(2)}`, auto-redirects there after ~2.5s (confirmed
    against the real paypal.com in testing), plus a manual "Continue to
    PayPal" link and an always-visible "I've paid — return to store" button
    → `/payment/return?orderId=<id>`.
  - **Demo mode** (env var unset — the current local default): no external
    redirect; shows a clearly-labeled "Simulate Payment (Demo)" button
    instead, same destination.
  - An order that's already `paid` shows an "Already Paid" state instead of
    re-prompting.
- **New `app/payment/return/page.tsx`** — guards signed-out visitors (redirect
  to `/login?next=...`), then updates the order to
  `payment_status='paid', status='confirmed'` via the SDK and shows a success
  screen linking to `/profile`. Treats "already paid" (trigger rejects the
  repeat update) as success, not an error, so a double-click or back-button
  revisit doesn't look broken.
- **`app/profile/page.tsx`** — status tracker vocabulary updated to
  `pending → confirmed → shipped → delivered`; added a paid/unpaid badge per
  order; unpaid orders get a "Complete Payment" link back to
  `/payment/<id>`.

### Known limitation — PayPal.me confirmation is trust-based, by design

PayPal.me has **no server-side webhook or callback**. The "I've paid — return
to store" / "Simulate Payment" button is the only signal the app gets that
payment happened — a user could click it without actually paying, and the DB
would record `paid` anyway. This is a deliberate, documented tradeoff of
using PayPal.me specifically (not a bug), not something fake verification
logic was added to paper over. If real payment verification is needed later,
that means moving off PayPal.me to PayPal's real Orders/Checkout API (or
another provider with server-side webhooks) — a separate, larger change.

### Verified (Playwright E2E against `npm run start`, real InsForge backend)

Both flows tested with throwaway `haven-paypal-*@example.com` accounts
(email-verified via CLI since disposable test addresses can't receive real
mail — this is unrelated to SMTP, see the correction further down; accounts
+ their cascaded orders were deleted after testing):

- **Demo mode** (no env var): login → add to cart → checkout → order
  `pending`/`unpaid` in DB → payment interstitial → Simulate Payment →
  return page confirms → DB shows `confirmed`/`paid` → `/profile` shows the
  `Paid` badge and `CONFIRMED` tracker state.
- **Real mode** (temporarily set `NEXT_PUBLIC_PAYPAL_ME_URL` to a fake handle
  for the test, reverted after): same flow, plus confirmed the PayPal link
  is built correctly (`https://paypal.me/haventest/148.00`) and that the
  auto-redirect actually fires (landed on real paypal.com in the test
  browser).
- DB-level tampering checks (see migration section above) run directly
  against a pending test order via the SDK as an authenticated user, not
  just eyeballed — all three attack attempts correctly rejected.

`npm run build` is clean with the env var unset (current repo state — demo
mode is what this runs in locally until a real PayPal.me handle is set in
`.env.local`, which was intentionally **not** done as part of this pass).

### Not done in this pass

- **Deployment.** Handled in a later pass (see the deployment section up
  top) — `NEXT_PUBLIC_PAYPAL_ME_URL` stayed unset there too, so production
  runs in the same demo mode as local until a real handle is provided.
- ~~SMTP still isn't configured~~ — turned out to be wrong; see the
  correction further down.

## Where things stand

**Frontend**: a complete Next.js (App Router) + TypeScript fashion ecommerce
site, brand "HAVEN", catalog pivoted to Islamic/modest wear (abayas, hijabs,
jilbabs, thobes, kanduras, jubbahs, prayer wear, accessories). No Tailwind —
hand-written CSS design system in `app/globals.css`.

**Backend**: a real InsForge backend is now wired in (this was previously
100% mock data). Project name **haven**, linked via `.insforge/project.json`
and `.env.local` (both already git-ignored). Free tier, currently near-zero
usage — nowhere close to any limit (500MB DB / 1GB storage / 5GB bandwidth
caps).

Everything below was built and **verified working end-to-end** with a real
Playwright-driven browser test (signup → verify → login → browse DB-backed
products → add to cart → checkout with receipt upload → real order created
→ order shows on profile with correct status → sign out → guest cart still
works). Two real bugs were found and fixed during that testing (see below).

## What changed (backend integration pass)

- **Database** (3 tables, RLS on all, created via `migrations/`):
  - `products` — public read-only, seeded with the 20 current catalog items
    (source of truth for names/prices/descriptions is still `lib/data.ts`
    BASE_PRODUCTS; the DB copy has images pointing at InsForge storage
    instead of Unsplash).
  - `carts` — one row per (user_id, product_id, size), RLS restricts to
    `auth.uid() = user_id`.
  - `orders` — item/price snapshot in `items` jsonb, status
    pending→paid→shipped→delivered (default `pending`), RLS lets a user
    insert/read only their own rows.
- **Storage**: `product-images` (public, holds the 20 product photos) and
  `payment-uploads` (private, holds checkout receipt uploads).
- **New file** `lib/insforge.ts` — the single SDK client (`insforge`), plus
  `AUTH_CHANGED_EVENT` / `notifyAuthChanged()` / `getCurrentUserOnce()` for
  cross-component auth-state syncing (no separate auth context/provider was
  added — components check auth directly and listen for that event).
- **`lib/api.ts`** — same exported functions as before
  (`getProducts`/`getProductById`/`getFeatured`/`getNewArrivals`/
  `getTrending`/`getRelated`/`getSubcategories`), now backed by a real fetch
  from the `products` table instead of the in-memory array. Pages didn't
  need to change.
- **`lib/store.tsx`** — cart is localStorage-only for guests (unchanged
  behavior), and additionally syncs to the `carts` table for signed-in
  users (loads from DB on login, write-through on every mutation).
- **`components/Navbar.tsx`** — account icon goes to `/profile` (with a
  small green dot) when signed in, `/login` otherwise.
- **`app/login/page.tsx`** — real signup/signin. Email verification is ON
  or InsForge (code-based, 6 digits) — signup shows a "check your email"
  code-entry step calling `auth.verifyEmail()`.
- **`app/checkout/page.tsx`** — dummy card fields replaced with a payment
  receipt upload (image/PDF) to the `payment-uploads` bucket. Requires
  sign-in (orders are user-scoped) — unauthenticated visitors get sent to
  `/login?next=/checkout`. Places a real row in `orders` and shows the real
  order id + `pending` status on confirmation.
- **New `app/profile/page.tsx`** — signed-in user's email, sign-out, and
  order history with a pending→paid→shipped→delivered status tracker per
  order. Redirects to `/login?next=/profile` if not signed in.
- **`CLAUDE.md`** — updated with a "Backend (InsForge)" section documenting
  the tables/RLS/SDK conventions.

## Correction — email verification actually works for real users (previous notes below were wrong)

Earlier notes in this file claimed verification codes couldn't be delivered
because `auth.smtp.enabled = false` (no *custom* SMTP provider configured),
and that real signups would get stuck on the "enter your code" screen. That
was wrong — confirmed 2026-08-29 with a screenshot of a real delivered
email: a genuine signup (`areebamahmood032@gmail.com`) received "724319 is
your verification code" from `haven <noreply@insforge.dev>`, and that
account is fully signed in and using `/profile` today. So `auth.smtp.enabled
= false` means no *custom* provider is set, not that verification emails
don't send — InsForge evidently has a default/platform sender
(`noreply@insforge.dev`) that delivers them regardless. The
throwaway-test-account workaround (marking `email_verified` via
`npx @insforge/cli db query`) used throughout this project's testing was
never actually necessary for real users — it was only ever needed because
disposable `@example.com` test addresses in automated E2E runs can't receive
real email at all, not because delivery itself was broken.

No action needed here — signup → verify → login works end-to-end for real
users today, as-is.

## Two bugs found + fixed during testing (already fixed, just documenting)

1. `next.config.ts` only allowlisted `images.unsplash.com` for `next/image`.
   Product photos now live on InsForge storage, so the domain is derived
   from `NEXT_PUBLIC_INSFORGE_URL` and added automatically.
2. `Navbar`, `lib/store.tsx`, and the checkout/profile auth guards each
   independently called `insforge.auth.getCurrentUser()` on mount. InsForge's
   refresh token is single-use, so concurrent calls raced and the losing
   call 401'd, intermittently reading as "signed out" right after sign-in.
   Fixed with a deduped `getCurrentUserOnce()` — everything now shares one
   in-flight check instead of firing several at once.

## Real user account confirmed intentional

`areebamahmood032@gmail.com` (first noticed mid-session, left alone since it
wasn't mine to touch) is confirmed to be the project owner's own real
account — verified via a real received verification email, and as of
2026-08-29 it placed a real order ($310, `confirmed`/`paid`) through the
live Vercel deployment. That's genuine end-to-end confirmation of the
deployed checkout/payment flow, independent of any test script.

## Not done yet (out of scope for this pass, by design)

- ~~Deployment~~ — done in a later pass, see the deployment section up top.
- ~~SMTP configuration~~ — turned out to already work; see the correction
  further up.
- The `scripts/import-listings.mjs` CSV pipeline still targets the local
  mock catalogue (`lib/generated-products.ts`) — it was never wired to the
  live `products` table. If you want CSV-imported listings to show up on
  the real site, that pipeline needs to be pointed at InsForge too.

## How to pick this back up tomorrow

```bash
source ~/.nvm/nvm.sh          # Node/npm aren't on PATH without this
cd /home/areeba/ecommerce-application-with-ai
npm run dev                   # or: npm run build && npm run start
```

Credentials are already in `.env.local` (git-ignored) — nothing to
reconfigure. The InsForge CLI is available via `npx @insforge/cli` and is
already linked to this project (`.insforge/project.json`).

Useful CLI commands if you need to inspect the backend:
- `npx @insforge/cli db query "SELECT * FROM products LIMIT 5;"`
- `npx @insforge/cli db query "SELECT * FROM orders;"`
- `npx @insforge/cli storage buckets`
- `npx @insforge/cli metadata` — quick health overview (auth config, DB
  size, storage size)

`playwright` is installed as a devDependency (used for the E2E test during
this session) — safe to keep or remove, it's dev-only and not shipped.
