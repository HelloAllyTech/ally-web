const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

/**
 * Where the "Ally Admin" nav link points. Production is the default so the link
 * works without an infra change; every non-prod environment must set
 * VITE_ADMIN_APP_URL (local: http://localhost:8081) or its admins will be sent
 * to the production console.
 */
const ADMIN_APP_URL_FALLBACK = "https://admin.helloally.ai";

const adminAppUrl = (import.meta.env.VITE_ADMIN_APP_URL || ADMIN_APP_URL_FALLBACK).replace(
  /\/+$/,
  "",
);

export { apiBaseUrl, adminAppUrl };
