import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in member's account and all associated data.
 *
 * - Server-side, authenticated and authorized (acts only on context.userId).
 * - Data removal runs in a single transactional SQL routine (purge_user_data).
 * - Idempotent and safely retryable: re-running on an already deleted account
 *   succeeds without error.
 * - Only a minimal pseudonymous safety record is retained (no email, no chat
 *   content), auto-expiring after 12 months.
 */
export const deleteMyAccountNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    if (!userId) throw new Error("Not signed in.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const fail = async (message: string): Promise<never> => {
      // Record the failure for administrators; never surface internals to the user.
      await supabaseAdmin.rpc("record_deletion_failure", {
        _user_id: userId,
        _error: message,
      });
      console.error("[account-deletion] failed", { userId, message });
      throw new Error("DELETION_FAILED");
    };

    const purge = await supabaseAdmin.rpc("purge_user_data", { _user_id: userId });
    if (purge.error) return fail(purge.error.message);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      const notFound =
        error.status === 404 || /not found/i.test(error.message ?? "");
      if (!notFound) return fail(error.message);
    }

    // Opportunistic retention cleanup of expired safety records.
    await supabaseAdmin.rpc("purge_expired_safety_records");

    return { ok: true as const };
  });
