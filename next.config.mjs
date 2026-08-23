/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist (used by PDF → Word) references Node's optional `canvas` package,
    // which isn't needed in the browser. Alias it away so the client bundle builds.
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false };
    return config;
  },
};

export default nextConfig;
