/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  output: 'standalone',
  // Configure static generation
  staticPageGenerationTimeout: 120,
  // Disable automatic static optimization for error pages
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure which pages should be statically generated
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

module.exports = nextConfig;
