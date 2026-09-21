//! /usr/bin/env node
/* global process */
/* eslint-disable no-console */
/**
 * Colour-literal ratchet for the consumer app and the shared UI library.
 *
 * WHY A RATCHET AND NOT A BAN.
 *
 * The plan for this check was "an ESLint rule banning hex literals, as an error
 * not a warning". That cannot land: after the sweep there are still ~685 hex
 * literals in .ts/.tsx across these two scopes. A blanket error would fail CI on
 * the first run and force either a 130-file rewrite in one PR or a scatter of
 * eslint-disable comments, which is the same debt wearing a hat.
 *
 * Not all of those literals are wrong, either. A chart series ramp, the
 * artifact-label swatches, and gold/silver/bronze medals are categorical
 * identity sets: recolouring them to match a page makes them worse at the only
 * job they have, which is being told apart. A rule that cannot express that
 * distinction would be argued with and then disabled.
 *
 * So this enforces the property that actually matters — the number never goes
 * UP. A file may keep the literals it has; it may not gain one, and a file with
 * none may not start. New colour work therefore has to name a token, which is
 * what the rule was for. The backlog drains whenever someone is already in a
 * file, and the baseline is refreshed to lock the gain in.
 *
 * WHY .ts/.tsx ONLY. Literals are correct in the stylesheets that DEFINE the
 * palette (index.css, carbon-claude.css, sjt.css). The bug is a component
 * naming a colour, because that is the thing that can't be re-themed per app —
 * and per-app theming is what keeps the admin console on Carbon while this app
 * runs on Claude.
 *
 * Usage:
 *   node scripts/check-color-literals.mjs            # check (CI, via npm run lint)
 *   node scripts/check-color-literals.mjs --update   # re-baseline after a cleanup
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BASELINE = join(ROOT, "scripts", "color-literal-baseline.json");

const SCOPES = ["apps/ally-helpline-dashboard/src", "libs/ui-shared/src"];
const SKIP_DIRS = new Set(["assets", "node_modules", "dist", "coverage"]);
const EXTS = [".ts", ".tsx"];
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) await walk(p, out);
    } else if (EXTS.some(x => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}

async function measure() {
  const counts = {};
  for (const scope of SCOPES) {
    for (const file of await walk(join(ROOT, scope))) {
      const n = (readFileSync(file, "utf8").match(HEX) ?? []).length;
      if (n > 0) counts[relative(ROOT, file).split(sep).join("/")] = n;
    }
  }
  return counts;
}

const counts = measure();

counts.then(current => {
  const total = Object.values(current).reduce((a, b) => a + b, 0);

  if (process.argv.includes("--update")) {
    writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
    console.log(
      `colour-literal baseline written: ${total} literals in ${Object.keys(current).length} files`,
    );
    return;
  }

  if (!existsSync(BASELINE)) {
    console.error(
      "No colour-literal baseline found. Create one with:\n  node scripts/check-color-literals.mjs --update",
    );
    process.exit(1);
  }

  const base = JSON.parse(readFileSync(BASELINE, "utf8"));
  const regressions = [];
  for (const [file, n] of Object.entries(current)) {
    const was = base[file] ?? 0;
    if (n > was) regressions.push({ file, was, now: n });
  }

  if (regressions.length > 0) {
    console.error("\n  Colour literals increased.\n");
    for (const { file, was, now } of regressions) {
      console.error(`    ${file}\n      ${was} -> ${now} (+${now - was})`);
    }
    console.error(
      "\n  A component must name a token, not a colour: that is what lets the same\n" +
        "  shared component render Carbon blue in the admin console and clay here.\n" +
        "  Use a Tailwind token class (bg-primary-500, text-typography-Default,\n" +
        "  bg-status-sageBg, ...). If the colour genuinely has no token, add one to\n" +
        "  BOTH apps' tailwind configs rather than inlining it.\n\n" +
        "  If this really is a categorical identity set (chart series, medals,\n" +
        "  artifact swatches), re-baseline deliberately and say why in the commit:\n" +
        "    node scripts/check-color-literals.mjs --update\n",
    );
    process.exit(1);
  }

  const baseTotal = Object.values(base).reduce((a, b) => a + b, 0);
  if (total < baseTotal) {
    console.log(
      `colour literals: ${total} (down ${baseTotal - total} from the baseline).\n` +
        "  Lock it in with: node scripts/check-color-literals.mjs --update",
    );
  } else {
    console.log(`colour literals: ${total}, no increase.`);
  }
});
