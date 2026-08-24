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
        ],
      },
      {
        // Immutable, content-addressed assets: cache hard instead of revalidating
        // the 32 MB ffmpeg core and 1.1 MB pdf worker on every use.
        source: "/:path(ffmpeg|words)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/pdf.worker.min.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/text/word-unscrambler", destination: "/unscramble", permanent: true },
      { source: "/pdf/unlock-pdf", destination: "/pdf", permanent: true },
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
