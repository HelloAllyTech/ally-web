import { execSync } from "child_process";

describe("FileUpload linting", () => {
  it("should have no exhaustive-deps linting errors", () => {
    let lintOutput = "";
    try {
      // We run eslint on the specific file. The try/catch is to handle the case where eslint finds errors,
      // as execSync will throw an error in that case. We want to inspect the output ourselves.
      execSync(
        "npx eslint apps/ally-admin-dashboard/src/components/file-upload/FileUpload.tsx --rule 'react-hooks/exhaustive-deps: error'",
      );
    } catch (error: any) {
      lintOutput = error.stdout.toString();
    }

    // We expect the output to be free of "react-hooks/exhaustive-deps" warnings/errors.
    // If it's not, we fail the test and print the output.
    expect(lintOutput).not.toContain("react-hooks/exhaustive-deps");
  });
});
