import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/** Android notification channel created on the native side. */
export const ANDROID_CHANNEL_ID = "hello_aisha_channel";

export type NativePushStatus = "registered" | "denied" | "unsupported" | "error";

export type NativePushRegistration = {
  status: NativePushStatus;
  detail?: string;
};

const LAST_PUSH_ERROR_KEY = "hello-aisha-native-push-error";

function rememberPushError(detail: string | undefined) {
  if (typeof window === "undefined") return;
  if (detail) window.localStorage.setItem(LAST_PUSH_ERROR_KEY, detail);
  else window.localStorage.removeItem(LAST_PUSH_ERROR_KEY);
}

export function getLastNativePushError(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_PUSH_ERROR_KEY);
}

/** True when the app runs inside the native Android/iOS shell. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Loads the native push plugin. The plugin object is wrapped so it is never the
 * resolved value of a promise: Capacitor proxies treat any property lookup
 * (including `then`) as a native call, which throws
 * "PushNotifications.then() is not implemented".
 */
async function pushPlugin() {
  const mod = await import("@capacitor/push-notifications");
  return { plugin: mod.PushNotifications };
}

type ListenerHandle = { remove: () => Promise<void> };

/** addListener may return a handle or a promise of one depending on version. */
async function onEvent(
  plugin: Awaited<ReturnType<typeof pushPlugin>>["plugin"],
  event: string,
  cb: (payload: never) => void,
): Promise<ListenerHandle> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await Promise.resolve((plugin as any).addListener(event, cb));
  return handle as ListenerHandle;
}

/**
 * Creates the high-importance Android channel used for every push we send.
 * Creating it again with the same id is a no-op, so this is safe to call often.
 */
async function ensureAndroidChannel(
  plugin: Awaited<ReturnType<typeof pushPlugin>>["plugin"],
): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await plugin.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Aisha messages",
      description: "Notifications when Aisha replies or becomes available",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: "default",
      lights: true,
    });
  } catch (error) {
    console.error("Could not create the Android notification channel:", error);
  }
}

/**
 * Asks for native notification permission, registers with FCM and stores the
 * device registration token so the server can target this device.
 */
export async function enableNativePush(userId: string): Promise<NativePushStatus> {
  const result = await registerNativePush(userId);
  return result.status;
}

/** Registers this installation and verifies that its token reached storage. */
export async function registerNativePush(userId: string): Promise<NativePushRegistration> {
  if (!isNativeApp()) return { status: "unsupported" };
  try {
    const { plugin: PushNotifications } = await pushPlugin();

    await ensureAndroidChannel(PushNotifications);

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return { status: "denied" };

    const registration = await new Promise<{ token: string | null; error?: string }>((resolve) => {
      let settled = false;
      const handles: Array<{ remove: () => Promise<void> }> = [];
      const finish = (value: { token: string | null; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        handles.forEach((handle) => void handle.remove());
        resolve(value);
      };
      const timer = setTimeout(() => {
        finish({ token: null, error: "Firebase registration timed out. Rebuild the Android app after running npm run cap:sync." });
      }, 15000);

      void (async () => {
        try {
          handles.push(
            await onEvent(PushNotifications, "registration", (t: never) =>
              finish({ token: (t as { value: string }).value }),
            ),
            await onEvent(PushNotifications, "registrationError", (error: never) => {
              console.error("Native push registration failed:", error);
              const detail =
                error && typeof error === "object" && "error" in error
                  ? String((error as { error: unknown }).error)
                  : JSON.stringify(error);
              finish({ token: null, error: detail });
            }),
          );
          await PushNotifications.register();
        } catch (error) {
          console.error("Native push registration failed:", error);
          finish({ token: null, error: error instanceof Error ? error.message : String(error) });
        }
      })();

    });

    if (!registration.token) {
      const detail = registration.error ?? "Firebase did not return a device token.";
      rememberPushError(detail);
      return { status: "error", detail };
    }

    const saved = await saveNativeToken(userId, registration.token);
    if (!saved) {
      return { status: "error", detail: getLastNativePushError() ?? "Token save failed." };
    }
    return { status: "registered" };
  } catch (error) {
    console.error("Native push setup failed:", error);
    const detail = error instanceof Error ? error.message : "Native notification setup failed.";
    rememberPushError(detail);
    return {
      status: "error",
      detail,
    };
  }
}

const PENDING_TOKEN_KEY = "hello-aisha-pending-push-token";

/** Last token successfully stored in this session, to avoid duplicate writes. */
let lastSavedToken: { userId: string; token: string } | null = null;

/** Saves a device token for this account; remembers it if saving fails. */
export async function saveNativeToken(userId: string, token: string): Promise<boolean> {
  if (!token) return false;
  if (lastSavedToken && lastSavedToken.userId === userId && lastSavedToken.token === token) {
    return true;
  }
  const { error } = await supabase.from("push_tokens").upsert(
    { user_id: userId, token, platform: Capacitor.getPlatform() },
    { onConflict: "user_id,token" },
  );
  if (error) {
    console.error("Could not save native push token:", error.message);
    rememberPushError(`Token save failed: ${error.message}`);
    if (typeof window !== "undefined") window.localStorage.setItem(PENDING_TOKEN_KEY, token);
    return false;
  }
  rememberPushError(undefined);
  if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_TOKEN_KEY);
  return true;
}

/**
 * Keeps this device's token in the database for the signed-in account.
 * Attaches a permanent listener (so a token arriving at any time is saved),
 * retries any token that failed to save earlier, and re-registers with FCM
 * when permission is already granted. Never shows a prompt.
 */
export function startNativeTokenSync(userId: string): () => void {
  if (!isNativeApp()) return () => {};
  let cancelled = false;
  const cleanups: Array<() => void> = [];

  void (async () => {
    try {
      const { plugin: PushNotifications } = await pushPlugin();
      if (cancelled) return;

      const handle = await onEvent(PushNotifications, "registration", (t: never) => {
        void saveNativeToken(userId, (t as { value: string }).value);
      });
      cleanups.push(() => void handle.remove());

      const errorHandle = await onEvent(PushNotifications, "registrationError", (err: never) => {
        const detail =
          err && typeof err === "object" && "error" in err
            ? String((err as { error: unknown }).error)
            : JSON.stringify(err);
        console.error("Native push registration failed:", detail);
        rememberPushError(detail);
      });
      cleanups.push(() => void errorHandle.remove());


      // Retry a token that arrived before the account was ready.
      const pending =
        typeof window !== "undefined" ? window.localStorage.getItem(PENDING_TOKEN_KEY) : null;
      if (pending) await saveNativeToken(userId, pending);

      // The channel must exist before any notification is delivered.
      await ensureAndroidChannel(PushNotifications);

      const registerIfAllowed = async () => {
        const state = await PushNotifications.checkPermissions();
        if (state.receive === "granted") await PushNotifications.register();
      };
      await registerIfAllowed();

      // Re-check when the app comes back to the foreground: this picks up a
      // permission granted from system settings and any FCM token rotation
      // (for example right after an app update).
      const { App } = await import("@capacitor/app");
      const appHandle = await Promise.resolve(
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void registerIfAllowed();
        }),
      );
      cleanups.push(() => void appHandle.remove());
    } catch (error) {
      console.error("Native token sync failed:", error);
    }
  })();

  return () => {
    cancelled = true;
    cleanups.forEach((fn) => fn());
  };
}

/**
 * Silently registers this device when the phone has already granted
 * notification permission (e.g. the user allowed it at install time).
 * Never shows a prompt.
 */
export async function autoRegisterNativePush(userId: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { plugin: PushNotifications } = await pushPlugin();
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") return;
    const result = await registerNativePush(userId);
    if (result.status === "error") {
      console.error("Automatic native push registration failed:", result.detail);
    }
  } catch (error) {
    console.error("Automatic native push registration failed:", error);
  }
}

/** Removes this device's native token and stops receiving pushes. */
export async function disableNativePush(userId: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { plugin: PushNotifications } = await pushPlugin();
    await PushNotifications.removeAllListeners();
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("platform", Capacitor.getPlatform());
  } catch {
    /* ignore */
  }
}

/**
 * Handles notifications delivered to the native app: one listener for pushes
 * that arrive while the app is open, one for taps on a background/system
 * notification (which routes the user to the right screen).
 */
export function listenNativePush(handlers: {
  onForeground?: (n: {
    title?: string | undefined;
    body?: string | undefined;
    path?: string | undefined;
  }) => void;
  onOpen?: (path: string) => void;
}): () => void {
  if (!isNativeApp()) return () => {};
  let cancelled = false;
  const cleanups: Array<() => void> = [];

  void (async () => {
    try {
      const { plugin: PushNotifications } = await pushPlugin();
      if (cancelled) return;

      const received = await onEvent(
        PushNotifications,
        "pushNotificationReceived",
        (raw: never) => {
          const n = raw as { title?: string; body?: string; data?: Record<string, string> };
          const data = n.data ?? {};
          handlers.onForeground?.({
            title: n.title ?? undefined,
            body: n.body ?? undefined,
            path: data["path"],
          });
        },
      );
      cleanups.push(() => void received.remove());

      const opened = await onEvent(
        PushNotifications,
        "pushNotificationActionPerformed",
        (raw: never) => {
          const action = raw as { notification: { data?: Record<string, string> } };
          const path = (action.notification.data ?? {})["path"];
          if (path) handlers.onOpen?.(path);
        },
      );
      cleanups.push(() => void opened.remove());

    } catch {
      /* plugin unavailable */
    }
  })();

  return () => {
    cancelled = true;
    cleanups.forEach((fn) => fn());
  };
}
