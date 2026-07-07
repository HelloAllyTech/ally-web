const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  output: "standalone",
  // Sass support for the centralised IBM Carbon design system (imported from
  // @ally-ui-mono/ui-shared/styles/carbon-serif.scss). loadPaths lets
  // `@use "@carbon/styles"` resolve from the workspace-root node_modules; the
  // deprecation silences match the Vite dashboards so Carbon's Dart-Sass
  // warnings don't flood the build. Carbon's `with(...)` overrides live inside
  // the lib's scss (sassOptions cannot express them).
  sassOptions: {
    loadPaths: [path.join(__dirname, "../../node_modules")],
    quietDeps: true,
    silenceDeprecations: [
      "global-builtin",
      "import",
      "color-functions",
      "legacy-js-api",
      "mixed-decls",
    ],
  },
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

    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      resourceQuery: { not: [/url/] }, // exclude if *.svg?url
      use: ["@svgr/webpack"],
    });

    // Ensure Next handles svg?url as asset/resource
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: /url/, // *.svg?url
      type: "asset/resource",
    });

    // Handle audio file imports (mp3, wav, etc.)
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/i,
      type: "asset/resource",
    });

    return config;
  },
};

module.exports = nextConfig;
