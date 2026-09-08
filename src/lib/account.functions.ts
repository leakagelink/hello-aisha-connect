import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in member's account and all associated data.
 * Only abuse/safety records (reports, moderation actions) are retained, as
 * disclosed in the privacy policy.
 */
export const deleteMyAccountNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("user_id", userId);
    const conversationIds = (conversations ?? []).map((c) => c.id);

    if (conversationIds.length > 0) {
      await supabaseAdmin.from("internal_notes").delete().in("conversation_id", conversationIds);
      await supabaseAdmin.from("messages").delete().in("conversation_id", conversationIds);
    }
    await supabaseAdmin.from("messages").delete().eq("sender_id", userId);
    await supabaseAdmin.from("conversations").delete().eq("user_id", userId);
    await supabaseAdmin.from("daily_checkins").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_onboarding").delete().eq("user_id", userId);
    await supabaseAdmin.from("push_tokens").delete().eq("user_id", userId);
    await supabaseAdmin.from("analytics_events").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.from("account_deletion_requests").delete().eq("user_id", userId);
    await supabaseAdmin.from("reports").delete().eq("reporter_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
