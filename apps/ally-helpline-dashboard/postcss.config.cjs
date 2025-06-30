const path = require("path");

module.exports = {
  plugins: {
    "postcss-import": {},
    "tailwindcss/nesting": {},
    tailwindcss: {
      config: path.resolve(__dirname, "tailwind.config.ts"),
    },
    autoprefixer: {
      flexbox: "no-2009",
    },
  },
};
