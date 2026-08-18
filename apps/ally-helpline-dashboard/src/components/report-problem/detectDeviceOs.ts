/**
 * Best-effort device/OS labels from `navigator.userAgent` for the bug report's silent
 * context capture. No dependency added for this — the codebase has no existing device/OS
 * detection util (checked before writing this), and both fields are optional server-side,
 * so a miss here just means a slightly less informative report, not a broken one.
 */
export interface DeviceOs {
  device?: string;
  os?: string;
}

export const detectDeviceOs = (): DeviceOs => {
  if (typeof navigator === "undefined" || !navigator.userAgent) return {};
  const ua = navigator.userAgent;

  const os =
    ua.match(/Windows NT [\d.]+/)?.[0] ??
    ua.match(/Mac OS X [\d_.]+/)?.[0]?.replace(/_/g, ".") ??
    ua.match(/Android [\d.]+/)?.[0] ??
    ua.match(/(?:iPhone|iPad)[^;]*OS [\d_]+/)?.[0]?.replace(/_/g, ".") ??
    (ua.includes("Linux") ? "Linux" : undefined);

  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";

  return { os, device };
};
