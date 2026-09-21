import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';

const execPromise = promisify(exec);

test('check-color-literals.mjs should not report "process is not defined" after fix', async () => {
  let errorOutput = '';
  let exitCode = 0;
  try {
    const { stdout } = await execPromise('npm run lint -- scripts/check-color-literals.mjs');
    errorOutput = stdout;
  } catch (error) {
    errorOutput = error.stdout;
    exitCode = error.code; // Capture the exit code if there are other linting errors
  }

  // Before the fix, this assertion should fail because the error *is* present.
  // After the fix, this assertion should pass because the error is *not* present.
  expect(errorOutput).not.toContain("'process' is not defined");

  // Optionally, if we expect no other errors, we could also assert exitCode to be 0 after fix.
  // For now, focus only on the 'process' error.
}, { timeout: 60000 });