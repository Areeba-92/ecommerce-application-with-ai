# HAVEN Security Audit

## Status (updated 2026-10-05, after the Phase 1 and Phase 2 fixes)

The findings below are kept exactly as originally written. This table records what
has happened to each one since. Fixes were verified as real signed-in users through
the SDK and in a browser; see `SECURITY_AUDIT.md` for the enforcement details.

| Finding | Status | Notes |
|---|---|---|
| C1 Browser can mark own order paid | **FIXED** | Client can only report payment (`payment_reported_at`); `paid`/`confirmed` are admin-only |
| H1 PayPal.me: no verification, no currency | **OPEN** (currency part **FIXED**) | Link now ends in `USD`. Real verification (Orders API + webhook) not built |
| H2 Replayed callbacks | **OPEN** | Applies once H1's webhook exists; not a live bug today |
| M1 Login open redirect | **FIXED** | `lib/safe-redirect.ts`, unit-tested in `tests/` |
| M2 Cart left in localStorage after sign-out | **FIXED** | Cleared on sign-out; signed-in carts no longer mirrored to localStorage |
| M3 Account deletion deletes order history | **DOCUMENTED / ACCEPTED FOR DEMO** | Retention decision still needed before real customers |
| M4 Contact / shipping not validated | **FIXED** | `orders_validate_contact` trigger |
| M5 No security headers | **FIXED** | CSP still allows inline scripts (Next.js) |
| M6 Weak password policy | **FIXED** | `min_length = 8`, enforced by the auth API |
| L1 Product write grants | **FIXED** | INSERT/UPDATE/DELETE revoked from `anon`/`authenticated` |
| L2 No cart quantity constraint | **FIXED** | `CHECK (quantity BETWEEN 1 AND 999)` |
| L3 Raw DB error messages shown | **OPEN** (partly) | Payment return page now shows friendly text; checkout still shows the trigger's message (deliberately readable) |
| L4 Pending orders never expire | **FIXED** | Unreported unpaid orders expire after 24h (lazy, no cron) |
| L5 Guest cart discarded on sign-in | **OPEN** | Reliability, not security |
| L6 No re-auth for account deletion | **DOCUMENTED / ACCEPTED FOR DEMO** | |
| L7 Signup email enumeration | **OPEN** (unverified) | Platform behaviour |

Also fixed during the same work, outside this list: the signed-out `401` from
`/api/auth/refresh` on every page load, and the 4 existing lint errors.

---

**Date:** 2026-10-05. Read-only audit: code and config were read, nothing was changed, and no payments were made.

**How things were checked:** the migrations, all auth, cart, checkout, payment and deletion code, `insforge.toml` and `.env.local` (variable names only, not values) were read. Read-only queries were run against the live database to list its policies, grants, triggers, constraints and RLS flags. No live attack tests were run as a signed-in user. Points that depend on InsForge platform behaviour that couldn't be seen are marked **unverified**.

Previous audit: `SECURITY_AUDIT.md` (2026-08-30, updated 2026-09-23 and 2026-10-04).

---

## Critical Findings

### C1. Anyone signed in can mark their own order "paid" without paying
- **Severity:** Critical if real goods are ever shipped. In demo mode it's expected behaviour.
- **Location:** `app/payment/return/page.tsx:41-45`, and the `guard_order_payment_update` trigger in `migrations/20260830041706_add-paypal-payment-to-orders.sql`
- **What is wrong:** The return page sends `update({payment_status:'paid', status:'confirmed'})` from the browser. Neither the database nor PayPal checks that any money arrived. The same request can be sent straight to the InsForge REST API, or a user can just visit `/payment/return?orderId=<own id>`. The trigger only enforces that the change happens once and only from pending/unpaid.
- **Why it matters:** "Paid" means nothing. If anyone ships orders based on `payment_status`, they can be defrauded at no cost. CLAUDE.md calls this "trust-based by design", but the site is live and public.
- **Recommended fix:** Stop letting the browser grant itself "paid":
  - Remove `payment_status` and `status` from the `authenticated` UPDATE grant.
  - Have the return page set something like `payment_claimed = true` instead.
  - Mark orders paid only from the dashboard after checking the PayPal account, **or** move to the PayPal Orders API with a server-side capture route and a verified webhook (see H1).
- **How to test:** As a signed-in user, call `insforge.database.from('orders').update({payment_status:'paid',status:'confirmed'}).eq('id', ownOrderId)` through the SDK. It should be rejected. Then check that only the admin (project_admin) or the verified webhook can mark an order paid.

---

## High-Risk Findings

### H1. PayPal.me has no callback, so amount, currency and payment status are never checked
- **Severity:** High
- **Location:** `app/payment/[orderId]/page.tsx:52-55`
- **What is wrong:**
  - **Live or sandbox:** PayPal.me links are always **live**, because PayPal.me has no sandbox mode. Locally, `NEXT_PUBLIC_PAYPAL_ME_URL` isn't set in `.env.local`, so the app runs in "Simulate Payment" demo mode. Whether it is set on Vercel Production couldn't be checked (Vercel CLI not installed). **Unverified.**
  - **No callback:** there's no webhook or IPN handler, and no server confirms the amount, order ID or transaction ID.
  - **Amount:** it comes from the database total, which is good. The user can still edit the amount on PayPal's page before paying.
  - **Currency:** the link sends no currency. The site shows USD (`lib/format.ts`), but PayPal.me charges in the recipient account's default currency unless a currency is added to the URL (e.g. `/49.95USD`).
  - **Order reference:** the order ID isn't attached to the payment, so a PayPal payment can't be matched to an order reliably.
- **Why it matters:** Payments can't be reconciled with orders. Underpayment or the wrong currency would go unnoticed.
- **Recommended fix:** For the demo, add the currency to the link (`/${total}USD`) and put the order ID somewhere the payer copies into the note. For anything real, use the PayPal Orders API (sandbox first):
  - Create the PayPal order on the server from the database total, with `custom_id = order.id`.
  - Capture it on the server.
  - Verify the webhook signature (`verify-webhook-signature`).
  - Check that amount, currency and `custom_id` match.
  - Make the paid transition idempotent by putting a unique constraint on a stored `paypal_capture_id`.
- **How to test:**
  - Webhook with a bad signature → rejected.
  - Wrong amount or currency → order stays unpaid.
  - The same webhook replayed twice → one payment record, no error.

### H2. Duplicate or replayed callbacks: safe now, will matter after a fix
- **Severity:** High as a requirement for any H1 fix. It's not a live bug today.
- **Location:** `guard_order_payment_update`
- **What is wrong:** Nothing is wrong today. Orders are only created at checkout, never by callbacks, and the guard rejects a second pending→paid change. The return page then shows "success" if the order is already paid. A future webhook needs the same one-time guarantee keyed on PayPal's transaction ID.
- **Recommended fix and test:** Same as H1: a unique `paypal_capture_id`, plus a test that replays the webhook.

---

## Medium-Risk Findings

### M1. Open redirect via `?next=` on the login page
- **Location:** `app/login/page.tsx:38-41` (`router.push(next || "/profile")`)
- **What is wrong:** `next` comes straight from the URL and isn't validated. `/login?next=https://evil.example` sends the user off-site right after a real login. That's useful for phishing, e.g. a fake "session expired, re-enter your password" page.
- **Recommended fix:** Only allow values that start with `/` and not `//` or `/\`. Otherwise fall back to `/profile`.
- **How to test:** Try `next=https://example.com`, `next=//example.com` and `next=/\example.com`. All three should land on `/profile`. `next=/checkout` should still work.

### M2. Signing out leaves the previous user's cart in localStorage
- **Location:** `lib/store.tsx:121-124` (the cart is written to localStorage even for signed-in users), and `handleSignOut` in `app/profile/page.tsx:193-197` (doesn't clear it). Account deletion does clear it (`profile/page.tsx:96`).
- **What is wrong:** After sign-out, `loadForCurrentUser` reads localStorage and shows the signed-out user's cart to the next guest on the same browser.
- **Why it matters:** On a shared device, the next person sees what the previous user was buying. This comes from the client, not from the database.
- **Recommended fix:** Remove `haven-cart` on sign-out, or only write it to localStorage for guests.
- **How to test:** Sign in, add an item, sign out, reload. The cart should be empty.

### M3. Deleting an account destroys order records, even paid or shipped ones
- **Location:** `orders.user_id … ON DELETE CASCADE` (verified live), and `app/api/account/delete/route.ts`
- **What is wrong:** A user with a `confirmed` or `shipped` order can delete their account, and the order row disappears, including the shipping address needed to deliver it.
- **Why it matters:** For a real shop that loses fulfilment and accounting records. Some record-retention rules also require keeping orders.
- **Recommended fix:** Either block deletion while orders are in progress, or anonymise instead: make `user_id` nullable with `ON DELETE SET NULL` and clear the contact and address once the order is delivered. This is an owner decision; the current behaviour is documented in `SECURITY_AUDIT.md`.
- **How to test:** Create an order, mark it confirmed with the admin key, then delete the account. Check the result matches the chosen policy.

### M4. Contact and shipping fields are not validated on the server
- **Location:** `orders.contact` and `orders.shipping_address` (unchecked jsonb), and `app/checkout/page.tsx` (only checks the fields aren't empty)
- **What is wrong:** A direct SDK insert can store any JSON of any size: huge payloads, non-string types, or an invalid email. React escapes these values on display, so it isn't an XSS issue, but it is storage abuse and bad data. There's also no rate limit, so a script can create an unlimited number of pending orders.
- **Recommended fix:** In `enforce_order_integrity`, accept only the expected keys, require them to be strings with length limits, and reject anything else. Also consider a cap on pending orders per user, e.g. 20.
- **How to test:** Insert through the SDK with `contact` set to a 1 MB string, a nested object, or a missing `email`. Each should be rejected.

### M5. No security headers
- **Location:** `next.config.ts`
- **What is wrong:** There's no CSP, X-Frame-Options/`frame-ancestors`, `nosniff` or Referrer-Policy. Login and profile pages can be framed, which allows clickjacking. Already open in the 2026-08-30 audit.
- **Recommended fix:** Add `headers()` in `next.config.ts`.
- **How to test:** `curl -I` the live URL and check the headers are present.

### M6. Weak password policy
- **Location:** `insforge.toml` `[auth.password]`: `min_length = 6`, no complexity rules. The client check in `login/page.tsx:80` matches it.
- **Recommended fix:** Raise to 8+ characters and apply with `insforge config apply`. Update the client message to match.
- **How to test:** A 7-character password should be rejected by the API, not just by the form.

---

## Low-Risk Findings

### L1. `authenticated` has INSERT/UPDATE grants on `products`
- **Location:** live grants (verified)
- **What is wrong:** RLS is on and there's only a SELECT policy, so these writes are currently denied. The grants are still unnecessary: a future permissive policy written by mistake would make product prices editable by any user.
- **Recommended fix:** `REVOKE INSERT, UPDATE, DELETE ON products FROM anon, authenticated;`
- **How to test:** An SDK `update({price:0.01})` on a product should fail, before and after the change.

### L2. No CHECK constraints on `carts`
- **Location:** `carts` (live database has no CHECK constraints)
- **What is wrong:** `quantity` can be 0, negative or huge, and `size` can be anything. The cart can then show a negative subtotal. Checkout is still safe because the order trigger rejects these values, so this is a reliability issue only.
- **Recommended fix:** Add `CHECK (quantity BETWEEN 1 AND 999)`.
- **How to test:** An SDK insert of a cart row with `quantity:-5` should fail.

### L3. Raw database error messages are shown to users
- **Location:** `checkout/page.tsx:99-104` and `payment/return/page.tsx:71`
- **What is wrong:** Trigger messages like `unknown product: x` and `invalid size …` are shown as-is. Nothing sensitive leaks today, but a future database error could expose internals.
- **Recommended fix:** Map known messages to friendly text and fall back to a generic message.

### L4. Pending orders never expire
- **What is wrong:** Abandoned checkouts stay `pending` forever and still show "Complete Your Payment". The cart is cleared once the order is placed, so abandoning at the payment step loses the cart. The PayPal amount always comes from the database, so later price changes can't affect a pending order's amount.
- **Recommended fix:** Add a `cancelled` status. Expire pending orders by hand or when the profile page loads; there's no cron on the Hobby tier.

### L5. A guest's cart is discarded on sign-in
- **Location:** `lib/store.tsx:107-110`
- **What is wrong:** On sign-in, the database cart replaces the localStorage cart, so a guest's items are lost. Reliability problem, not a security one.

### L6. Account deletion has no re-authentication or rate limit
- **What is wrong:** A stolen or still-open session is enough to delete the account; the user only has to type `DELETE`.
- **Recommended fix:** Ask for the password again before deleting. Optional.

### L7. Signup error messages may reveal registered emails (unverified)
- **What is wrong:** Depends on the platform's signup messages, not tested live. Already listed in the previous audit.

---

## Existing Security Controls (verified from code and live database)
- **Pricing is enforced by the server:**
  - The `orders_enforce_integrity` BEFORE INSERT trigger (live) recomputes item prices, subtotal, shipping and total from `products`. It ignores the client's `name`/`price`.
  - It rejects unknown products, quantities that aren't whole numbers between 1 and 999, invalid sizes, and orders with more than 50 lines.
  - It forces `pending`/`unpaid`, `created_at = now()` and `receipt_url = NULL`, and sets `search_path`.
- **Order owner checks:** RLS is on for `products`, `carts` and `orders`; `anon` and `authenticated` can't bypass it. INSERT, SELECT and UPDATE on orders require `auth.uid() = user_id`. Users can't delete orders (no DELETE grant or policy). Users can only update `payment_status` and `status`, and the guard trigger allows only a single pending→paid change.
- **Cart isolation:** `carts_own_rows` covers every command with `auth.uid() = user_id` in both USING and WITH CHECK.
- **Account deletion route:** identity comes only from the user's token, checked against InsForge, and the request body is ignored. It uses a Bearer header rather than cookies, so cross-site request forgery isn't possible. It stops on error before deleting the user, and the admin key is server-only.
- **Cascades:** carts and orders cascade on user deletion (verified live). Re-registering the same email creates a new user ID, so old data can't reattach. Follows from the schema; not tested live.
- **Secrets:** `.env.local` and `.insforge/project.json` are gitignored. The only browser-exposed variables (`NEXT_PUBLIC_`) are the InsForge URL, the public anon key and the PayPal.me link, all designed to be public. `INSFORGE_API_KEY` is only used in the deletion route.
- **Email verification:** `require_email_verification = true` with a code. Invalid, expired and reused codes are handled by InsForge, not the app; the platform's behaviour is unverified.
- **No injection risk found:** no `dangerouslySetInnerHTML`, no hand-built SQL.

## Missing Tests
*(Correction 2026-10-05: the repository now has a small unit test suite — `tests/`,
run with `npm test` — covering the login redirect guard. The database and browser
security checks below were run as one-off scripts and are not in the repository.)*

At the time of this audit there were **no automated tests at all**: no test script, framework or test folder. All earlier checks were run by hand (recorded in `SECURITY_AUDIT.md`). Missing:
- Signed-in SDK tests for the order trigger. They have to run as a real user, because the CLI runs as the exempt `project_admin`.
- Two-user isolation tests (A vs B).
- Tests for the payment transition.
- Tests for the deletion route: 401 with no token, 401 with a forged token, deleting yourself, cascade behaviour.
- Email verification edge cases.
- Tests for the open redirect.
- Tests that the cart is cleared on sign-out.
- A test that header changes are actually served.

## Recommended Fixes (summary)
1. C1: take "paid" out of the client's control.
2. M1: validate `next`.
3. M2: clear the cart on sign-out.
4. L1/L2: revoke the product grants and add cart CHECK constraints.
5. M4: validate contact and shipping fields in the trigger.
6. M5/M6: add headers and raise the password minimum.
7. M3: decide the deletion/retention policy.
8. H1/H2: move to the PayPal Orders API with sandbox and a verified webhook, if real payments are ever wanted.

## Recommended Test Cases
Use a Node script inside the project (e.g. `.scratch/`) that signs in two throwaway users (A and B) through the SDK, verified via the CLI as the existing scripts do.

**Isolation**
1. A runs `select` on orders, filtered by B's order ID → 0 rows.
2. A runs `update` on B's order (`payment_status`) → 0 rows affected.
3. A inserts an order with `user_id = B` → RLS rejects it.
4. A reads, updates and deletes B's cart rows by `user_id`/`id` → 0 rows each.
5. A inserts a cart row with `user_id = B` → rejected.
6. A posts to `/api/account/delete` with A's token and a body naming B → only A is deleted, and B's sign-in still works.
7. Deletion route with no token, a garbage token or an expired token → 401.

**Pricing and orders**

8. Insert with `price:0.01`, `total:1` → stored at the real price.
9. Unknown `productId` → error.
10. `qty` of -1, 0, 1.5, "2" or 1000 → error.
11. Invalid size → error.
12. 51 lines → error.
13. Insert with `status:'confirmed', payment_status:'paid'` → stored as pending/unpaid.
14. Backdated `created_at` → replaced with now.
15. Updating `total` or `items` → permission denied (column grant).
16. A second paid transition → rejected.

**Auth and verification**

17. Wrong code → error.
18. Code reused after success → error.
19. Code used after it expires → error.
20. A code from an older resend → error.
21. Many wrong guesses in a row → check for lockout or rate limiting.
22. Sign-in before verifying → refused.
23. Sign-out then refresh → the old access token is rejected.

**Deletion**

24. Delete with orders and cart rows → 0 rows left for that user ID.
25. Re-register the same email → empty orders and cart, new ID.
26. localStorage cart cleared.

**Frontend**

27. Build `.next/static` and grep for the admin key value and `INSFORGE_API_KEY` → no matches.

## Prioritized Implementation Order
1. **C1:** stop the browser from marking orders paid, or accept and document it explicitly as demo-only. Needs owner approval under CLAUDE.md's money rule.
2. **M1:** fix the open redirect (a few lines).
3. **M2:** clear the cart on sign-out (one line).
4. **Write the two-user isolation and trigger test script** (test cases 1–16), so later fixes are covered.
5. **L1 + L2:** one migration to revoke product grants and add cart CHECK constraints.
6. **M4:** validate contact and shipping fields in the trigger (touches order logic, so needs approval).
7. **M5 + M6:** security headers and password policy.
8. **H1 currency quick fix:** add `USD` to the PayPal.me amount.
9. **M3:** decide whether to retain or anonymise orders on deletion.
10. **H1/H2 full:** PayPal Orders API with sandbox, server capture, verified idempotent webhook. Only if real payments are planned.
11. **L3–L7:** polish.
