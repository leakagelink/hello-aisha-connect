import { SITE_URL } from "@/lib/site";

/**
 * Origins the packaged Android/iOS shell can serve its bundled pages from.
 * Capacitor uses `https://localhost` by default on Android and
 * `capacitor://localhost` on iOS.
 */
export const NATIVE_APP_ORIGINS = [
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "file://",
];

/**
 * True when the page is running from the packaged app bundle instead of the
 * real website. In that case there is no server behind the current origin, so
 * every server call has to be sent to the live site instead.
 */
export function isBundledApp(): boolean {
  if (typeof window === "undefined") return false;
  const { protocol, hostname, port } = window.location;
  if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return true;
  // The dev server also runs on localhost, but on port 8080 with a live server.
  if ((protocol === "https:" || protocol === "http:") && hostname === "localhost" && port === "") {
    return true;
  }
  return false;
}

/** Absolute base URL every server call must target. */
export function serverOrigin(): string {
  if (typeof window === "undefined") return "";
  return isBundledApp() ? SITE_URL : window.location.origin;
}
