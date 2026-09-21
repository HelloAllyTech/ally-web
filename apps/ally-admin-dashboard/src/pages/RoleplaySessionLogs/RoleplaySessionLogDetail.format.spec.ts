import { readFileSync } from "fs";
import { join } from "path";
import prettier from "prettier";
import { describe, expect, it } from "vitest";

describe("RoleplaySessionLogDetail.tsx formatting", () => {
  it("matches the repo's prettier rules", async () => {
    const filePath = join(__dirname, "RoleplaySessionLogDetail.tsx");
    const source = readFileSync(filePath, "utf8");
    const config = await prettier.resolveConfig(filePath);

    const formatted = await prettier.format(source, {
      ...config,
      filepath: filePath,
    });

    expect(source).toBe(formatted);
  });
});
