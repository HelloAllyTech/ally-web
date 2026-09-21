import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["./__tests__/**/*.test.{ts,tsx,js,mjs}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
    ],
  },
});
