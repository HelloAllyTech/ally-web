import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_LOCALES_DIR = "apps/ally-helpline-dashboard/src/i18n/locales";
const DEFAULT_SOURCE_LANG = "en";
const DEFAULT_VERSION_DIR = "apps/ally-helpline-dashboard/src/i18n/versions";

const LOCALES_DIR = process.env.LOCALES_DIR ?? DEFAULT_LOCALES_DIR;
const SOURCE_LANG = process.env.SOURCE_LANG ?? DEFAULT_SOURCE_LANG;
const VERSION_DIR = process.env.VERSION_DIR ?? DEFAULT_VERSION_DIR;
const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER ?? "openai";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const DRY_RUN = (process.env.DRY_RUN ?? "false").toLowerCase() === "true";
const SHOULD_TRANSLATE = TRANSLATION_PROVIDER === "openai" && Boolean(OPENAI_API_KEY);

const PLACEHOLDER_REGEX = /\{\{[^}]+\}\}|<[^>]+>/g;

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = async filePath => {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
};

const writeJson = async (filePath, data) => {
  if (DRY_RUN) return;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
};

const collectJsonFiles = async dir => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
    .map(entry => entry.name);
};

const getLocaleFilePath = lang => path.join(LOCALES_DIR, `${lang}.json`);

const getVersionFilePath = lang => path.join(VERSION_DIR, `${lang}.json`);

const replacePlaceholders = text => {
  const placeholders = [];
  const masked = text.replace(PLACEHOLDER_REGEX, match => {
    const token = `__TOKEN_${placeholders.length}__`;
    placeholders.push({ token, value: match });
    return token;
  });
  return { masked, placeholders };
};

const restorePlaceholders = (text, placeholders) => {
  return placeholders.reduce((result, { token, value }) => result.split(token).join(value), text);
};

const translateWithOpenAI = async ({ text, targetLang }) => {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a professional localization engine. Translate the user text exactly, preserving placeholders and HTML tags, and return only the translated string.",
        },
        {
          role: "user",
          content: `Translate to ${targetLang}: ${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI translation failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const translated = data?.choices?.[0]?.message?.content?.trim();
  if (!translated) {
    return null;
  }

  return translated;
};

const translateText = async ({ text, targetLang }) => {
  if (!text || typeof text !== "string") return text;
  if (!SHOULD_TRANSLATE) return null;
  const { masked, placeholders } = replacePlaceholders(text);

  let translated = masked;
  if (TRANSLATION_PROVIDER === "openai") {
    const result = await translateWithOpenAI({ text: masked, targetLang });
    if (!result) return null;
    translated = result;
  } else if (TRANSLATION_PROVIDER === "noop") {
    return null;
  } else {
    throw new Error(`Unsupported TRANSLATION_PROVIDER: ${TRANSLATION_PROVIDER}`);
  }

  return restorePlaceholders(translated, placeholders);
};

const deepClone = value => {
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item));
  }
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepClone(v)]));
  }
  return value;
};

const fillMissingTranslations = async ({
  source,
  target,
  targetLang,
  missingKeys,
  collectOnly,
}) => {
  let updated = false;

  const walk = async (sourceNode, targetNode, pathKey) => {
    if (typeof sourceNode === "string") {
      if (targetNode === undefined || targetNode === null) {
        updated = true;
        if (missingKeys) missingKeys.push(pathKey);
        if (collectOnly) return targetNode;
        const translated = await translateText({ text: sourceNode, targetLang });
        return translated ?? sourceNode;
      }
      return targetNode;
    }

    if (Array.isArray(sourceNode)) {
      const targetArray = Array.isArray(targetNode) ? targetNode : [];
      const results = [];
      for (let i = 0; i < sourceNode.length; i += 1) {
        results.push(await walk(sourceNode[i], targetArray[i], `${pathKey}[${i}]`));
      }
      if (targetArray.length !== results.length) updated = true;
      return results;
    }

    if (isObject(sourceNode)) {
      const result = { ...(isObject(targetNode) ? targetNode : {}) };
      const entries = Object.entries(sourceNode);
      for (const [key, value] of entries) {
        const nextKey = pathKey ? `${pathKey}.${key}` : key;
        result[key] = await walk(value, result[key], nextKey);
      }
      const targetKeys = Object.keys(result);
      const sourceKeys = Object.keys(sourceNode);
      if (targetKeys.length !== sourceKeys.length) updated = true;
      return result;
    }

    return targetNode ?? deepClone(sourceNode);
  };

  const merged = await walk(source, target, "");
  return { merged, updated };
};

const bumpVersion = async lang => {
  const versionFilePath = getVersionFilePath(lang);
  let currentVersion = 0;

  try {
    const current = await readJson(versionFilePath);
    currentVersion = Number(current?.version ?? 0);
  } catch {
    currentVersion = 0;
  }

  const nextVersion = currentVersion + 1;
  await writeJson(versionFilePath, {
    version: nextVersion,
    updatedAt: new Date().toISOString(),
  });
};

const main = async () => {
  const localeFiles = await collectJsonFiles(LOCALES_DIR);
  if (!localeFiles.includes(`${SOURCE_LANG}.json`)) {
    throw new Error(`Source language file not found: ${SOURCE_LANG}.json`);
  }

  const targetLangs = localeFiles
    .map(file => path.basename(file, ".json"))
    .filter(lang => lang !== SOURCE_LANG);

  const source = await readJson(getLocaleFilePath(SOURCE_LANG));

  let anyUpdates = false;
  const updatedLangs = new Set();
  const collectOnly = !SHOULD_TRANSLATE;

  if (collectOnly) {
    console.log("Translation skipped: OPENAI_API_KEY missing or provider disabled.");
  }

  for (const lang of targetLangs) {
    const targetPath = getLocaleFilePath(lang);
    const target = await readJson(targetPath);
    const missingKeys = [];

    const { merged, updated } = await fillMissingTranslations({
      source,
      target,
      targetLang: lang,
      missingKeys,
      collectOnly,
    });

    if (missingKeys.length > 0) {
      console.log(`[${lang}] Missing keys (${missingKeys.length}):`);
      missingKeys.forEach(key => console.log(`  - ${key}`));
    }

    if (updated && !collectOnly) {
      anyUpdates = true;
      updatedLangs.add(lang);
      await writeJson(targetPath, merged);
    }
  }

  if (anyUpdates) {
    if (DRY_RUN) {
      console.log(`Detected missing translations for: ${Array.from(updatedLangs).join(", ")}.`);
    } else {
      await bumpVersion(SOURCE_LANG);
      for (const lang of targetLangs) {
        await bumpVersion(lang);
      }
    }
  }

  if (!anyUpdates) {
    console.log("No missing translations found.");
  }
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
