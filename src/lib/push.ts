import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, deleteToken, isSupported, type Messaging } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { FIREBASE_WEB_CONFIG, FIREBASE_VAPID_KEY } from "@/lib/firebase-config";
import { getFirebaseWebApiKey } from "@/lib/firebase-web.functions";

// Prefer connector-provided env vars (set when "Include web push" is enabled),
// then fall back to the public constants in firebase-config.ts.
const env = import.meta.env as Record<string, string | undefined>;
let apiKey =
  env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] ||
  FIREBASE_WEB_CONFIG.apiKey;
const projectId =
  env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] ||
  FIREBASE_WEB_CONFIG.projectId;
const appId =
  env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] ||
  FIREBASE_WEB_CONFIG.appId;
export const vapidKey =
  env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] || FIREBASE_VAPID_KEY;

interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey,
  projectId,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? FIREBASE_WEB_CONFIG.messagingSenderId,
};

/** Loads the Web API key from the server when it is not bundled. */
async function ensureApiKey(): Promise<void> {
  if (firebaseConfig.apiKey) return;
  try {
    const res = await getFirebaseWebApiKey();
    if (res?.apiKey) {
      apiKey = res.apiKey;
      firebaseConfig.apiKey = res.apiKey;
    }
  } catch {
    /* leave unconfigured */
  }
}

const PUSH_ACTIVE_FLAG = "hello-aisha-push-active";

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied";

export function isPushConfigured(): boolean {
  return Boolean(
    firebaseConfig["apiKey"] &&
      firebaseConfig["projectId"] &&
      firebaseConfig["appId"] &&
      vapidKey &&
      firebaseConfig["messagingSenderId"],
  );
}

let app: FirebaseApp | undefined;
let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (!isPushConfigured()) return null;
  if (!app) app = initializeApp(firebaseConfig);
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}


/**
 * Ask the browser for notification permission and register this device with
 * Firebase Cloud Messaging. Must be called from a user gesture (tap/click).
 */
export async function enablePush(userId: string): Promise<PushStatus> {
  await ensureApiKey();
  if (!isPushConfigured()) return "not-configured";
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  // The Lovable preview runs the app in a cross-origin iframe, where browsers
  // silently reject notification permission prompts.
  if (window.top !== window.self) return "open-in-new-tab";

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const query = new URLSearchParams(
    firebaseConfig as unknown as Record<string, string>,
  ).toString();
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
  const instance = getMessagingInstance();
  if (!instance) return "not-configured";
  const token = await getToken(instance, {
    vapidKey: vapidKey!,
    serviceWorkerRegistration: registration,
  });
  if (!token) return "denied";

  await supabase
    .from("push_tokens")
    .upsert({ user_id: userId, token, platform: "web" }, { onConflict: "user_id,token" });

  try {
    window.localStorage.setItem(PUSH_ACTIVE_FLAG, "1");
  } catch {
    /* ignore */
  }
  return "registered";
}

/** Removes this device's token from the server and unregisters it. */
export async function disablePush(userId: string): Promise<void> {
  const instance = getMessagingInstance();
  if (instance) {
    try {
      await deleteToken(instance);
    } catch {
      /* token already gone */
    }
  }
  await supabase.from("push_tokens").delete().eq("user_id", userId);
  try {
    window.localStorage.removeItem(PUSH_ACTIVE_FLAG);
  } catch {
    /* ignore */
  }
}

/** True when this device has completed FCM registration for real push. */
export function isPushActive(): boolean {
  try {
    return window.localStorage.getItem(PUSH_ACTIVE_FLAG) === "1";
  } catch {
    return false;
  }
}

export function currentPermission(): "default" | "granted" | "denied" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as "default" | "granted" | "denied";
}
