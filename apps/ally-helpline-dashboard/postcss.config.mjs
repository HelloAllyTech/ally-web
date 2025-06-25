import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  plugins: {
    "postcss-import": {},
    "tailwindcss/nesting": {},
    tailwindcss: {
      config: path.resolve(__dirname, "tailwind.config.ts")
    },
    autoprefixer: {
      flexbox: "no-2009"
    },
  }
}; 