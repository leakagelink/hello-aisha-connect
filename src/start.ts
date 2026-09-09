import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { NATIVE_APP_ORIGINS, isBundledApp, serverOrigin } from "@/lib/server-origin";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/** True for the packaged Android/iOS app talking to the live site. */
function isNativeAppOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return NATIVE_APP_ORIGINS.includes(origin);
}

const CORS_HEADERS = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization,x-tsr-redirect",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

/**
 * The packaged mobile app serves its pages from a local origin, so its calls to
 * this server are cross-origin. Allow exactly those app origins (and nothing
 * else) so notifications and other server actions work inside the app.
 */
const nativeCorsMiddleware = createMiddleware().server(async ({ next, request }) => {
  const origin = request.headers.get("Origin");
  if (!isNativeAppOrigin(origin)) return next();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS(origin!) });
  }
  const result = await next();
  const response = (result as unknown as { response?: Response }).response;
  const target = response instanceof Response ? response : (result as unknown as Response);
  if (target instanceof Response) {
    Object.entries(CORS_HEADERS(origin!)).forEach(([key, value]) =>
      target.headers.set(key, value),
    );
  }
  return result;
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests. The packaged mobile app is the one trusted
// cross-origin caller.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  secFetchSite: (value, ctx) => {
    if (value === "same-origin" || value === "none") return true;
    return isNativeAppOrigin(ctx.request.headers.get("Origin"));
  },
  origin: (value, ctx) =>
    value === new URL(ctx.request.url).origin || isNativeAppOrigin(value),
});

/**
 * Inside the packaged app there is no server behind the local origin, so every
 * server call is sent to the live site instead.
 */
const serverFnFetch: typeof fetch = async (input, init) => {
  if (!isBundledApp()) return fetch(input, init);
  const base = serverOrigin();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let target = url;
  if (url.startsWith("/")) target = `${base}${url}`;
  else if (url.startsWith(window.location.origin)) {
    target = `${base}${url.slice(window.location.origin.length)}`;
  } else {
    return fetch(input, init);
  }

  try {
    const response = await fetch(target, { ...init, mode: "cors", credentials: "omit" });
    if (!response.ok) {
      // Diagnostic only: path and status, never tokens or message content.
      console.warn(`Server call failed: ${new URL(target).pathname} -> ${response.status}`);
    }
    return response;
  } catch (error) {
    console.warn(`Server call could not be reached: ${new URL(target).pathname}`, error);
    throw error;
  }
};

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, nativeCorsMiddleware, csrfMiddleware],
  serverFns: { fetch: serverFnFetch },
}));
