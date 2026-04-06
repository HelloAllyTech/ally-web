/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** When `"true"`, cover image upload skips 16:9 aspect validation (local dev only). */
  readonly VITE_BYPASS_COVER_IMAGE_VALIDATION?: string;
}
