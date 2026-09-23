# Vercel visibility — taking the site private and bringing it back

**Current state: the site is LIVE and public** at
https://ecommerce-application-with-ai.vercel.app (re-activated by the owner on
2026-09-23). This file is the playbook for both directions — it is no longer a
description of an offline site.

Vercel project `ecommerce-application-with-ai`, scope `me-5a10`.

## History

On **2026-08-30** the site was taken fully offline at the owner's request.
Nothing was deleted, no data was touched, no code was changed — only the public
domain aliases were removed, so the URL 404'd for anyone who visited. The two
aliases removed were:

- `ecommerce-application-with-ai.vercel.app` (the main public URL)
- `ecommerce-application-with-ai-me-5a10.vercel.app` (team-scoped alias)

On **2026-09-23** the owner re-activated it on Vercel. Verified the same day:
`/`, `/women`, `/men` and `/login` all return 200 and render real DB-backed
products.

## To take it private again

Remove the public alias — reversible, destroys nothing:

```bash
npx vercel alias rm ecommerce-application-with-ai.vercel.app
```

The underlying deployment keeps working at its immutable
`*-me-5a10.vercel.app` deployment URL; only the friendly alias goes away.

## To make it public again

```bash
npx vercel alias set <deployment-url> ecommerce-application-with-ai.vercel.app
```

Find `<deployment-url>` with `npx vercel ls`. If the deployment has expired or
a newer one exists, just run a fresh production deploy and let it alias
automatically:

```bash
npx vercel --prod --yes
```

From the dashboard instead: Project → Deployments → pick the deployment → "..."
menu → **Promote to Production** (or **Assign Domain**).

## Don't forget the backend

Vercel visibility and the InsForge backend are independent. The backend
(project `haven`) auto-pauses on the free tier after inactivity, and a paused
backend makes the live site serve an **empty catalogue** while still returning
200 — which looks like a broken site, not a paused one.

```bash
npx @insforge/cli projects get      # Status: active | paused
npx @insforge/cli projects restore  # ~30-60s to come back
```

This is exactly what happened on 2026-09-23: the site was public again, but the
backend was still paused until it was restored.
