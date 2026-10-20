import fs from "node:fs/promises";
import path from "node:path";

const LOCALES_DIR = "apps/ally-helpline-dashboard/src/i18n/locales";
const LANGUAGES = ["en", "hi", "mr", "ta", "kn"];
const NOTE = "CI sync: auto-added new translation keys from repo";

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

  // One request per language. ally-be parses JSON bodies with a 1mb limit, and all five locales
  // in one body crossed it once i18n:sync had machine-translated a feature's new keys into the
  // four Indic locales (helpline-v1.49.14 died on HTTP 500 PayloadTooLargeError at ~1.03MB).
  // ciSync handles each language on its own and only adds missing keys, so splitting changes
  // nothing but the number of published versions: one per language that actually gained keys.
  // A re-run after a mid-loop failure is safe for the same reason.
  const bodies = LANGUAGES.map(lang => ({
    lang,
    body: JSON.stringify({ locales: { [lang]: locales[lang] }, note: `${NOTE} (${lang})` }),
  }));

  if (DRY_RUN) {
    for (const { lang, body } of bodies) {
      const kb = Math.round(Buffer.byteLength(body) / 1024);
      console.log(`[DRY RUN] Would POST /api/v1/i18n/ci-sync for ${lang} (${kb} KB)`);
    }
    return;
  }

  console.log(`Syncing translations to ${API_BASE_URL}`);

  let published = 0;
  for (const { lang, body } of bodies) {
    const res = await fetch(`${API_BASE_URL}/api/v1/i18n/ci-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ci-sync failed for ${lang} (HTTP ${res.status}): ${text}`);
    }

    const text = await res.text();
    const manifest = text ? JSON.parse(text) : null;
    if (!manifest) {
      console.log(`${lang}: already in sync`);
      continue;
    }

    published += 1;
    console.log(`${lang}: published version ${manifest.currentVersion}`);
  }

  if (published === 0) console.log("Draft already in sync — nothing to publish.");
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
