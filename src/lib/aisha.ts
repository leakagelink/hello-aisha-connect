import { supabase } from "@/integrations/supabase/client";

export const APP_NAME = "Hello Aisha";
export const APP_TAGLINE = "Someone is here to listen.";

export const ONBOARDING_REASONS = [
  "Feeling lonely",
  "Need someone to talk to",
  "Feeling stressed",
  "Going through a difficult time",
  "Just want to talk",
] as const;

export const TOPICS = [
  "Life",
  "Loneliness",
  "Relationships",
  "Stress",
  "Family",
  "Career",
  "Just talk",
] as const;

export const MOODS = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "low", label: "Low" },
  { value: "difficult", label: "Having a difficult day" },
] as const;

export const REPORT_REASONS = [
  "Inappropriate behavior",
  "Harassment",
  "I feel unsafe",
  "Privacy concern",
  "Other",
] as const;

export type AnalyticsEvent =
  | "onboarding_started"
  | "onboarding_completed"
  | "signup_completed"
  | "conversation_requested"
  | "conversation_accepted"
  | "first_message_sent"
  | "first_human_reply_received"
  | "conversation_closed"
  | "checkin_completed"
  | "report_created"
  | "account_deletion_requested";

/** Privacy-conscious: records only the event name and the signed-in user id. */
export async function logEvent(event: AnalyticsEvent) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("analytics_events").insert({ user_id: data.user.id, event_name: event });
  } catch {
    /* analytics must never break the experience */
  }
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export const ONBOARDING_STORAGE_KEY = "hello-aisha-onboarding";

export type PendingOnboarding = {
  selected_reasons: string[];
  is_adult_confirmed: boolean;
  terms_accepted: boolean;
  peer_support_acknowledged: boolean;
};

export function readPendingOnboarding(): PendingOnboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingOnboarding) : null;
  } catch {
    return null;
  }
}

export function writePendingOnboarding(value: PendingOnboarding) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(value));
}
