/**
 * The talker-page path rule and the GTM snippet that honours it. DOM-free,
 * import-free and env-free on purpose: vite.config.ts imports this file at
 * build time (under tsconfig.node.json, which has no DOM lib), outside the
 * app's path aliases and `import.meta.env`. See talkPrivacy.ts for why.
 */

export const TALK_PATH_PREFIX = "/talk";

/** `/talk` and anything under it — the public talker page. */
export const isTalkPath = (pathname: string | null | undefined): boolean =>
  typeof pathname === "string" &&
  (pathname === TALK_PATH_PREFIX || pathname.startsWith(`${TALK_PATH_PREFIX}/`));

/**
 * The standard GTM head snippet, guarded so it does nothing on a `/talk` path.
 * The guard runs in the browser at page load, from `window.location.pathname`,
 * because index.html is one file served for every route of the SPA.
 */
export const buildGtmHeadSnippet = (gtmId: string): string =>
  "(function(w,d,s,l,i){" +
  `var p=w.location.pathname;if(p==='${TALK_PATH_PREFIX}'||p.indexOf('${TALK_PATH_PREFIX}/')===0)return;` +
  "w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});" +
  "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';" +
  "j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
  `})(window,document,'script','dataLayer','${gtmId}');`;
