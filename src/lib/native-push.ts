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

async function pushPlugin() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications;
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
    const PushNotifications = await pushPlugin();

    if (Capacitor.getPlatform() === "android") {
      await PushNotifications.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: "Aisha messages",
        description: "Notifications when Aisha replies or becomes available",
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    }

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

      void Promise.all([
        PushNotifications.addListener("registration", (t) => finish({ token: t.value })),
        PushNotifications.addListener("registrationError", (error) => {
          console.error("Native push registration failed:", error);
          const detail = "error" in error ? String(error.error) : JSON.stringify(error);
          finish({ token: null, error: detail });
        }),
      ])
        .then(async ([registrationHandle, errorHandle]) => {
          handles.push(registrationHandle, errorHandle);
          await PushNotifications.register();
        })
        .catch((error) => {
          console.error("Native push registration failed:", error);
          finish({ token: null, error: error instanceof Error ? error.message : String(error) });
        });
    });

    if (!registration.token) {
      const detail = registration.error ?? "Firebase did not return a device token.";
      rememberPushError(detail);
      return { status: "error", detail };
    }

    const { error } = await supabase.from("push_tokens").upsert(
      { user_id: userId, token: registration.token, platform: Capacitor.getPlatform() },
      { onConflict: "user_id,token" },
    );
    if (error) {
      console.error("Could not save native push token:", error.message);
      rememberPushError(`Token save failed: ${error.message}`);
      return { status: "error", detail: error.message };
    }
    rememberPushError(undefined);
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

/**
 * Silently registers this device when the phone has already granted
 * notification permission (e.g. the user allowed it at install time).
 * Never shows a prompt.
 */
export async function autoRegisterNativePush(userId: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const PushNotifications = await pushPlugin();
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
    const PushNotifications = await pushPlugin();
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
      const PushNotifications = await pushPlugin();
      if (cancelled) return;

      const received = await PushNotifications.addListener(
        "pushNotificationReceived",
        (n) => {
          const data = (n.data ?? {}) as Record<string, string>;
          handlers.onForeground?.({
            title: n.title ?? undefined,
            body: n.body ?? undefined,
            path: data["path"],
          });
        },
      );
      cleanups.push(() => void received.remove());

      const opened = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          const data = (action.notification.data ?? {}) as Record<string, string>;
          const path = data["path"];
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
