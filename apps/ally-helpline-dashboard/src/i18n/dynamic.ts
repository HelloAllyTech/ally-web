import type { i18n as I18nInstance } from "i18next";

type DynamicI18nManifest = {
  version: number;
  currentVersion: string;
  publishedAt: string;
  languages: string[];
  namespaces: string[];
  files?: Record<string, string[]>;
};

type TranslationResource = Record<string, unknown>;

type StartDynamicI18nOptions = {
  force?: boolean;
  disablePolling?: boolean;
};

const MANIFEST_RECHECK_MS = 30_000;
const DEFAULT_I18N_BASE_URL = "/i18n";
const DEFAULT_FALLBACK_LNG = "en";
const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "ta", "kn"] as const;
const LOCAL_VERSION_KEY = "ally:i18n:version";
const STARTED_MARKER = "__allyDynamicI18nStarted";

const getResourceCacheKey = (version: string, language: string) =>
  `ally:i18n:${version}:${language}`;

const getBaseUrl = () => {
  const configured = import.meta.env.VITE_I18N_BASE_URL?.trim().split(/\s|VITE_/)[0];
  return (configured || DEFAULT_I18N_BASE_URL).replace(/\/+$/, "");
};

const fetchJson = async <T>(url: string, cache: RequestCache): Promise<T> => {
  const response = await fetch(url, { cache });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const getBrowserLanguage = (i18n: I18nInstance) =>
  (i18n.resolvedLanguage || i18n.language || DEFAULT_FALLBACK_LNG).toLowerCase();

const resolveLanguage = (i18n: I18nInstance, manifest?: DynamicI18nManifest) => {
  const browserLanguage = getBrowserLanguage(i18n);
  const baseLanguage = browserLanguage.split("-")[0];
  const manifestLanguages = manifest?.languages ?? [];

  if (manifestLanguages.includes(browserLanguage)) return browserLanguage;
  if (manifestLanguages.includes(baseLanguage)) return baseLanguage;
  if (manifestLanguages.includes(DEFAULT_FALLBACK_LNG)) return DEFAULT_FALLBACK_LNG;
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(baseLanguage)) return baseLanguage;
  return DEFAULT_FALLBACK_LNG;
};

const applyResourceBundle = (
  i18n: I18nInstance,
  language: string,
  resource: TranslationResource,
) => {
  i18n.addResourceBundle(language, "translation", resource, true, true);
};

const readCachedResource = (version: string | null, language: string) => {
  if (!version) return null;

  try {
    const cached = localStorage.getItem(getResourceCacheKey(version, language));
    return cached ? (JSON.parse(cached) as TranslationResource) : null;
  } catch {
    return null;
  }
};

const writeCachedResource = (version: string, language: string, resource: TranslationResource) => {
  try {
    localStorage.setItem(LOCAL_VERSION_KEY, version);
    localStorage.setItem(getResourceCacheKey(version, language), JSON.stringify(resource));
  } catch {
    // Storage can be unavailable in private mode or under quota pressure.
  }
};

const fetchManifest = (baseUrl: string) =>
  fetchJson<DynamicI18nManifest>(`${baseUrl}/manifest.json`, "no-cache");

const fetchVersionedResource = async (
  baseUrl: string,
  manifest: DynamicI18nManifest,
  language: string,
) => {
  const resourceEntries = await Promise.all(
    manifest.namespaces.map(async namespace => {
      const namespaceResource = await fetchJson<unknown>(
        `${baseUrl}/${manifest.currentVersion}/${language}/${namespace}.json`,
        "force-cache",
      );
      return [namespace, namespaceResource] as const;
    }),
  );

  return Object.fromEntries(resourceEntries);
};

const applyCachedResourceForCurrentLanguage = (
  i18n: I18nInstance,
  apply: (language: string, resource: TranslationResource) => void = (language, resource) =>
    applyResourceBundle(i18n, language, resource),
) => {
  const version = localStorage.getItem(LOCAL_VERSION_KEY);
  const language = resolveLanguage(i18n);
  const cached = readCachedResource(version, language);
  if (!cached) return;

  apply(language, cached);
};

export const startDynamicI18n = (i18n: I18nInstance, options: StartDynamicI18nOptions = {}) => {
  if (typeof window === "undefined" || typeof fetch !== "function") return;
  if (import.meta.env.MODE === "test" && !options.force) return;

  const globalWindow = window as unknown as Window & Record<string, boolean | undefined>;
  if (globalWindow[STARTED_MARKER]) return;
  globalWindow[STARTED_MARKER] = true;

  const baseUrl = getBaseUrl();
  console.log(baseUrl, "baseUrl");
  let refreshInFlight: Promise<void> | null = null;
  let applyingResource = false;

  const applyDynamicResource = (language: string, resource: TranslationResource) => {
    applyingResource = true;
    applyResourceBundle(i18n, language, resource);
    void i18n.changeLanguage(i18n.language).finally(() => {
      applyingResource = false;
    });
  };

  const refresh = async () => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      try {
        const manifest = await fetchManifest(baseUrl);
        const language = resolveLanguage(i18n, manifest);
        const cachedVersion = localStorage.getItem(LOCAL_VERSION_KEY);
        const cachedResource = readCachedResource(manifest.currentVersion, language);

        if (cachedVersion === manifest.currentVersion && cachedResource) {
          applyDynamicResource(language, cachedResource);
          return;
        }

        const resource = await fetchVersionedResource(baseUrl, manifest, language);
        applyDynamicResource(language, resource);
        writeCachedResource(manifest.currentVersion, language, resource);
      } catch {
        applyCachedResourceForCurrentLanguage(i18n, applyDynamicResource);
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  };

  applyCachedResourceForCurrentLanguage(i18n, applyDynamicResource);
  void refresh();

  if (!options.disablePolling) {
    window.addEventListener("focus", () => {
      void refresh();
    });
    window.setInterval(() => {
      void refresh();
    }, MANIFEST_RECHECK_MS);
  }

  i18n.on("languageChanged", () => {
    if (applyingResource) return;
    void refresh();
  });
};
