# Every Boring Tool

> Everything simple and boring. Every boring tool you need, in one simple place.

**🔗 Live site: [everyboringtool.com](https://everyboringtool.com)**

[Every Boring Tool](https://everyboringtool.com) is a free online-tools website: a large
collection of fast, no-sign-up utilities that run **entirely in your browser** — nothing you
enter is uploaded to a server. PDF tools, image and audio/video converters, text utilities,
calculators, unit and size converters, word games, and more.

- **Free & no account** — every tool is free, with no sign-up and no watermarks.
- **Private by design** — files and inputs are processed client-side (PDFs with `pdf-lib`,
  video/audio with an in-browser build of `ffmpeg.wasm`, etc.), so your data never leaves
  your device.
- **No backend** — the whole site is static + client-side, which keeps it fast, private,
  and cheap to run.

## Tech

- **Next.js 14** (App Router), plain JS/JSX.
- Client-side processing: **ffmpeg.wasm** (single-threaded core — no `SharedArrayBuffer` /
  COOP-COEP required), **pdf-lib**, `<canvas>`, `jszip`, and friends.
- Data-driven: categories and tools live in **`lib/tools.js`**; the pages and the XML
  sitemap generate from it automatically.

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

```
app/
  layout.js                    # header, footer, site metadata
  page.js                      # homepage (category grid)
  [category]/page.js           # a category page (lists its tools)
  [category]/[tool]/page.js    # a single tool page
  sitemap.js  robots.js        # SEO
components/
  tools/                       # one client-side component per tool
lib/
  tools.js                     # categories + tools (the site's content map)
  toolContent.js               # per-tool SEO copy (title, meta, about, FAQ)
```

To add a category or a tool, edit `lib/tools.js`, add the matching content in
`lib/toolContent.js`, and build the tool's UI in `components/tools/`.

## Deploy

Push to GitHub, then import the repo at [vercel.com/new](https://vercel.com/new).
Vercel auto-detects Next.js — no configuration needed.

---

Made by **[Every Boring Tool](https://everyboringtool.com)** — everything simple and boring.
