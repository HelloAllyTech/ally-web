/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  output: "standalone",
  // Configure static generation
  staticPageGenerationTimeout: 120,
  // Disable automatic static optimization for error pages
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure which pages should be statically generated
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  webpack: config => {
    // Allow importing from workspace libs outside app dir
    config.externals = config.externals || [];
    // Ensure Next handles svg?url as asset/resource
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: /url/, // *.svg?url
      type: "asset/resource",
    });
    return config;
  },
};

module.exports = nextConfig;
