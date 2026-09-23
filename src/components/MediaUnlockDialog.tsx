import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Unlock, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { adsAvailableOnThisDevice } from "@/lib/ads";
import {
  DAILY_AD_LIMIT,
  FEATURE_LABEL,
  UNLOCK_PLANS,
  timeLeftLabel,
  watchOneRewardedAd,
  type MediaAccess,
  type MediaFeature,
} from "@/lib/media-access";

/**
 * Optional rewarded-ad unlocks for emoji, photo and video sharing.
 * Text chat is always free and is never gated by this dialog.
 */
export function MediaUnlockDialog({
  open,
  onOpenChange,
  access,
  feature,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: MediaAccess | null | undefined;
  feature: MediaFeature;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, [open]);

  if (!access || access.is_admin) return null;

  const state = access.features[feature];
  const remaining = access.daily_remaining ?? DAILY_AD_LIMIT;
  const limitReached = remaining <= 0;
  const emojiReady = access.features.emoji.unlocked;
  const imageReady = access.features.image.unlocked;
  const blocked =
    feature === "image" && !emojiReady
      ? "Unlock emoji sharing first, then photo sharing becomes available."
      : feature === "video" && !imageReady
        ? "Unlock photo sharing first, then video sharing becomes available."
        : null;

  const progress = state.progress_ads ?? 0;
  const required = state.required_ads ?? 0;

  const run = async (planAds: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await watchOneRewardedAd(feature, planAds);
      await queryClient.invalidateQueries({ queryKey: ["media-access"] });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      const next = result.access.features[feature];
      if (next.unlocked) {
        toast.success(`${FEATURE_LABEL[feature]} unlocked. ${timeLeftLabel(next.expires_at)}`);
        onOpenChange(false);
      } else {
        toast.success(
          `Ad completed: ${next.progress_ads ?? 0} of ${next.required_ads ?? planAds} done. Tap Watch ad again when you're ready.`,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {state.unlocked ? (
              <Unlock className="size-4 text-primary" />
            ) : (
              <Lock className="size-4 text-muted-foreground" />
            )}
            {FEATURE_LABEL[feature]}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Text chat is always free. Watching an ad is completely optional and only unlocks this
            in-app feature for a limited time.
          </DialogDescription>
        </DialogHeader>

        {state.unlocked ? (
          <div className="rounded-2xl bg-secondary p-4 text-sm">
            <p className="font-semibold">Status: Unlocked</p>
            <p className="mt-1 text-muted-foreground">{timeLeftLabel(state.expires_at)}</p>
          </div>
        ) : blocked ? (
          <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">{blocked}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Status: <span className="font-semibold">Locked</span>
            </p>
            {required > 0 ? (
              <p className="text-xs text-muted-foreground">
                Progress: {progress} of {required} ads completed · {Math.max(required - progress, 0)}{" "}
                remaining
              </p>
            ) : null}

            {!adsAvailableOnThisDevice() ? (
              <p className="rounded-2xl bg-secondary p-3 text-xs text-muted-foreground">
                Ads are available in the Hello Aisha Android app. Text chat works everywhere.
              </p>
            ) : null}

            <div className="space-y-2">
              {UNLOCK_PLANS[feature].map((plan) => {
                const active = required > 0 && required === plan.ads;
                const left = active ? Math.max(required - progress, 0) : plan.ads;
                return (
                  <Button
                    key={plan.ads}
                    variant={active ? "default" : "secondary"}
                    className="h-auto w-full justify-start rounded-2xl py-3 text-left"
                    disabled={busy || limitReached || !adsAvailableOnThisDevice()}
                    onClick={() => void run(plan.ads)}
                  >
                    <PlayCircle className="mr-2 size-4 shrink-0" />
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {busy ? "Loading ad…" : `Watch ad · ${plan.label}`}
                      </span>
                      <span className="text-[11px] font-normal opacity-80">
                        {active
                          ? `${left} ad${left === 1 ? "" : "s"} still needed for this option`
                          : `${plan.ads} ad${plan.ads === 1 ? "" : "s"} needed in total`}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              {limitReached
                ? "You have reached today's ad limit. Please try again tomorrow."
                : `Remaining rewarded ads today: ${remaining}/${DAILY_AD_LIMIT}`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
