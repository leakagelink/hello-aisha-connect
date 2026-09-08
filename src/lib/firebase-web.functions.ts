import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the Firebase Web API key. This value is publishable by Firebase's
 * design, but it is stored as a project secret, so the browser fetches it at
 * runtime instead of having it baked into the bundle.
 */
export const getFirebaseWebApiKey = createServerFn({ method: "GET" }).handler(
  async () => {
    const key =
      process.env["GOOGLE_API_KEY"] ||
      process.env["FIREBASE_WEB_API_KEY"] ||
      "";
    return { apiKey: key };
  },
);
