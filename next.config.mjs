/** @type {import('next').NextConfig} */
const nextConfig = {
  // The word-game pages read public/words/dict.txt with fs at runtime (ISR). That
  // dynamic path isn't auto-traced into the serverless bundle, so include it explicitly.
  experimental: {
    outputFileTracingIncludes: {
      "/unscramble/[letters]": ["./public/words/dict.txt"],
    },
  },
  webpack: (config) => {
    // pdfjs-dist (used by PDF → Word) references Node's optional `canvas` package,
    // which isn't needed in the browser. Alias it away so the client bundle builds.
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false };
    return config;
  },
};

export default nextConfig;
