Build a complete, modern, high-end fashion eCommerce website in the working directory.

ENVIRONMENT: I'm on WSL (Linux), using Claude Code, on a free hosting budget. Use Linux-native
commands only (no macOS-only paths/tools). Structure the project to deploy for free on Vercel's
Hobby tier later — keep it stateless, no runtime filesystem writes except the local
import-listings script, no paid infra assumptions at this stage.

STACK: Next.js (latest stable, App Router) + TypeScript + React, scaffolded with
`npx create-next-app` (npm). NO Tailwind — implement the design system as a single well-organized
global stylesheet (app/globals.css) with CSS variables, responsive rules and animations. Split
component styles into CSS modules only if clearly cleaner. Server components by default; add
"use client" only where interactivity requires it.

BRAND: A premium minimal fashion brand called "VELOUR" (men's & women's apparel, Zara/H&M-like
positioning but more upscale feel).

PAGES (App Router routes):
1. `/` — Homepage:
   - Large animated hero: full-viewport, gradient overlay, headline with staggered fade/slide-in
     animation, CTAs ("Shop Women" / "Shop Men"), scroll-down indicator. If a video file exists in
     the working directory, transcode with ffmpeg (1080p H.264, no audio, faststart) to
     public/videos/hero.mp4 and extract a poster to public/images/hero-poster.jpg — hero =
     muted/autoplay/loop/playsInline video with poster fallback. If no video, fall back to a
     subtle auto-rotating crossfade slideshow of 2-3 large Unsplash hero images (client component;
     video hero is a server component).
   - Category highlights (Women / Men large cards linking to listing pages, hover zoom).
   - Featured products grid (products flagged `featured`).
   - New arrivals section (products flagged `isNew`).
   - Trending section (products flagged `trending`).
   - Promotional banner(s) ("Winter Sale — Up to 40% off", "Free shipping over $75").
   - Newsletter signup strip (UI only).
2. `/women` and `/men` — Listing pages: filter pills by subcategory, sort dropdown (Featured,
   Price low→high, Price high→low, Newest), responsive product grid, cards with hover image-swap
   and "Quick add" affordance. Keep filter/sort state in the URL (?sub=…&sort=…) so server
   components can fetch via the service layer and links are shareable.
3. `/product/[id]` — Product detail: image gallery (main + thumbnails), name, price, description,
   size selector (XS–XL, required before add), quantity stepper, Add to Cart (writes to cart
   context → localStorage, updates nav badge, shows a toast), related products row.
4. `/cart` — Line items with image/name/size/price, quantity +/- and remove, order summary
   (subtotal, shipping, total), "Proceed to Checkout", empty-cart state with CTA.
5. `/checkout` — Contact form (name/email/phone), shipping (address/city/zip/country), dummy
   payment fields (card number/expiry/cvc — UI only, clearly labelled dummy), order summary side
   panel, "Place Order" → validates required fields, clears cart, shows confirmation with a fake
   order number.
6. `/login` — Login/Signup UI only: tabbed Sign In / Create Account forms, no real auth, premium
   styled.
7. `/about`, `/contact`, `/privacy` — minimal static stubs.

SHARED COMPONENTS (components/):
- Navbar (client): logo, links (Home, Women, Men), search icon expanding into a full-screen search
  overlay with live suggestions (search navigates to /search?q=…), cart icon with live count
  badge, account icon → /login, mobile hamburger with slide-in drawer. Announcement bar above nav
  ("Free worldwide shipping over $75").
- Footer: brand blurb, link columns (Shop, Company, Support & Legal), inline SVG social icons,
  copyright with current year.
- ProductCard, Hero (video background, slideshow fallback), gallery/size-selector/qty-stepper
  (client), scroll-reveal wrapper (IntersectionObserver, fade-up / staggered), toast
  notifications, Icons (inline SVGs only — no icon libraries).
- Navigation via next/link; images via next/image with images.remotePatterns for
  images.unsplash.com and an onError fallback to a neutral placeholder so a dead image never
  renders broken.

CODE STRUCTURE (designed for easy backend swap later):
app/                    routes + layout.tsx + globals.css
components/             shared + page-level components (server by default)
lib/data.ts             BASE_PRODUCTS array + CATEGORIES — typed (Product interface: id, name,
                        category "women"|"men", subcategory, price, compareAtPrice?, description,
                        sizes, images [primary, hover], featured/isNew/trending). Exports PRODUCTS
                        (demo + generated merged; one documented line switches to generated-only)
                        and a subcategoriesFor(category) helper — listing filter pills derive from
                        the ACTIVE catalogue: only subcategories that actually have products,
                        curated CATEGORIES order first.
lib/generated-products.ts  user listings, regenerated by the import script — never hand-edited
lib/api.ts              mock async service layer: getProducts({category,subcategory,sort,query,
                        limit}), getProductById(id), getFeatured(), getNewArrivals(),
                        getTrending(), getRelated(id) — each returns a Promise resolved from
                        data.ts so it can later be replaced by fetch() calls with zero
                        page-level changes. Document it as THE backend-swap seam.
lib/store.tsx           cart state: React Context provider (mounted in root layout, "use client")
                        + localStorage persistence; add/remove/updateQty/count/subtotal. Read
                        localStorage after mount (useEffect) so the SSR'd badge never causes a
                        hydration mismatch.
lib/format.ts           money() helper
scripts/import-listings.mjs  listings import script (see LISTINGS PIPELINE below)
incoming/               listings-template.csv, README.md (column reference), images/ drop folder
README.md               structure overview + how to swap lib/api.ts mock for real endpoints, plus
                        a short "Deploying free to Vercel" section

LISTINGS PIPELINE (build this exactly — a follow-up prompt adds products through it):
- User workflow: copy incoming/listings-template.csv → incoming/listings.csv, fill one row per
  product, drop photos into incoming/images/, run npm run import-listings.
- CSV columns, in order: name, category, subcategory, price, compareAtPrice, description, sizes,
  image1, image2, featured, isNew, trending.
  category = women|men; price required; sizes optional, |-separated (default XS,S,M,L,XL); flags
  yes/no (default no); image1/image2 = filenames in incoming/images/ (image2 optional, falls back
  to image1).
- scripts/import-listings.mjs (dependency-free Node, wired as the import-listings npm script):
  quote-aware CSV parser; validates required fields (name, category, price, subcategory, image1)
  and skips invalid rows with clear errors; auto-slugs ids from names (-2 suffix on collision);
  optimizes images with the sharp npm package (max 1400px, JPEG, quality ~85) into
  public/images/products/<id>-1.jpg / <id>-2.jpg; add sharp as a project dependency
  (npm install sharp); missing image → neutral placeholder URL + warning; regenerates
  lib/generated-products.ts wholesale every run (idempotent, safe to re-run).

DUMMY DATA: 20-24 demo products in lib/data.ts (BASE_PRODUCTS), split ~evenly men/women, fields
per the Product interface above. Use real-looking Unsplash image URLs
(https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=900&q=80) with well-known stable
fashion photo IDs (e.g. photo-1521572163474-6864f9cf17ab, photo-1591047139829-d91aecb6caea,
photo-1525507119028-ed4c629a60a3, photo-1542272604-787c3835535d, photo-1520975954732-35dd22299614,
photo-1490481651871-ab68de25d43d, photo-1485968579580-b6d095142e6e, photo-1539533018447-63fcce2678e3,
photo-1551028719-00167b16eac5, photo-1594633312681-425c7b97ccd1, photo-1434389677669-e08b4cac3105,
photo-1496747611176-843222e1e57c, photo-1509631179647-0177331693ae, photo-1515886657613-9f3515b0c78f,
photo-1552374196-c4e7ffc6e126, photo-1611312449408-fcece27cdbb7, photo-1555529669-e69e7aa0ba9a,
photo-1576566588028-4147f3842f27, photo-1596755094514-f87e34085b2c, photo-1529139574466-a303027c1d8b,
photo-1554412933-514a83d2f3c8, photo-1591369822096-ffd140ec948f, photo-1507003211169-0a1dd7228f2d,
photo-1554568218-0f1715e72254). Pick ones that plausibly match the product type; approximate is
fine. Hero images: larger w=1600 variants.

DESIGN SYSTEM:
- Palette: warm off-white background (#faf8f5), near-black text (#16130f), muted taupe/stone
  accents, thin hairline borders (#e5e0da). Premium minimal — generous whitespace, hairline
  dividers, uppercase micro-labels with letter-spacing.
- Typography: Google Fonts — display serif for headings ("Cormorant Garamond") + clean sans for
  body ("Inter"), loaded via <link> in the root layout.
- Animations: IntersectionObserver-based fade-up reveals on sections/cards; staggered hero text
  entrance; product card hover = subtle image scale + second-image crossfade; button fill-sweep
  hover; smooth scrolling; interactive but tasteful.
- Responsive: mobile-first; grid collapses 4→2→1 columns; hamburger nav under ~820px;
  cart/checkout stack vertically on mobile. Sanity-check layout at 375px width.

QUALITY REQUIREMENTS:
- All pages share the same nav/footer (root layout) and work end-to-end: browse → product → add
  to cart (badge updates, persists across pages via localStorage) → cart edit → checkout →
  confirmation.
- No console errors; `npm run build` must succeed with no type errors.
- Verify: start the production server and curl every route (/, /women, /men, /search?q=coat,
  /product/<id>, /cart, /checkout, /login, /about) expecting 200; then kill the server.
- Smoke-test the listings pipeline: run npm run import-listings against the template's example
  rows (placeholder-image warnings are expected), confirm lib/generated-products.ts is emitted and
  the products appear on a listing page, then reset to a clean state (remove the test CSV, test
  images, and generated entries).
- Keep code clean and commented where the backend-swap seams are (lib/api.ts especially).