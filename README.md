# Every Boring Tool

> Everything simple and boring. Every boring tool you need, in one simple place.

A free online-tools website. This is the **scaffold** — the shell, navigation, and the first
category (**PDF**) are in place. Tools themselves are not built yet (each shows "Coming soon").

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
```

## How it's structured

Everything is data-driven from one file — **`lib/tools.js`**. To add a category or a tool,
you just edit that file; the pages and sitemap update automatically.

```
app/
  layout.js              # header, footer, site metadata
  page.js                # homepage (category grid)
  [category]/page.js     # a category page (lists its tools)
  [category]/[tool]/page.js  # a single tool page (stub for now)
  sitemap.js  robots.js  # SEO
lib/
  tools.js               # ← the whole site's content lives here
```

## Adding a tool later

1. Open `lib/tools.js`.
2. Find the category (e.g. `pdf`) and add an item to its `tools` array.
3. Build the tool's UI inside `app/[category]/[tool]/page.js` (replace the "coming soon" stub).

## Deploy

Push to GitHub, then import the repo at [vercel.com/new](https://vercel.com/new).
Vercel auto-detects Next.js — no configuration needed.
