import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showRewardedAd } from "@/lib/ads";

export type MediaFeature = "emoji" | "image" | "video";

export type FeatureState = {
  unlocked: boolean;
  expires_at?: string | null;
  progress_ads?: number;
  required_ads?: number;
  plan_hours?: number | null;
};

export type MediaAccess = {
  is_admin: boolean;
  requires_rewarded_ad: boolean;
  daily_limit: number | null;
  daily_used: number;
  daily_remaining: number | null;
  features: Record<MediaFeature, FeatureState>;
};

export const DAILY_AD_LIMIT = 10;

/** Ads required → unlock duration, exactly as disclosed to the user. */
export const UNLOCK_PLANS: Record<MediaFeature, { ads: number; hours: number; label: string }[]> = {
  emoji: [{ ads: 1, hours: 24, label: "1 ad · emojis for 24 hours" }],
  image: [
    { ads: 1, hours: 5, label: "1 ad · photos for 5 hours" },
    { ads: 2, hours: 12, label: "2 ads · photos for 12 hours" },
    { ads: 3, hours: 24, label: "3 ads · photos for 24 hours" },
  ],
  video: [
    { ads: 1, hours: 1, label: "1 ad · videos for 1 hour" },
    { ads: 2, hours: 2, label: "2 ads · videos for 2 hours" },
    { ads: 3, hours: 5, label: "3 ads · videos for 5 hours" },
  ],
};

export const FEATURE_LABEL: Record<MediaFeature, string> = {
  emoji: "Emoji sharing",
  image: "Photo sharing",
  video: "Video sharing",
};

export async function fetchMediaAccess(): Promise<MediaAccess | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.rpc("get_media_access");
  if (error) throw error;
  return data as unknown as MediaAccess;
}

export function useMediaAccess() {
  return useQuery({
    queryKey: ["media-access"],
    queryFn: fetchMediaAccess,
    refetchInterval: 60000,
  });
}

export type UnlockResult =
  | { ok: true; access: MediaAccess }
  | { ok: false; message: string };

const FRIENDLY_ERRORS: Record<string, string> = {
  DAILY_LIMIT_REACHED: "You have reached today's ad limit. Please try again tomorrow.",
  EMOJI_REQUIRED: "Unlock emoji sharing first.",
  IMAGE_REQUIRED: "Unlock photo sharing first.",
  ADMIN_NO_ADS: "Your account already has full media access.",
};

/**
 * Runs exactly one user-initiated rewarded ad for a feature.
 * The reward is granted server-side only after AdMob confirms completion.
 */
export async function watchOneRewardedAd(
  feature: MediaFeature,
  planAds: number,
): Promise<UnlockResult> {
  const { data: sessionId, error } = await supabase.rpc("start_rewarded_ad", {
    _feature: feature,
    _plan_ads: planAds,
  });

  if (error) {
    const key = Object.keys(FRIENDLY_ERRORS).find((k) => error.message.includes(k));
    return { ok: false, message: key ? FRIENDLY_ERRORS[key]! : "We couldn't start the ad. Please try again." };
  }

  const outcome = await showRewardedAd();

  if (!outcome.ok) {
    await supabase.rpc("cancel_rewarded_ad", { _session_id: sessionId as string });
    return {
      ok: false,
      message:
        outcome.reason === "unavailable"
          ? "Ad unavailable right now. Please try again."
          : outcome.reason === "dismissed"
            ? "The ad wasn't finished, so nothing was unlocked. You can try again."
            : "Something went wrong with the ad. Please try again.",
    };
  }

  const { data, error: completeError } = await supabase.rpc("complete_rewarded_ad", {
    _session_id: sessionId as string,
  });
  if (completeError) {
    return { ok: false, message: "We couldn't confirm the ad. Please try again." };
  }
  return { ok: true, access: data as unknown as MediaAccess };
}

export function timeLeftLabel(expiresAt?: string | null) {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}
