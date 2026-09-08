import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

/** Android notification channel created on the native side. */
const ANDROID_CHANNEL_ID = "hello_aisha_channel";

/**
 * Sends a real Firebase Cloud Messaging push notification to every registered
 * device for the conversation's member. Triggered when Aisha (staff) replies or
 * accepts a conversation. Runs server-side so the gateway secrets stay private.
 */
export const sendConversationPush = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        conversationId: z.string().uuid(),
        type: z.enum(["reply", "accepted"]),
        content: z.string().optional(),
      })
      .parse(raw),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "listener" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!isStaff && !isAdmin) throw new Error("Forbidden");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !fcmKey) {
      return { sent: false, reason: "not-configured" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conv } = await supabaseAdmin
      .from("conversations")
      .select("user_id, status, blocked_by_user")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv?.user_id) return { sent: false, reason: "no-user" };
    // A member who blocked the conversation must not receive any further alerts.
    if (conv.blocked_by_user) return { sent: false, reason: "blocked" };

    // Respect the member's notification preference.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("notifications_enabled, account_status")
      .eq("id", conv.user_id)
      .maybeSingle();
    if (profile?.notifications_enabled === false) return { sent: false, reason: "disabled" };
    if (profile?.account_status && profile.account_status !== "active") {
      return { sent: false, reason: "inactive-account" };
    }

    const { data: tokens } = await supabaseAdmin
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", conv.user_id);
    if (!tokens || tokens.length === 0) return { sent: false, reason: "no-tokens" };

    const isReply = data.type === "reply";
    const title = isReply
      ? "Aisha replied to your message."
      : "Your conversation request has been accepted.";
    const body = isReply
      ? (data.content ?? "").slice(0, 120)
      : "Aisha is ready to talk.";
    const path = isReply ? `/chat/${data.conversationId}` : "/chats";

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcmKey,
      "Content-Type": "application/json",
    };

    const stale: string[] = [];
    await Promise.all(
      tokens.map(async (row) => {
        try {
          const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: {
                token: row.token,
                notification: { title, body },
                data: { path },
                android: {
                  priority: "HIGH",
                  notification: {
                    channel_id: ANDROID_CHANNEL_ID,
                    default_sound: true,
                    default_vibrate_timings: true,
                    notification_priority: "PRIORITY_HIGH",
                  },
                },
              },
            }),
          });
          if (res.status === 404 || res.status === 400) {
            const errorBody = await res.text();
            if (/UNREGISTERED|INVALID_ARGUMENT/i.test(errorBody)) stale.push(row.id);
          } else if (!res.ok) {
            const errorBody = await res.text();
            console.error(`FCM send failed [${res.status}]: ${errorBody}`);
          }
        } catch (err) {
          console.error("FCM send error:", err);
        }
      }),
    );

    if (stale.length > 0) {
      await supabaseAdmin.from("push_tokens").delete().in("id", stale);
    }

    return { sent: true };
  });

/**
 * Sends a real push to every member who has notifications on, when Aisha
 * switches her availability to "available". Only staff may trigger it.
 */
export const sendAvailabilityPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  const { data: isStaff } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "listener",
  });
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isStaff && !isAdmin) throw new Error("Forbidden");
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !fcmKey) return { sent: false, reason: "not-configured" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows } = await supabaseAdmin
    .from("push_tokens")
    .select("id, token, user_id");
  if (!rows || rows.length === 0) return { sent: false, reason: "no-tokens" };

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, notifications_enabled, account_status");
  const allowed = new Set(
    (profiles ?? [])
      .filter((p) => p.notifications_enabled !== false && p.account_status === "active")
      .map((p) => p.id),
  );

  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": fcmKey,
    "Content-Type": "application/json",
  };
  const stale: string[] = [];

  await Promise.all(
    rows
      .filter((r) => allowed.has(r.user_id))
      .map(async (row) => {
        try {
          const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: {
                token: row.token,
                notification: {
                  title: "Aisha is available.",
                  body: "You can start a conversation now.",
                },
                data: { path: "/home" },
                android: {
                  priority: "HIGH",
                  notification: {
                    channel_id: ANDROID_CHANNEL_ID,
                    default_sound: true,
                    default_vibrate_timings: true,
                    notification_priority: "PRIORITY_HIGH",
                  },
                },
              },
            }),
          });
          if (res.status === 404 || res.status === 400) {
            const errorBody = await res.text();
            if (/UNREGISTERED|INVALID_ARGUMENT/i.test(errorBody)) stale.push(row.id);
          }
        } catch (err) {
          console.error("FCM send error:", err);
        }
      }),
  );

  if (stale.length > 0) await supabaseAdmin.from("push_tokens").delete().in("id", stale);
  return { sent: true };
});

/**
 * Sends a test push to every registered device (staff only). Used to verify
 * that phones actually receive notifications outside the app.
 */
export const sendTestPushToAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isStaff } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "listener",
    });
    if (!isAdmin && !isStaff) throw new Error("Forbidden");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !fcmKey) return { sent: 0, failed: 0, devices: 0, reason: "not-configured" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("push_tokens").select("id, token, user_id");
    if (!rows || rows.length === 0) return { sent: 0, failed: 0, devices: 0, reason: "no-tokens" };

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcmKey,
      "Content-Type": "application/json",
    };

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];

    await Promise.all(
      rows.map(async (row) => {
        try {
          const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: {
                token: row.token,
                notification: {
                  title: "Hello Aisha",
                  body: "Test notification — notifications are working on this device.",
                },
                data: { path: "/home" },
                android: {
                  priority: "HIGH",
                  notification: {
                    channel_id: ANDROID_CHANNEL_ID,
                    default_sound: true,
                    default_vibrate_timings: true,
                    notification_priority: "PRIORITY_HIGH",
                  },
                },
              },
            }),
          });
          if (res.ok) {
            sent += 1;
          } else {
            failed += 1;
            const errorBody = await res.text();
            if (/UNREGISTERED|INVALID_ARGUMENT/i.test(errorBody)) stale.push(row.id);
            console.error(`Test push failed [${res.status}]: ${errorBody}`);
          }
        } catch (err) {
          failed += 1;
          console.error("Test push error:", err);
        }
      }),
    );

    if (stale.length > 0) await supabaseAdmin.from("push_tokens").delete().in("id", stale);
    return { sent, failed, devices: rows.length };
  });

/**
 * Notifies Aisha (every listener/admin device) when a member sends a message or
 * opens a new conversation request. Callable by the conversation's own member.
 */
export const sendStaffPush = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        conversationId: z.string().uuid(),
        type: z.enum(["message", "request"]),
        content: z.string().optional(),
      })
      .parse(raw),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !fcmKey) return { sent: false, reason: "not-configured" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only the conversation's own member may trigger this.
    const { data: conv } = await supabaseAdmin
      .from("conversations")
      .select("user_id, blocked_by_user")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv || conv.user_id !== context.userId) return { sent: false, reason: "forbidden" };
    if (conv.blocked_by_user) return { sent: false, reason: "blocked" };

    const { data: staffRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["listener", "admin"]);
    const staffIds = Array.from(new Set((staffRoles ?? []).map((r) => r.user_id)));
    if (staffIds.length === 0) return { sent: false, reason: "no-staff" };

    const { data: tokens } = await supabaseAdmin
      .from("push_tokens")
      .select("id, token")
      .in("user_id", staffIds);
    if (!tokens || tokens.length === 0) return { sent: false, reason: "no-tokens" };

    const isMessage = data.type === "message";
    const title = isMessage ? "New message from a member" : "New conversation request";
    const body = isMessage
      ? (data.content ?? "").slice(0, 120) || "Open the inbox to reply."
      : "Someone is waiting to talk.";
    const path = isMessage ? `/admin/chat/${data.conversationId}` : "/admin";

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcmKey,
      "Content-Type": "application/json",
    };

    const stale: string[] = [];
    await Promise.all(
      tokens.map(async (row) => {
        try {
          const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: {
                token: row.token,
                notification: { title, body },
                data: { path },
                android: {
                  priority: "HIGH",
                  notification: {
                    channel_id: ANDROID_CHANNEL_ID,
                    default_sound: true,
                    default_vibrate_timings: true,
                    notification_priority: "PRIORITY_HIGH",
                  },
                },
              },
            }),
          });
          if (!res.ok) {
            const errorBody = await res.text();
            if (/UNREGISTERED|INVALID_ARGUMENT/i.test(errorBody)) stale.push(row.id);
            console.error(`Staff push failed [${res.status}]: ${errorBody}`);
          }
        } catch (err) {
          console.error("Staff push error:", err);
        }
      }),
    );

    if (stale.length > 0) await supabaseAdmin.from("push_tokens").delete().in("id", stale);
    return { sent: true, devices: tokens.length };
  });
