#!/usr/bin/env node
/**
 * Locale parity: does every locale file say everything English says?
 *
 * Compares each `<lang>.json` in the locales folder against `en.json`, leaf
 * by leaf, and reports per locale:
 *
 *   missing   keys English has and this locale lacks — the user sees English
 *   blank     keys this locale has as "" (or whitespace) where English has
 *             text — the user sees nothing, or English if the app falls back
 *   extra     keys this locale has and English does not — dead weight, never
 *             a user-visible bug, reported so a sync can prune them
 *   nonString a leaf that is not a string — the app will render "[object …]"
 *
 * A key English itself leaves blank is not a defect anywhere else.
 *
 * Deterministic and model-free on purpose. This is Bug Hunter's
 * `locale_parity` sense (OPP-0782): on 2026-10-01 a staff member reported
 * English text on the helpline dashboard with Marathi selected, because keys
 * had been added to en.json and never synced; the fix then ran the sync
 * without a translate key and wrote 385 blanks per language. Neither threw,
 * neither failed a test. This counts, and a count is evidence.
 *
 *   node scripts/i18n-parity.mjs                  human-readable, exit 1 on a defect
 *   node scripts/i18n-parity.mjs --json           the full report as JSON, same exit code
 *   node scripts/i18n-parity.mjs --findings REPO  Bug Hunter's POST body for
 *                                                 runs/:id/findings — one finding per
 *                                                 locale file with a defect — exit 0
 *   --dir <path>                                  another locales folder (default below)
 *   --source <lang>                               another reference language (default en)
 *
 * Only the two user-visible classes (missing, blank) are defects. `extra` and
 * `nonString` are listed in the report and in a finding's evidence but never
 * open one on their own.
 */
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DIR = "apps/ally-helpline-dashboard/src/i18n/locales";
const DEFAULT_SOURCE = "en";
/** How many keys a finding quotes per class before saying "and N more". */
const EVIDENCE_KEYS = 60;
/** A locale file whose name starts like this is an archived copy, not a language. */
const ARCHIVED_PREFIX = "old_";

const args = process.argv.slice(2);
const flag = name => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};
const has = name => args.includes(name);

const dir = flag("--dir") ?? DEFAULT_DIR;
const source = flag("--source") ?? DEFAULT_SOURCE;
const asJson = has("--json");
const findingsRepo = flag("--findings");

/** Every leaf as [dotted.path, value]. Arrays index as `path[i]`. */
export const leaves = (node, prefix = "") => {
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    return Object.entries(node).flatMap(([key, value]) =>
      leaves(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  if (Array.isArray(node)) {
    return node.flatMap((value, index) => leaves(value, `${prefix}[${index}]`));
  }
  return [[prefix, node]];
};

const isBlank = value => typeof value === "string" && value.trim() === "";

/** One locale against the reference. Pure: maps in, lists out. */
export const compareLocale = (reference, locale) => {
  const missing = [];
  const blank = [];
  for (const [key, refValue] of reference) {
    if (!locale.has(key)) {
      missing.push(key);
      continue;
    }
    if (isBlank(locale.get(key)) && !isBlank(refValue)) blank.push(key);
  }
  const extra = [];
  const nonString = [];
  for (const [key, value] of locale) {
    if (!reference.has(key)) extra.push(key);
    if (typeof value !== "string") nonString.push(key);
  }
  return { missing, blank, extra, nonString };
};

const readLocale = file => new Map(leaves(JSON.parse(fs.readFileSync(file, "utf8"))));

/** The whole folder. Throws when the reference file is unreadable: no reference, no report. */
export const checkFolder = (localesDir, sourceLang) => {
  const referenceFile = path.join(localesDir, `${sourceLang}.json`);
  const reference = readLocale(referenceFile);
  const files = fs
    .readdirSync(localesDir)
    .filter(name => name.endsWith(".json") && !name.startsWith(ARCHIVED_PREFIX))
    .filter(name => name !== `${sourceLang}.json`)
    .sort();
  const locales = files.map(name => {
    const file = path.join(localesDir, name);
    const lang = name.replace(/\.json$/, "");
    try {
      const result = compareLocale(reference, readLocale(file));
      return { lang, file, keys: reference.size, ...result, error: null };
    } catch (error) {
      // An unparseable locale file is the worst case of all: the app will not
      // build. Reported as its own defect rather than crashing the run.
      return {
        lang,
        file,
        keys: reference.size,
        missing: [],
        blank: [],
        extra: [],
        nonString: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  return { dir: localesDir, source: sourceLang, keys: reference.size, locales };
};

const hasDefect = l => l.missing.length > 0 || l.blank.length > 0 || l.error !== null;

const quoteKeys = (label, keys) => {
  if (!keys.length) return null;
  const shown = keys.slice(0, EVIDENCE_KEYS);
  const more = keys.length - shown.length;
  return `${label} (${keys.length}):\n  ${shown.join("\n  ")}${more > 0 ? `\n  … and ${more} more` : ""}`;
};

/**
 * One Bug Hunter finding per locale file with a defect, shaped for
 * `POST /api/v1/bug-hunter/runs/:id/findings`. `symbol` is constant per file
 * so the same file out of parity on two nights is one finding touched twice,
 * not two findings; counts live in the description and evidence, which the
 * dedupe key ignores.
 */
export const toFindings = (report, repo) => ({
  repo,
  findings: report.locales.filter(hasDefect).map(l => {
    const parts = [];
    if (l.error) parts.push(`cannot be parsed (${l.error})`);
    if (l.missing.length)
      parts.push(`is missing ${l.missing.length} of the ${l.keys} keys English has`);
    if (l.blank.length) parts.push(`has ${l.blank.length} blank values where English has text`);
    const userSees = l.error
      ? "the app cannot load this language at all"
      : [
          l.missing.length
            ? "a user who picked this language sees English for the missing keys"
            : null,
          l.blank.length ? "sees nothing, or English, where the blanks are" : null,
        ]
          .filter(Boolean)
          .join(", and ");
    const description =
      `The ${l.lang} locale file ${parts.join(", and ")}; ${userSees}.` +
      `\n\n` +
      `node scripts/i18n-parity.mjs compared ${path.basename(l.file)} with ${report.source}.json in ${report.dir} ` +
      `(reference keys: ${l.keys}; missing: ${l.missing.length}; blank: ${l.blank.length}; extra: ${l.extra.length}; non-string: ${l.nonString.length}). ` +
      `The fix is to add real translations for the listed keys in this file — never a blank, never a copy of the English, and never \`i18n:sync\` without its translate key, which is what wrote blanks last time. Keep every {{placeholder}} and <tag> exactly as English has it.`;
    const evidence = [
      l.error ? `parse error: ${l.error}` : null,
      quoteKeys("missing", l.missing),
      quoteKeys("blank", l.blank),
      quoteKeys("extra (not a defect)", l.extra),
      quoteKeys("non-string", l.nonString),
    ]
      .filter(Boolean)
      .join("\n");
    return {
      source: "locale_parity",
      description,
      file: l.file,
      symbol: "locale-parity",
      evidence,
      // Blanks are what a bad sync writes and what shows as nothing on screen;
      // a missing key at least falls back to English.
      severity: l.error || l.blank.length ? "high" : "medium",
      proven: true,
      touchesGuardedPath: false,
    };
  }),
});

const main = () => {
  const report = checkFolder(dir, source);
  const defects = report.locales.filter(hasDefect);

  if (findingsRepo !== null) {
    if (!findingsRepo) {
      process.stderr.write("--findings needs the repo name, e.g. --findings ally-web\n");
      process.exit(2);
    }
    process.stdout.write(`${JSON.stringify(toFindings(report, findingsRepo), null, 2)}\n`);
    return;
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${report.source}.json has ${report.keys} keys (${report.dir})\n`);
    for (const l of report.locales) {
      const line = l.error
        ? `  ${l.lang}: PARSE ERROR ${l.error}`
        : `  ${l.lang}: missing ${l.missing.length}, blank ${l.blank.length}, extra ${l.extra.length}, non-string ${l.nonString.length}`;
      process.stdout.write(`${line}${hasDefect(l) ? "  ✗" : "  ✓"}\n`);
      for (const key of l.missing.slice(0, 20)) process.stdout.write(`      missing ${key}\n`);
      if (l.missing.length > 20)
        process.stdout.write(`      … and ${l.missing.length - 20} more missing\n`);
      for (const key of l.blank.slice(0, 20)) process.stdout.write(`      blank   ${key}\n`);
      if (l.blank.length > 20)
        process.stdout.write(`      … and ${l.blank.length - 20} more blank\n`);
    }
  }
  process.exit(defects.length ? 1 : 0);
};

// Run only as a script, so the functions above stay importable by a test.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
) {
  main();
}
