# HAVEN — Progress Notes

> **Naming note:** the brand was renamed on 2026-08-29, and on 2026-09-23 the
> old name was scrubbed from the entire project at the owner's request — the
> InsForge backend project was renamed to `haven` too. Every entry below now
> reads "HAVEN", including ones describing work done before the rename, where
> the strings at the time (throwaway test-account emails, the PayPal test
> handle, the verification-email sender name) literally used the old name.

> **Site is LIVE** at https://ecommerce-application-with-ai.vercel.app —
> last deployed **2026-10-04** (owner-triggered redeploy after adding the
> `INSFORGE_API_KEY` secret), and the deployed frontend, the repo and the
> database are all in sync as of that deploy.
> `VERCEL_PRIVACY.md` covers taking it private again.
>
> **Two things are knowingly unfinished — read these before doing anything
> else:** product prices are placeholders, and 11 demo women's products are
> still live. See "Where this stands" immediately below.

Read this first when picking the project back up. It covers what exists, what
was just built, what's known-broken/untested, and what to do next.

## Collection pages, nav/footer links, account deletion (2026-10-04)

### What changed

- **"View All" / footer links went to the wrong pages.** The homepage Trending
  "View All" was hardcoded to `/men`, Featured to `/women`, New Arrivals to
  `/women?sort=newest`; the footer had "Best Sellers" → `/men?sort=newest`. No
  listing page could filter by flag, so there was nowhere correct to point them.
  Added `getProducts({ collection: "featured" | "new" | "trending" })` (optional,
  backward compatible) and `app/collection/[type]/page.tsx` (anything else →
  404), reusing the existing grid, sort dropdown and styles. Footer "Best
  Sellers" is now **"Featured"** (there is no separate best-seller flag), and a
  "Trending" link was added.
- **"Home" appeared twice in the desktop nav.** Not a double render — the
  `/home-living` category link was labelled "Home" next to the real Home link.
  Now "Home & Worship", matching the mobile drawer.
- **Delete Account on `/profile`.** A Danger Zone + confirmation modal (confirm
  button disabled until `DELETE` is typed; loading and error states). The SDK has
  no self-delete, so `app/api/account/delete/route.ts` verifies the caller's
  token and uses the server-only `INSFORGE_API_KEY` to delete their
  `payment-uploads` objects and their auth user. Carts and **orders are
  deleted** (not anonymized) by the existing `ON DELETE CASCADE`. Afterwards the
  page signs out, clears the localStorage cart, redirects to `/` and toasts
  "Account deleted". Security review is appended to `SECURITY_AUDIT.md`.

### Bugs found while building it

- **Every delete failed with "session expired".** The route checked
  `user.role === "authenticated"`, taken from the REST docs' example response —
  the real `/api/auth/sessions/current` response has no `role` field. Caught by
  the owner's manual test; nothing was deleted by the failed attempts.
- **Receipts aren't linked through orders.** The first draft found receipts via
  `orders.payment_receipt_url`, but that column is null on every real order —
  the files are linked only by `storage.objects.uploaded_by`. Switched to that
  before shipping.

### Verified

- Build clean; production server and **live site**: 200 for `/`, `/men`,
  `/women`, `/home-living`, all three collection pages and `/profile`; 404 for an
  unknown collection.
- Collection counts match the DB exactly (3 trending — all women's, no men's or
  home product is flagged trending — 20 new, 4 featured).
- Playwright: "Home" once on screen at 1440px and once in the 375px drawer; all
  3 "View All" and all 6 footer Shop links land on the right page.
- Deletion: the owner deleted a real test account from `/profile`; the DB then
  showed the auth user gone and **zero** orphaned cart or order rows. The
  automated E2E (which would also have placed an order and uploaded a receipt
  first) was not run — the manual test covered an account with no orders.
- Live `/api/account/delete` returns 401 for no/forged token, which also proves
  `INSFORGE_API_KEY` is set on the deployment (a missing key returns 500).

### Left as-is

- **2 orphaned receipts** in `payment-uploads` (2026-08-28) belong to an account
  deleted before this feature existed. Harmless; delete them if you want a clean
  bucket.
- Signed-out visitors log a **401 in the browser console** from the auth check
  on page load. Pre-existing and untouched here, but not root-caused either.
- **Deployment env vars:** the site is on Vercel, not InsForge hosting —
  `insforge deployments env` has no effect (`deployments list` is empty). The key
  was added in Vercel → Production → Environment Variables.

## Where this stands — end of 2026-09-24

Everything below this section is the detailed history. This is the summary to
read first.

### In sync

Repo (`34b654c` on `main`), the InsForge database, and the deployed frontend
all match. Verified on the live URL after deploying, not just assumed: `/men`
serves 3 real products, `/home-living` serves 6 with zero broken images,
section titles render Cormorant 400, the theme toggle is present, and under an
OS dark preference the body is `rgb(16,13,11)` with **white** hero text and a
raised (not inverted) footer.

Dev server stopped, scratch files removed.

### Open items, in the order they matter

1. **Prices are placeholders on live, buyable products.** The supplied CSV had
   every `price` field empty; values were invented by product type to sit inside
   the existing range. Checkout enforces these server-side, so whatever is in
   `products.price` is what a customer is charged. This is the one item that
   should not sit indefinitely.
2. **11 demo women's products are still live** — the originals that use stock
   Unsplash imagery. They are the *entire* remaining source of duplicate images
   on the site: five pairs share photos (e.g. `silk-shawl-hijab` and
   `everyday-jersey-hijab` share both of theirs). The equivalent men's demo
   products were deleted on request; the women's were left because removing them
   drops women from 18 products to 7 — a call for the owner, not the agent.
3. **7 catalogue variants were never imported** — HIJ-IVF/NVY/SGE/LIL and
   MAT-NVY/MRN/GRY have no individual photograph, only a shared colour-range
   group shot. Photograph them and they can be added in minutes.
4. **Security hardening still open** (from `SECURITY_AUDIT.md`): no CSP or
   security headers in `next.config.ts`, and the password policy is
   `min_length = 6` with no complexity rule. Neither is a live hole.
5. `components/temporary mistake.md` — a design-critique document sitting in
   `components/`, untracked. Move it out of the source tree or delete it; its
   actionable points are already captured in this file.

### Worth knowing before the next session

- **The backend auto-pauses on the free tier.** Pages still return 200 but
  render an empty catalogue, which looks exactly like a broken frontend. Check
  `npx @insforge/cli projects get` first.
- **`db query` runs as `project_admin`**, which the order-pricing trigger
  exempts — attack tests run that way pass straight through and prove nothing.
- **Playwright `fullPage` screenshots paint `position: fixed` and opacity-hidden
  elements** that are genuinely not rendered. Two "bugs" this session were
  capture artefacts; one apparent artefact turned out to be a real bug. Confirm
  with `element.checkVisibility()` or computed style before concluding either
  way.
- **Check brace balance after any scripted edit to `app/globals.css`.** An
  unclosed `@media` nests the remainder of the file inside it — the site then
  looks perfect at desktop width and completely unstyled below the breakpoint.

## Image de-duplication, single-image products, font weights (2026-09-24)

### Products may now have ONE image

`Product.images` was typed `[string, string]` — a two-tuple — so the catalogue
import padded single-photo products by duplicating image 1 into slot 2. That
rendered **two identical thumbnails** in the product gallery and a hover
crossfade that visibly did nothing.

- Type is now `string[]` in `lib/data.ts`, `lib/api.ts` and `lib/store.tsx`.
- `ProductCard` renders the second image only when one exists.
- `Gallery` already guarded on `images.length > 1`, so single-image products
  correctly show no thumbnail strip.
- Collapsed 6 rows from `[a, a]` to `[a]`.

**Never pad the images array to two.** That is what created this.

### Group photos removed as secondary images

3 products (`cotton-crinkle-hijab-rose`, and the cream + rose prayer mats) used
a colour-range group shot — six colourways in one frame — as their second
image, and the mat group shot appeared on two different products, so it read as
a duplicate across the site. Dropped; those are now single-image. Same
reasoning as skipping the 7 variants that have only group photos.

After this, **zero duplicate images remain among the real catalogue rows.**

### Remaining duplication is all in the old demo seed

10 images are still shared across products, every one of them in the 11
leftover demo women's products (the seed reused the same Unsplash photos across
pairs — e.g. `silk-shawl-hijab` and `everyday-jersey-hijab` share both of
theirs). The men's demo products were deleted earlier; the women's have not
been.

### Hero legibility bug (introduced by dark mode, now fixed)

`.hero` sets `color: var(--color-white)`, and the dark palette redefines
`--color-white` to `#171310` as a *surface* role. So all text sitting ON
photography — the hero headline and category tile labels — turned dark and
became unreadable on light video frames.

Fixed with `--color-on-media`, which deliberately does **not** flip with the
theme. General lesson: a token named for a colour but used for two different
roles can only follow one of them through a theme change.

### Display font weights raised

Kept Cormorant Garamond + Inter (owner's choice), but weight 300 was too frail:

- Text over imagery (hero title, category labels): 300 → **500**
- Headings on flat backgrounds (section titles, promo, product name, static
  lede, empty state): 300 → **400**

Re-added Cormorant 500 to the Google Fonts request; weight 300 is now loaded
but unused and could be dropped. Note the first edit pass patched the *legacy*
rule blocks rather than the later overriding ones, leaving three headings
silently at 300 — caught by grepping for `font-weight: 300` rather than
assuming the edit landed.

### Gallery thumbnails never worked (pre-existing)

`ProductImage` did `useState(props.src)`. `useState` reads its argument only on
first mount, so when the gallery swapped `images[active]` on the already-mounted
instance the main image stayed frozen on the first photo — the thumbnail
highlighted, nothing else changed. The displayed src is now derived from props
each render, remembering only which src *failed*. Placeholder fallback
re-verified by blocking `/_next/image` entirely (blocking the storage URL proves
nothing — next/image proxies, so the browser never requests storage directly).

## Real catalogue import, Home category, dark mode (2026-09-24)

### Catalogue

Imported the supplied drop folder (`product image/` — 23 variant rows, WebP at
three widths, now gitignored at 72MB since the images live in storage and the
rows in the DB).

- **16 of 23 variants imported**, one product per colourway. The other **7 were
  deliberately skipped**: HIJ-IVF/NVY/SGE/LIL and MAT-NVY/MRN/GRY have no
  individual photograph, only a shared colour-range group shot. Listing "Navy
  Hijab" with a picture of six colours misrepresents the product, and the
  folder's own README says to photograph or delete those rows.
- **Prices are invented.** The source CSV had all 23 `price` fields empty. The
  owner asked for "random but logical", so they were set by product type inside
  the existing $22-$268 range (thobe 168, kameez shalwar 148, abaya 198, gown
  228, dupatta 58, hijab 32, prayer mat 78, wall art 95-240). **These are live
  and buyable with server-enforced pricing — review before taking real orders.**
- 25 WebP images uploaded to the `product-images` bucket under a `catalog-`
  key prefix, which is what distinguishes imported rows from the demo seed.

### Home category

Prayer mats and wall art are neither womenswear nor menswear, so
`migrations/20260923185349_add-home-category.sql` widens the `products.category`
CHECK to `('women','men','home')`. Added `/home-living` (route name avoids
colliding with the site root), nav + drawer + footer links, and `CATEGORIES.home`.
`lib/data.ts` now exports a `Category` union; `lib/api.ts` reads that type, so
its exported signatures keep their shape.

### Removed the demo men's products

At the owner's request, the 9 placeholder men's products using stock Unsplash
imagery were deleted, leaving only the 3 real catalogue items. Verified first
that no cart rows referenced them. One historical order references
`congregation-prayer-set`; orders store a full jsonb item snapshot and the
profile page renders from that without linking to the product, so order history
still displays correctly — but that product no longer exists.

Catalogue is now women 18 / men 3 / home 6 = 27.

### Dark mode

A navbar toggle (`components/ThemeToggle.tsx`), defaulting to the OS preference
and persisting an explicit choice to `localStorage`. **Only colour tokens are
redefined** — every rule already reads through them, so no component needed a
dark variant.

Two things that would have broken naively:

- `.footer` used `var(--color-text)` as background and `--color-bg` as text, so
  flipping the theme would have inverted it to a light footer. Same for
  `.promo-banner`. Now on dedicated `--color-band-*` tokens that stay dark in
  both themes (and in dark sit *above* the page, not below it).
- `--alpha-paper-72` (badges, quick-add) sits over photography and had to flip
  too, and shadows needed more opacity to register on a dark ground.

No inline `<head>` theme script: that needs `dangerouslySetInnerHTML`, which
`SECURITY_AUDIT.md` credits this codebase for not having. The CSS media query
covers the default, so only someone choosing a theme opposite to their OS sees
one frame of flash.

### Brand story + typography

Added a `.brand-story` editorial band ("Made With Intention") before the
shipping promo. Typography pass separated the three registers — display serif
gets `font-feature-settings`/`optimizeLegibility` (Cormorant ships loose, which
is much of why it read generic), long-form prose gets `--color-text-soft` and
`--lh-prose` instead of sharing muted grey with captions, prices are tabular.

### Two real bugs fixed

1. **The product card's two-image crossfade never worked** — and this predates
   the restyle. The media link's children are `[badge span, img, img, quick-add
   div]`, so `img:last-child` matched nothing and `img:first-child` failed on
   any badged product. Both images rendered at `opacity: 1` and the second
   painted over the first, which is why colour-range group shots appeared
   instead of the individual product. Now `:nth-of-type(1|2)`. This was live in
   production on every badged product.
2. **The promo band was catastrophically mis-laid-out** — `margin-inline: auto`
   on children combined with `max-width: 16ch` on the title *centred* the narrow
   block instead of left-aligning it, a `padding-left` calc pushed it further
   right, and `--section-pad-lg` gave 10rem of padding top and bottom. Result:
   a ~1000px-tall band, mostly empty, headline wrapping one word per line. A
   design critique read this as "huge empty hero sections" and "excessive
   whitespace" — it was a bug, not a design choice. Now uses
   `padding-inline: max(...)` for container alignment.

## Editorial luxury restyle (2026-09-23)

Visual redesign at the user's request — the site worked but read as basic. Direction
chosen: editorial luxury; depth: tokens + components, no page-markup restructuring;
asymmetry achieved through CSS alone.

### What changed

- **Token layer rebuilt** (`app/globals.css`). Added the two families that simply did
  not exist: an **elevation scale** (before this, the entire 1619-line stylesheet had
  exactly one `box-shadow`, on `.toast`) and a **type scale** (~22 ad-hoc rem literals
  and 4 near-duplicate heading `clamp()`s collapsed into 6 sans steps + 5 display
  steps). Palette extended from 2 surfaces to 4, plus `--color-sale` so markdowns stop
  sharing a colour with errors.
- **Micro-label motif consolidated** — was 5 sizes x 7 letter-spacings for what is
  conceptually one style; now one `--label-*` token set.
- **Product card** (renders on 5 pages, the highest-leverage change). Was containerless
  with name and price both plain Inter 0.05rem apart. Now a serif name against a
  tabular price, a hover "plate" that lifts the card without any layout cost, and
  **`--new` / `--sale` badges that finally differ** — they rendered identically before.
- **CSS-only asymmetry** — media aspect ratio and vertical offset vary by grid position
  via `nth-child`, giving a ragged magazine edge with zero markup change. Offsets use
  `margin-top`, never `transform`, because `ScrollReveal` owns `transform` on the same
  element.
- **`--grid-cols`** drives every product grid (2/3/4 at 720/1180). The 1180 step is the
  previously missing 13-inch-laptop breakpoint — cards used to stretch unbroken from
  1024px to the 1400px container cap.
- **Accessibility, previously absent**: a global `:focus-visible` ring (form focus was a
  1px border-colour shift; buttons and links got nothing) and a `prefers-reduced-motion`
  block.
- **Static pages** went from 3 CSS rules carrying 3 whole pages to a real editorial
  treatment (masthead, serif lede, hairline dividers, readable measure).
- Hero moved bottom-left at >=820px; category tiles became an asymmetric diptych; the
  first promo band is now a full-bleed dark break.
- Inline styles reduced ~30 -> 15, including two that were components in disguise
  (`PaymentBadge` -> `.pill`, the light promo variant -> `.promo-banner--plain`). The
  dead `spin` keyframe now powers a real `.loader`, replacing four blank loading divs.
- Fonts: added Cormorant 300 (editorial lightness at display sizes), dropped the
  now-unused 500. Fixed a live faux-bold — `.navbar__badge` asked for weight 700 from a
  font that only loads 400/500/600.

### Three real bugs found during verification

1. **An unclosed `@media` brace silently nested the whole stylesheet inside
   `min-width: 1180px`.** Caused by a scripted edit whose `index(".section__head {")`
   matched inside the `.section--offset .section__head {` it had just inserted. The site
   looked perfect at 1440 and was completely unstyled below 1180. Parsed rule count
   went 42 -> 326 once fixed. **Check brace balance after any scripted CSS edit.**
2. **Horizontal overflow at 375px** — the hero `<video>` sat at its intrinsic 1920px
   because the `.hero__media` rules were inside that broken media query. Fixed with #1.
3. **`prefers-reduced-motion` left `.reveal` stuck at `opacity: 0`** — content invisible
   rather than merely un-animated. The override sat earlier in the file than the base
   `.reveal` rule and lost on equal specificity; reduced-motion overrides now live last.

### Screenshot caveat worth knowing

Playwright `fullPage` captures paint `position: fixed` and opacity-hidden elements that
are genuinely not rendered — the search overlay, drawer and hover-only Quick Add all
appeared in captures while `element.checkVisibility()` returned `false` and hit-testing
at their coordinates returned the image beneath. Don't debug from a full-page screenshot
alone; confirm with `checkVisibility()` or computed style.

Verified: `npm run build` clean; no horizontal overflow at 375px on any page; 2-up mobile
grid; focus ring present on keyboard tab; reduced motion leaves content visible; Quick
Add reachable under `@media (hover: none)`.

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
