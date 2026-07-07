/* eslint-disable no-undef, no-console */
import fs from "node:fs/promises";
import path from "node:path";

const LOCALES_DIR = "apps/ally-helpline-dashboard/src/i18n/locales";
const LANGUAGES = ["en", "hi", "mr", "ta", "kn"];

const API_BASE_URL = process.env.ALLY_API_BASE_URL?.replace(/\/+$/, "");
const API_KEY = process.env.ALLY_API_KEY;
const DRY_RUN = (process.env.DRY_RUN ?? "false").toLowerCase() === "true";

if (!API_BASE_URL || !API_KEY) {
  console.error("ALLY_API_BASE_URL and ALLY_API_KEY are required");
  process.exit(1);
}

const main = async () => {
  const locales = {};
  for (const lang of LANGUAGES) {
    const raw = await fs.readFile(path.join(LOCALES_DIR, `${lang}.json`), "utf-8");
    locales[lang] = JSON.parse(raw);
  }

  if (DRY_RUN) {
    const keyCount = Object.keys(locales.en ?? {}).length;
    console.log(
      `[DRY RUN] Would POST /api/v1/i18n/ci-sync with ${LANGUAGES.length} locales (~${keyCount} top-level keys in en)`,
    );
    return;
  }

  console.log(`Syncing translations to ${API_BASE_URL}`);

  const res = await fetch(`${API_BASE_URL}/api/v1/i18n/ci-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ locales, note: "CI sync: auto-added new translation keys from repo" }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ci-sync failed (HTTP ${res.status}): ${text}`);
  }

  const text = await res.text();
  const manifest = text ? JSON.parse(text) : null;
  if (!manifest) {
    console.log("Draft already in sync — nothing to publish.");
    return;
  }

  console.log(`Published version ${manifest.currentVersion}`);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
