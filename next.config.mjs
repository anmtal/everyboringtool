// Content-Security-Policy allowlisting exactly what the tools load: Next's inline
// hydration scripts + inline style attributes ('unsafe-inline'), WebAssembly
// (ffmpeg / tesseract / onnx-runtime via 'wasm-unsafe-eval'), blob: workers and
// object URLs, data: URIs, an iframe PDF preview (blob:), and the two CDNs the
// OCR/transcribe tools use by default — jsDelivr (worker/core/onnx-wasm) and
// Hugging Face (Whisper models) — plus tesseract's language-data host.
// Google AdSense pulls scripts, iframes and creatives from its ad stack, so the
// ad domains are allowlisted below. script-src stays bounded to Google (the key
// protection); ad creatives (images/video) come from countless advertiser
// domains, so img-/media-src open to https:. object-src 'none', base-uri,
// frame-ancestors and form-action still lock down the highest-risk vectors.
// Keep in sync with lib/wordFamilies.js (WORD_FAMILIES keys).
const WORD_HUBS = ["unscramble", "anagram", "words-starting-with", "words-ending-with", "words-containing", "crossword-solver"];

const GOOGLE_ADS = "https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://*.doubleclick.net https://*.google.com";
// One policy for every page; only frame-ancestors differs: 'self' site-wide,
// * on the /embed/* pages that other sites are meant to iframe.
const cspWith = (frameAncestors) => [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  `frame-ancestors ${frameAncestors}`,
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://www.googletagmanager.com ${GOOGLE_ADS}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  `connect-src 'self' data: blob: https://api.frankfurter.app https://cdn.jsdelivr.net https://huggingface.co https://*.hf.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://tessdata.projectnaptha.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com ${GOOGLE_ADS} https://*.g.doubleclick.net`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  // *.google.com covers www.google.com AND fundingchoicesmessages.google.com —
  // the Google consent-message (CMP) iframe must be frameable or EEA visitors get
  // no consent prompt and personalised ads can't serve to them.
  "frame-src 'self' blob: https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.doubleclick.net https://*.googlesyndication.com https://*.google.com https://fundingchoicesmessages.google.com",
  "manifest-src 'self'",
].join("; ");
const CSP = cspWith("'self'");
const CSP_EMBED = cspWith("*");

// Security headers. `embed` drops X-Frame-Options and opens frame-ancestors so
// the /embed/* pages can be iframed anywhere; everything else is identical.
function securityHeaders({ embed = false } = {}) {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    ...(embed ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // camera=(self) — the QR scanner needs it; everything else is off.
    { key: "Permissions-Policy", value: "camera=(self), geolocation=(), microphone=(), payment=(), interest-cohort=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    // Enforcing. Verified Report-Only first: homepage inline scripts/styles/
    // fonts, blob workers (regex), object URLs/data URIs, the iframe PDF
    // preview, ffmpeg, and the OCR/transcribe CDNs (jsDelivr + Hugging Face)
    // all pass; unknown origins are correctly blocked.
    { key: "Content-Security-Policy", value: embed ? CSP_EMBED : CSP },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Word-game results (app/word-results/[family]) read public/words/dict.txt
  // with fs at request time. That dynamic path isn't auto-traced into the
  // serverless bundle, so include it explicitly.
  experimental: {
    outputFileTracingIncludes: {
      "/word-results/[family]": ["./public/words/dict.txt"],
      "/[category]": ["./public/words/dict.txt"],
    },
  },
  // The word hubs (/unscramble, /anagram, …) are static pages. A search adds
  // ?q=, which is rewritten to the dynamic results route, so the visitor keeps
  // the hub URL and the plain hubs stay CDN-cached. Bare hub URLs never match.
  async rewrites() {
    return {
      beforeFiles: WORD_HUBS.map((h) => ({ source: `/${h}`, has: [{ type: "query", key: "q" }], destination: `/word-results/${h}` })),
    };
  },
  // /text/word-unscrambler was a second, weaker Word Unscrambler: it shipped a
  // hand-typed 8,767-word list to the browser (61 KB) and competed with
  // /unscramble — which uses the full 168,551-word dictionary — for the same
  // head term. Consolidated rather than left to cannibalise itself.
  async headers() {
    return [
      {
        // Every path EXCEPT /embed/* (negative lookahead), so the framing
        // headers below are the only ones the embed pages get. Matches "/" too.
        source: "/((?!embed/).*)",
        headers: securityHeaders(),
      },
      {
        // The iframe-able tools (lib/embeds.js): same security headers minus
        // X-Frame-Options, with frame-ancestors *, and kept out of the index.
        // `:path+` (not `*`) so bare /embed keeps the site-wide headers only.
        source: "/embed/:path+",
        headers: [...securityHeaders({ embed: true }), { key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        // These files have STABLE names (not content-hashed), so `immutable` would
        // pin a stale copy for a year if we ever update the dictionary or ffmpeg
        // core. Cache hard for a day, then serve-stale-while-revalidating so a
        // change propagates within ~24h at the cost of a cheap background 304.
        source: "/:path(ffmpeg|words)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/pdf.worker.min.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/text/word-unscrambler", destination: "/unscramble", permanent: true },
      // Renamed the bra tool's slug to lead with the head term ("bra size calculator", 135k).
      { source: "/converters/bra-size-converter", destination: "/converters/bra-size-calculator", permanent: true },
      { source: "/pdf/unlock-pdf", destination: "/pdf", permanent: true },
      // Retired the "coming soon" placeholders (need a paid API / server / model):
      // parked in memory to build later. 301 their nav-linked URLs to the category.
      { source: "/pdf/pdf-to-word", destination: "/pdf", permanent: true },
      { source: "/image/background-remover", destination: "/image", permanent: true },
      { source: "/seo-web/sitemap-checker", destination: "/seo-web", permanent: true },
      { source: "/seo-web/open-graph-preview", destination: "/seo-web", permanent: true },
      { source: "/seo-web/page-speed-image-estimator", destination: "/seo-web", permanent: true },
      // Data-format converters moved from /converters/* to the new /data/* category.
      { source: "/converters/:slug(csv-to-json|json-to-csv|markdown-to-html|xml-to-json|json-to-xml|xml-to-csv|csv-to-xml|csv-to-markdown|csv-to-html|html-table-to-csv|csv-to-excel|excel-to-csv|excel-to-json|json-to-excel|excel-to-html|split-csv|tsv-to-csv|csv-to-tsv|yaml-to-json|json-to-yaml)", destination: "/data/:slug", permanent: true },
      // Removed for AdSense policy (downloader / misrepresentative content).
      { source: "/social/youtube-thumbnail-downloader", destination: "/social", permanent: true },
      { source: "/social/fake-tweet-generator", destination: "/social", permanent: true },
      // The N-letter-words tool was retired; 301 its indexed URLs
      // (e.g. /5-letter-words, /7-letter-words-starting-with-a) to the unscrambler.
      { source: "/:n(\\d\\d?-letter-words)", destination: "/unscramble", permanent: true },
      { source: "/:n(\\d\\d?-letter-words-[a-z-]+)", destination: "/unscramble", permanent: true },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist (used by PDF → Word) references Node's optional `canvas` package,
    // which isn't needed in the browser. Alias it away so the client bundle builds.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      // transformers.js optional Node-only backends — never used in the browser.
      "onnxruntime-node": false,
      sharp: false,
    };
    config.resolve.fallback = { ...(config.resolve.fallback || {}), fs: false, path: false, crypto: false };
    return config;
  },
};

export default nextConfig;
