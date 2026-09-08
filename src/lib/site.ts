/**
 * The canonical public address of Hello Aisha.
 * Used for sharing metadata and for sign-in return links.
 */
export const SITE_URL = "https://helloaisha.online";

/**
 * Where sign-in should send people back to.
 *
 * On the web (including the preview) we return to the exact address the app is
 * running on. Inside a packaged mobile app the page is served from a local
 * scheme such as `capacitor://` or `file://`, which the sign-in provider can't
 * return to — so we fall back to the real site address instead.
 */
export function authReturnUrl(path = "/"): string {
  const base =
    typeof window !== "undefined" &&
    (window.location.protocol === "http:" || window.location.protocol === "https:")
      ? window.location.origin
      : SITE_URL;
  return path === "/" ? base : `${base}${path}`;
}
