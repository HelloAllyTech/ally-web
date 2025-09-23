/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable export for static hosting on CDN
  output: "export",
  // Configure static generation
  staticPageGenerationTimeout: 120,
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Configure trailing slash for CDN
  trailingSlash: true,
  // Disable automatic static optimization for error pages
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure which pages should be statically generated
  pageExtensions: ["tsx", "ts", "jsx", "js"],
};

module.exports = nextConfig;
