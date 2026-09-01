/**
 * The mobile force-update threshold: the minimum app version ally-mobile
 * clients compare their own version against on launch, showing a
 * non-dismissable force-update screen if they're below it. Stored as a
 * global_settings row on ally-be, not in code, so it applies immediately with
 * no deploy — which also means there is nothing here to protect a careless
 * admin from locking out every user on a platform except a very deliberate
 * confirmation flow. Setting it above whatever's actually live on the App
 * Store / Play Store hard-locks that platform's users onto a version they
 * cannot download.
 */
export interface MinimumAppVersionResponse {
  minimumSupportedVersion: string;
}

/**
 * PUT /v1/app-version/app-version request body. Both optional — send only
 * the platform(s) being changed; omitting one leaves its current threshold
 * untouched rather than clearing it.
 */
export interface UpdateMinimumAppVersionRequest {
  ios?: string;
  android?: string;
}
