/**
 * Where this build of the admin console is being served.
 *
 * The same SPA ships to two places:
 *
 *  - **standalone** — its own origin, mounted at `/`. The long-standing admin
 *    dashboard, for SUPER_ADMIN / SUPER_DUPER_ADMIN / MULTI_TENANT_ADMIN.
 *  - **embedded** — path-mounted at `/admin` on the consumer app's origin, so
 *    Ally staff holding the INTERNAL role reach the console without leaving
 *    app.helloally.ai. Same code, same features; only the mount point and the
 *    set of roles accepted at login differ.
 *
 * There is exactly one knob: the Vite `base` build option, driven by
 * `VITE_ADMIN_BASE_PATH` (see vite.config.ts). Vite echoes it back as
 * `import.meta.env.BASE_URL`, always with a trailing slash. Deriving the
 * surface from the mount point rather than a second flag means the two can
 * never disagree — a build served under `/admin` *is* the embedded surface.
 *
 * Tests and dev servers get the default `/`, i.e. standalone.
 */

/** The mount point, always "/"-terminated (Vite's contract for BASE_URL). */
export const BASE_PATH: string = import.meta.env.BASE_URL || "/";

/**
 * Router basename and prefix for hand-built URLs: "" at the root, "/admin"
 * when path-mounted. React Router wants no trailing slash here.
 */
export const ROUTER_BASENAME: string = BASE_PATH.replace(/\/+$/, "");

/**
 * True when the console is path-mounted on the consumer app's origin rather
 * than served from its own root.
 */
export const isEmbeddedSurface = (): boolean => ROUTER_BASENAME !== "";

/**
 * Prefix a route with the mount point. Needed only for `window.location`
 * assignments and other URLs built outside the router — anything routed
 * through React Router already resolves against the basename.
 */
export const withBasePath = (route: string): string =>
  `${ROUTER_BASENAME}${route.startsWith("/") ? route : `/${route}`}`;
