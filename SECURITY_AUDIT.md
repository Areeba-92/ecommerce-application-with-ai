# Security Audit — HAVEN (portfolio e-commerce app)

**Date:** 2026-08-30 · **Finding 1 fixed 2026-09-23**
**Scope:** Read-only audit of the live codebase (auth, RLS/database authorization, admin
surfaces, API routes, e-commerce logic, SMTP, file uploads, CORS/headers, dependencies).
The audit itself changed no code. The CRITICAL finding below has since been fixed (see
its status block), along with a related payment-bypass hole discovered during that work.

> **Update 2026-10-04 — the app now has one server-side admin surface.** Account
> deletion added `app/api/account/delete/route.ts`, the first API route, and the first
> use of the admin key (`INSFORGE_API_KEY`) outside the CLI. Statements below that say
> "no API routes exist" or "no admin surface exists" were true on 2026-08-30 and are
> annotated where they no longer hold. See **"Account deletion route (2026-10-04)"**
> at the end of this file for its review.

---

## 🔴 CRITICAL — Fix Immediately

### 1. Order price/total is entirely client-supplied and never re-validated server-side

> **STATUS: FIXED 2026-09-23** — `migrations/20260923151447_enforce-order-integrity.sql`
> and `migrations/20260923151851_harden-order-integrity-trigger.sql` add a
> `BEFORE INSERT` trigger (`orders_enforce_integrity`) that discards every number the
> client sends and recomputes each line from `products.price`, then recomputes
> `subtotal`, `shipping` and `total`. Verified against the live backend as a real
> authenticated user: a forged `price: 0.01` is stored at the true catalogue price, and
> a forged `total` is overwritten. Details below are the original finding, kept for the
> record.

- **Vulnerability:** `app/checkout/page.tsx` inserts `items[].price`, `subtotal`,
  `shipping`, and `total` directly from client-side cart state (`useCart()`) into the
  `orders` table. The only RLS check on `orders_insert_own`
  (`migrations/20260829063025_create-core-tables.sql:56-57`) is `auth.uid() = user_id`
  — nothing checks that `items[].price` matches the live `products.price`, or that
  `total` is actually `subtotal + shipping`.
- **Location/file:** `app/checkout/page.tsx:67-95`,
  `migrations/20260829063025_create-core-tables.sql:56-57`
- **Why it's dangerous:** The `orders` row is the permanent financial record of what a
  shopper owes. Before the fix that number could be anything the browser sent.
- **How an attacker could exploit it:** Add a real item to cart, open devtools, and
  either edit the in-memory cart state or call
  `insforge.database.from("orders").insert([...])` directly with `price: 0.01` (or
  `total: 1`) before submitting. RLS let it through because it only checked ownership,
  not value.
- **Fix applied:** a `BEFORE INSERT` trigger that recomputes prices from `products`
  rather than trusting the client — the Postgres-trigger option recommended below, built
  to mirror the existing `guard_order_payment_update` pattern. Tampered values are
  silently corrected rather than rejected, so a stale cart (a legitimate price change)
  still checks out; `app/payment/[orderId]/page.tsx` re-reads `total` from the database
  and shows it before any money moves.

### 2. A client could insert an order already marked paid (found 2026-09-23)

> **STATUS: FIXED 2026-09-23** — same trigger. **This was not in the original audit.**

- **Vulnerability:** `authenticated` held a table-wide INSERT grant on `orders`, and
  `orders_insert_own` checks only `auth.uid() = user_id`. Nothing stopped a client from
  inserting a row with `status='confirmed', payment_status='paid'` — a complete payment
  bypass. The existing `orders_guard_payment_update` trigger never saw it, because that
  guard only fires on UPDATE.
- **Why it mattered more than finding 1:** finding 1 got an attacker cheap goods;
  this one got them free goods, with an order that looked legitimately paid.
- **Fix applied:** the same `BEFORE INSERT` trigger force-sets `status='pending'`,
  `payment_status='unpaid'`, `payment_method='paypal'`, nulls `payment_receipt_url`
  and pins `created_at` to `now()`, so a client can neither pre-pay nor backdate its
  own order. Verified: an insert claiming `confirmed`/`paid` is stored `pending`/`unpaid`.
- **Related hardening:** the unused `DELETE` grant on `orders` was revoked from `anon`
  and `authenticated`. It was already inert (no DELETE policy exists), so this removes
  dead surface rather than closing a live hole.

No other CRITICAL findings — RLS, auth, and admin surfaces all came back clean (see
below).

**Other input validation added by the same trigger** (each verified rejected as a real
authenticated user): unknown `productId` (rejected explicitly rather than silently
dropped from the order), zero/negative/fractional/non-numeric quantity, quantity above
999, empty or non-array `items`, a size the product doesn't offer, and more than 50 line
items.

---

## 🟠 HIGH — Fix Before Calling It Production-Ready

*(None found beyond the item above — nothing else rose to this level for a
portfolio-scope app.)*

---

## 🟡 MEDIUM — Recommended

### 2. No security headers configured (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

> **STATUS: FIXED 2026-10-05** — `next.config.ts` `headers()` now sends CSP (incl.
> `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff` and
> `Referrer-Policy: strict-origin-when-cross-origin`. `script-src` still allows
> `'unsafe-inline'` (Next.js inline bootstrap; removing it needs nonces).

- **Location/file:** `next.config.ts` (no `headers()` export)
- **Why it matters:** Confirmed via `curl -I` on the live site — only
  `strict-transport-security` is present (a Vercel default); no CSP, no clickjacking
  protection, no MIME-sniffing protection.
- **Exploit scenario:** Without `X-Frame-Options`/`frame-ancestors`, the site could be
  iframed by a malicious page for clickjacking. Without CSP, if an XSS vector is ever
  introduced later, there's no defense-in-depth layer to blunt it. (No actual XSS
  vector was found in this codebase — no `dangerouslySetInnerHTML` anywhere — so this
  is a hardening gap, not an active hole.)
- **Recommended fix:** Add a `headers()` block in `next.config.ts` — at minimum
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a basic CSP scoped to `self`
  + the InsForge domain + Google Fonts.

### 3. Weak password policy

> **STATUS: FIXED 2026-10-05** — `min_length = 8` applied live via
> `insforge config apply`; the signup form checks the same. Verified: a 7-character
> password is rejected by the auth API itself. No complexity rules were added.

- **Location/file:** `insforge.toml` → `[auth.password]`: `min_length = 6`, no
  uppercase/lowercase/number/special-char requirement.
- **Why it matters:** 6-character, no-complexity passwords are brute-forceable if an
  attacker ever got a hash (not currently exposed anywhere found) or via online
  guessing if InsForge doesn't rate-limit login attempts platform-side.
- **Recommended fix:** Raise `min_length` to 8-10 and enable at least one complexity
  requirement via `npx @insforge/cli config` — this is a config change, not a code
  change.

---

## 🟢 NORMAL / SAFE

Genuinely solid points worth naming explicitly, since several map directly to the
questions this audit was scoped to answer:

- **Auth is 100% delegated to InsForge** — `lib/insforge.ts` and `app/login/page.tsx`
  only ever call `insforge.auth.*`. No parallel/duplicate auth logic, no custom JWT
  handling, no client-side "trust me, I'm logged in" flags.
- **Page-level auth redirects (checkout, payment, profile) are UX-only, and that's
  fine** — they're client-side `getCurrentUserOnce()` checks that just redirect to
  `/login`. If someone bypassed that redirect, they'd still hit RLS on every actual
  data call, so the real security boundary is the database, not the frontend. This is
  the correct pattern.
- **RLS is correctly scoped everywhere checked:**
  - `carts_own_rows`: owner-only for all operations.
  - `orders_select_own` / `orders_insert_own`: owner-only; **User A cannot read, list,
    or enumerate User B's orders or cart** — verified the policy logic
    (`auth.uid() = user_id` returns NULL, not true, for both an unauthenticated caller
    and a mismatched user, so rows are simply invisible).
  - `orders` has **no DELETE policy at all** — nobody, including the owner, can delete
    order history via the client. Good for auditability. *(Still true. Since
    2026-10-04 a user's orders are removed server-side when they delete their account,
    via the existing `ON DELETE CASCADE` — not through any client DELETE.)*
  - `products` has **only a public SELECT policy** — no INSERT/UPDATE/DELETE policy
    exists for any role, so even a fully authenticated normal user cannot create
    products, change prices, or delete listings. There is no admin surface in this app
    at all (grepped for `admin`/`role`/`isAdmin` — nothing exists), so there's nothing
    to bypass.
  - The `orders` payment-transition trigger (`guard_order_payment_update`) is a
    genuinely well-built guard: column-level `GRANT` restricts client `UPDATE` to just
    `payment_status`/`status`, and the trigger enforces a one-way, one-shot
    `pending`/`unpaid` → `confirmed`/`paid` transition, exempting only `project_admin`
    (CLI/dashboard). This correctly prevents a user from re-opening or re-confirming an
    order, or touching `total`/`items`/`user_id` after placement.
- **Unauthenticated users cannot insert/modify anything** — checkout requires sign-in
  before any `orders` insert is attempted; RLS would reject an anonymous insert
  regardless (`auth.uid()` is NULL).
- **No secrets in source or Git history.** `.env.local` was never committed (verified
  via `git log`); only `NEXT_PUBLIC_INSFORGE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY`
  are used client-side, both of which are meant to be public (RLS is the real gate, not
  key secrecy). `.insforge/project.json` does contain a real admin API key, but it's
  correctly gitignored and has never been tracked.
- **SMTP: nothing to leak.** `insforge.toml` shows `auth.smtp.enabled = false` with
  every custom-SMTP field (`host`, `username`, `sender_email`) as an empty string —
  there are no custom SMTP credentials anywhere in this project to expose. Delivery
  happens through InsForge's own platform sender, entirely outside this app's secret
  surface. A `min_interval_seconds = 60` resend cooldown is already enforced
  platform-side.
- **No file upload code paths exist.** Grepped the whole app for `storage.` usage —
  zero hits. The `payment-uploads` bucket exists but is dead/unused (checkout was
  switched to PayPal, per CLAUDE.md); nothing in the client can read/write it.
- **No SQL injection / XSS vectors found.** No raw SQL string-building anywhere (all
  queries go through the InsForge query builder), no `dangerouslySetInnerHTML` in the
  codebase, search-query params flow through React's auto-escaping.
- **No API routes / server actions / middleware exist at all** — this is a pure client
  + InsForge-REST architecture, so RLS genuinely is the entire authorization surface,
  and all of it was audited above. *(Superseded 2026-10-04: one route,
  `/api/account/delete`, now exists — reviewed at the end of this file.)*
- **`npm audit` — 0 vulnerabilities** across the full dependency tree.

---

## Portfolio Assessment

| Area | Status |
|---|---|
| Authentication | **SAFE** |
| Database authorization (RLS) | **SAFE** |
| Admin authorization | **SAFE** (one server-only admin surface since 2026-10-04 — self-scoped account deletion, reviewed below) |
| API security | **SAFE** (one route, `/api/account/delete`; everything else is InsForge/RLS) |
| Secrets | **SAFE** (admin key is server-only — `.env.local` locally, a Vercel Secret in production) |
| E-commerce logic | **SAFE** (server-recomputed totals since 2026-09-23; payment status admin-only since 2026-10-05) |
| SMTP | **SAFE** |
| File uploads | **SAFE** (N/A — no upload code path exists) |
| Web security (headers) | **SAFE** (CSP, X-Frame-Options, nosniff, Referrer-Policy since 2026-10-05; CSP still allows inline scripts) |
| Payment verification | **OPEN — demo only** (PayPal.me, manual admin check; no PayPal Orders API / webhook) |

---

## Top Things To Fix

1. ~~**Server-validate order totals/prices at insert**~~ — **DONE 2026-09-23.** Also
   closed a payment-bypass hole found during the work (finding 2 above).
2. ~~**Add security headers**~~ — **DONE 2026-10-05.**
3. ~~**Tighten the password policy**~~ — **DONE 2026-10-05** (`min_length` 8).
4. **Real payment verification** — replace the PayPal.me + manual admin check with
   the PayPal Orders API (sandbox first), server-side capture and a signature-verified,
   idempotent webhook. Until then "paid" is set by an admin by hand.
5. **Decide account-deletion retention** — deleting an account hard-deletes its
   orders, including paid/shipped ones (see "Account deletion — demo behaviour").
6. *(Optional, not urgent)* Decide what to do with the unused `payment-uploads` bucket
   — either delete it or leave it, since it's dead weight either way, not a live risk.
7. *(Optional, not urgent)* Consider whether signup error messages from InsForge leak
   account-enumeration info ("email already registered" vs generic) — this is platform
   behavior, not app code, so it's a "know about it" item rather than something to fix
   here.

**Update 2026-09-23:** findings 1 and 2 are fixed and verified. Items 2, 3, 4 and 5 in
the list above are still open — none is a live hole, and each is a hardening or
housekeeping item.

**Update 2026-10-05:** items 2 and 3 are done. Items 4 and 5 were added from the
2026-10-05 audit (`SECURITY_AUDIT_2026-10-05.md`) and are the real remaining work;
6 and 7 are unchanged housekeeping.

Verification for the fix was done as a real authenticated user through the SDK, not via
the CLI: `npx @insforge/cli db query` runs as `project_admin`, which the trigger exempts
by design, so CLI-based attack attempts pass straight through and prove nothing. Anyone
re-testing this should use a signed-in session.

---

## Account deletion route (2026-10-04)

`POST /api/account/delete` (`app/api/account/delete/route.ts`) is the only code path
that holds the admin key, so it was reviewed on its own:

- **Identity comes only from the caller's token.** The route reads
  `Authorization: Bearer <access token>`, resolves it with InsForge
  (`GET /api/auth/sessions/current`) and deletes *that* user. It ignores the request
  body entirely — there is no user ID parameter to tamper with, so a user can only ever
  delete themselves.
- **No CSRF exposure.** Auth is a bearer header the page attaches explicitly, not a
  cookie the browser sends automatically, so a third-party site cannot trigger it.
- **Key handling.** `INSFORGE_API_KEY` has no `NEXT_PUBLIC_` prefix, so Next.js never
  bundles it for the browser; it is read only in this route. It lives in the
  gitignored `.env.local` and as a **Secret** variable on the Vercel Production
  environment. Verified it is absent from every committed file.
- **Fails closed.** If the key is missing the route returns 500 before reading the
  token. If deleting any receipt fails, it stops *before* deleting the user, so a retry
  can finish the job rather than leaving orphaned files.
- **Bug found and fixed during testing:** the first version also required
  `user.role === "authenticated"`, copied from the REST docs example. The real
  response has no `role` field, so every legitimate request was rejected with
  "session expired" — a fail-safe bug (nothing was deleted), now removed.
- **Verified:** unauthenticated and forged-token requests return 401 on the live
  site; a real signed-in deletion removed the auth user with no orphaned cart or order
  rows left behind.
- **Data decision:** orders are **deleted**, not anonymized (`orders.user_id` is
  `NOT NULL … ON DELETE CASCADE`; anonymizing would need a schema change). This trades
  away sales history for a clean erasure.
- **Not added:** rate limiting (a caller can only delete their own account once) and
  re-authentication (the modal requires typing `DELETE`, not the password). Requiring
  the password again would be the next hardening step if this ever matters.

---

## Payment status is admin-only (2026-10-05)

Fixes finding C1 of `SECURITY_AUDIT_2026-10-05.md`: any signed-in user could set
their own order to `paid`/`confirmed` without paying.

- **Rule:** the browser/client must NEVER be able to set `payment_status = 'paid'`
  or `status = 'confirmed'`. Only an admin (`project_admin` — InsForge dashboard or
  `db query`) does that, after verifying the payment in PayPal.
- **Enforcement** (`migrations/20261005171041_lock-payment-status-to-admin.sql`):
  `authenticated` has no UPDATE grant on `payment_status`/`status`; its only
  UPDATE grant is `payment_reported_at`. `orders_guard_payment_update` lets a user
  report payment once, on their own `pending`/`unpaid` order, stamps server time,
  and rejects any status change. A separate insert trigger clears
  `payment_reported_at` on client inserts. `orders_enforce_integrity` (pricing) is
  unchanged.
- **Verified** as real signed-in users via the SDK: setting `paid` or `confirmed`
  → `permission denied`; a second report → rejected; another user cannot report or
  read the order; the admin can still mark it paid.

---

## Phase 2 hardening (2026-10-05)

- **Abandoned orders expire** (`migrations/20261005172821_expire-abandoned-orders.sql`):
  pending, unpaid, unreported orders older than 24h are refused a payment report
  by the guard trigger and are flipped to `cancelled` by `expire_stale_orders()`
  (SECURITY DEFINER, own orders only) when the user opens their profile or payment
  page. No cron.
- **Contact / shipping validated server-side**
  (`migrations/20261005172825_validate-order-contact-and-address.sql`): expected
  keys only, required strings, max lengths, valid email and phone, no `<`, `>` or
  control characters. Closes audit finding M4. Pricing trigger untouched.
- **PayPal.me link pins the currency** (`…/<total>USD`). Still a demo /
  manual-verification flow, not verified payment processing (audit H1 remains
  open until a PayPal Orders API + verified webhook exists).

## Account deletion — demo behaviour (documented 2026-10-05)

Reviewed, not changed. This is acceptable for a student demo and **would need a
decision before handling real customers**:

- `POST /api/account/delete` deletes the caller's auth user (identity from their
  own token only) after removing their `payment-uploads` objects.
- `carts` and **`orders` are hard-deleted** by `ON DELETE CASCADE` on `user_id` —
  including paid, confirmed or shipped orders. There is no retained sales or
  fulfilment record and nothing blocks deletion while an order is in progress.
  A real shop would need to keep (anonymised) order records for accounting and
  delivery.
- Re-registering the same email creates a new user id; because the old rows were
  deleted, nothing from the old account can attach to the new one.
- No re-authentication: an open session plus typing `DELETE` is enough.
