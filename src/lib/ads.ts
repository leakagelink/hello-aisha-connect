import { Capacitor } from "@capacitor/core";

/**
 * Google AdMob — rewarded ads only.
 *
 * Rewarded ads are always user initiated and are never shown automatically.
 * Production ad unit ids are used only in production builds; development and
 * preview builds always use Google's official test ad units.
 */
export const ADMOB_APP_ID = "ca-app-pub-1475323931624357~9564264248";

const PRODUCTION_REWARDED_AD_UNIT = "ca-app-pub-1475323931624357/7516685404";
/** Official Google test rewarded ad unit. */
const TEST_REWARDED_AD_UNIT = "ca-app-pub-3940256099942544/5224354917";

const isProduction = import.meta.env.PROD;

export const rewardedAdUnitId = isProduction
  ? PRODUCTION_REWARDED_AD_UNIT
  : TEST_REWARDED_AD_UNIT;

export function adsAvailableOnThisDevice() {
  return Capacitor.isNativePlatform();
}

export type RewardedOutcome =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "dismissed" | "failed" };

let adInFlight = false;
let initialized = false;

/**
 * Shows a single rewarded ad. Resolves ok:true only when AdMob reports the
 * official reward event for this ad. Never chains a second ad.
 */
export async function showRewardedAd(): Promise<RewardedOutcome> {
  if (adInFlight) return { ok: false, reason: "failed" };
  if (!adsAvailableOnThisDevice()) return { ok: false, reason: "unavailable" };

  adInFlight = true;
  const listeners: { remove: () => Promise<void> | void }[] = [];

  try {
    const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");

    if (!initialized) {
      await AdMob.initialize({ initializeForTesting: !isProduction });
      initialized = true;
    }

    let rewarded = false;
    let failed = false;

    listeners.push(
      await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
      }),
    );
    listeners.push(
      await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        failed = true;
      }),
    );
    listeners.push(
      await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        failed = true;
      }),
    );

    const prepared = await Promise.race([
      AdMob.prepareRewardVideoAd({ adId: rewardedAdUnitId, isTesting: !isProduction })
        .then(() => true)
        .catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 20000)),
    ]);

    if (!prepared || failed) return { ok: false, reason: "unavailable" };

    try {
      await AdMob.showRewardVideoAd();
    } catch {
      return { ok: false, reason: "failed" };
    }

    if (!rewarded) return { ok: false, reason: "dismissed" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  } finally {
    for (const listener of listeners) {
      try {
        await listener.remove();
      } catch {
        /* listener cleanup must never break the flow */
      }
    }
    adInFlight = false;
  }
}
