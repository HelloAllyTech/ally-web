/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_LIVEKIT_URL: string;
  readonly VITE_GOOGLE_AUTH_CLIENT_ID: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
  readonly VITE_POSTHOG_ENABLED: string;
  readonly VITE_I18N_BASE_URL?: string;
  readonly VITE_GTM_ID?: string;
  /**
   * Origin of the Ally Admin console, used by the "Ally Admin" nav link.
   * Per-environment (local :8081, dev admin host, prod admin host); falls back
   * to ADMIN_APP_URL_FALLBACK when unset. Mirrors the admin console's own
   * VITE_IMPERSONATION_APP_URL, which points back at this app.
   */
  readonly VITE_ADMIN_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
