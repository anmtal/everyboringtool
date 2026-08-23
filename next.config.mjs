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
  async redirects() {
    return [{ source: "/text/word-unscrambler", destination: "/unscramble", permanent: true }];
  },
  webpack: (config) => {
    // pdfjs-dist (used by PDF → Word) references Node's optional `canvas` package,
    // which isn't needed in the browser. Alias it away so the client bundle builds.
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false };
    return config;
  },
};

export default nextConfig;
