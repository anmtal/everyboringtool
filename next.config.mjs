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
const GOOGLE_ADS = "https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://*.doubleclick.net https://*.google.com";
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net ${GOOGLE_ADS}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  `connect-src 'self' data: blob: https://cdn.jsdelivr.net https://huggingface.co https://*.hf.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://tessdata.projectnaptha.com ${GOOGLE_ADS} https://*.g.doubleclick.net`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self' blob: data: https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.doubleclick.net https://*.googlesyndication.com https://www.google.com",
  "manifest-src 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The word-game pages read public/words/dict.txt with fs at runtime (ISR). That
  // dynamic path isn't auto-traced into the serverless bundle, so include it explicitly.
  experimental: {
    outputFileTracingIncludes: {
      "/unscramble/[letters]": ["./public/words/dict.txt"],
      "/anagram/[letters]": ["./public/words/dict.txt"],
      "/words-starting-with/[prefix]": ["./public/words/dict.txt"],
      "/words-ending-with/[suffix]": ["./public/words/dict.txt"],
      "/words-containing/[substr]": ["./public/words/dict.txt"],
      "/[category]": ["./public/words/dict.txt"],
      "/crossword-solver/[pattern]": ["./public/words/dict.txt"],
    },
  },
  // /text/word-unscrambler was a second, weaker Word Unscrambler: it shipped a
  // hand-typed 8,767-word list to the browser (61 KB) and competed with
  // /unscramble — which uses the full 168,551-word dictionary — for the same
  // head term. Consolidated rather than left to cannibalise itself.
  // No security headers were being sent at all. These are the safe, high-value
  // ones for a static client-side site. A strict CSP is deliberately NOT set
  // here: the tools rely on blob: workers, data: URIs and wasm-eval, so a CSP
  // needs to be written and tested per-tool rather than guessed at.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), payment=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Enforcing. Verified Report-Only first: homepage inline scripts/styles/
          // fonts, blob workers (regex), object URLs/data URIs, the iframe PDF
          // preview, ffmpeg, and the OCR/transcribe CDNs (jsDelivr + Hugging Face)
          // all pass; unknown origins are correctly blocked.
          { key: "Content-Security-Policy", value: CSP },
        ],
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
      { source: "/pdf/unlock-pdf", destination: "/pdf", permanent: true },
      // Retired the "coming soon" placeholders (need a paid API / server / model):
      // parked in memory to build later. 301 their nav-linked URLs to the category.
      { source: "/pdf/pdf-to-word", destination: "/pdf", permanent: true },
      { source: "/converters/currency-converter", destination: "/converters", permanent: true },
      { source: "/image/background-remover", destination: "/image", permanent: true },
      { source: "/seo-web/sitemap-checker", destination: "/seo-web", permanent: true },
      { source: "/seo-web/open-graph-preview", destination: "/seo-web", permanent: true },
      { source: "/seo-web/page-speed-image-estimator", destination: "/seo-web", permanent: true },
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
