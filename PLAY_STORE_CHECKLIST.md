# Hello Aisha — Google Play submission checklist (internal)

App: Hello Aisha · Package `online.helloaisha.app` · targetSdk 36
Site: https://helloaisha.online · Support: miss@helloaisha.online

This file records what is already handled in the code and what a human must
declare manually in Google Play Console. Nothing here is a Play Console
declaration by itself.

## 1. Policy URLs

| Item | URL |
| --- | --- |
| Privacy Policy | https://helloaisha.online/privacy |
| Terms of Service | https://helloaisha.online/terms |
| Community Guidelines | https://helloaisha.online/guidelines |
| Safety Resources | https://helloaisha.online/safety |
| Account deletion (public, no install needed) | https://helloaisha.online/delete-account |

All five must be publicly reachable on the live domain before submission.

## 2. Data Safety mapping (from the actual schema and code)

Shared with third parties: **none for advertising or sale**. All data is
processed by infrastructure providers (cloud database/auth/hosting; Google
Firebase Cloud Messaging for notifications) — in Play terms this is
"processed, not shared".

Encryption in transit: yes (HTTPS/TLS everywhere).
Users can request deletion: yes, in app and via the public web page.

| Data type | Collected | Stored | Purpose | Shared | Required | Deleted on account deletion |
| --- | --- | --- | --- | --- | --- | --- |
| Email address | Yes | `profiles.email`, auth | Account management, sign-in | No | Required | Yes |
| Password | Yes | Auth provider (hashed) | Sign-in | No | Required | Yes |
| Username | Yes | `profiles.username` | App functionality | No | Required | Yes |
| Onboarding answers (reasons, 18+/terms/peer acks) | Yes | `user_onboarding` | App functionality | No | Reasons optional; acks required | Yes |
| Messages / conversation content | Yes | `messages`, `conversations` | App functionality, safety | No | Required to chat | Yes |
| Check-in mood + note | Yes | `daily_checkins` | App functionality | No | Optional | Yes |
| Reports (reason, description) | Yes | `reports` | Safety, moderation | No | Optional | Yes |
| Internal moderation notes | Yes (staff-authored) | `internal_notes` | Safety, moderation | No | n/a | Yes |
| Moderation actions | Yes (staff-authored) | `moderation_actions` | Safety, fraud prevention | No | n/a | Yes (replaced by coded record) |
| Device push token + platform | Yes | `push_tokens` | Notification delivery | Processed by Firebase Cloud Messaging | Optional | Yes |
| Product/analytics events (name + user id + time) | Yes | `analytics_events` | Analytics | No | Required | Yes |
| Account deletion request (id, email, reason) | Yes | `account_deletion_requests` | Account management | No | Optional | Yes |
| Coded safety record (pseudonymous ref, type, short reason) | Yes | `retained_safety_records` | Security, fraud prevention, legal | No | n/a | Retained up to 12 months, then auto-erased |
| Location, contacts, SMS, call logs, photos, files, phone number, ad ID | No | — | — | — | — | — |

**Requires manual verification before you submit:** whether any crash/diagnostic
data is auto-collected by the hosting or Play SDKs (declare "Crash logs" /
"Diagnostics" if so), and the exact retention terms of your infrastructure
providers' backups.

## 3. Play Console declarations to complete manually

- **Data safety form** — fill using the table above.
- **Target audience and content** — 18+ only; do not opt into Designed for Families.
- **Content rating questionnaire** — declare user-to-user communication /
  user-generated content, unmoderated-content = No (moderation exists),
  no ads, no purchases, no gambling, no violence. Expect a mature rating.
- **Health apps declaration** — answer **No**: the app provides peer support and
  friendly conversation only; it makes no medical, diagnostic, treatment or
  crisis-intervention claim.
- **App access instructions** — sign-in is required. Provide a working test
  account (email + password) so reviewers can reach the chat.
- **Ads declaration** — "No ads".
- **Account deletion** — declare both the in-app path (Profile → Delete my
  account) and the web URL above.
- **News, financial, government apps** — not applicable.
- **Sensitive permissions** — the app requests only POST_NOTIFICATIONS; no
  declaration form required.
- **Store listing copy** — must not describe the app as therapy, counselling,
  medical care, or a crisis line.

## 4. Real-world verification before release

- Publish the site so all policy URLs return 200 on the live domain.
- Build a signed release APK/AAB; confirm push notifications still work
  foreground and background on a real device.
- Run the full account-deletion flow once on a throwaway account and confirm the
  account can no longer sign in.
- Confirm the reviewer test account can sign in and start a conversation.

## Ads (AdMob rewarded) — added with the media unlock feature

Code-level (done in the app):
- Rewarded ads only. No banners, no interstitials, no subscriptions, no payments.
- Every ad is user-initiated: the reward, the number of ads and the unlock duration are shown before the Watch ad button; ads are never auto-started or chained.
- Reward is granted only after AdMob's official reward callback, confirmed server-side; failed, skipped or dismissed ads grant nothing and consume no allowance.
- Reward processing is idempotent (one ad session id = one reward) and the 10-ads-per-day limit is enforced in the database with server time.
- Text chat is never gated by an ad. Locked media never blocks a conversation.
- Admin accounts have permanent media access by database role and see no ad or unlock UI.
- Test ad unit ids are used in development/preview builds; production ad unit ids only in production builds. AdMob app id is declared in AndroidManifest.xml.

Play Console / manual work still required by you:
- Data Safety: declare advertising-related collection for the Google Mobile Ads SDK (device or other IDs, app activity/ad interaction, approximate location from IP as applicable).
- Answer the "Does your app contain ads?" question as Yes; the store listing must show the Contains ads label.
- Link the AdMob app to the Play listing and confirm the ad content rating.
- Confirm the updated Privacy Policy URL is live before submitting.

Real-world verification (device):
- Watch a rewarded ad end to end and confirm the unlock timer starts only after completion.
- Close an ad early and confirm nothing unlocks and the daily counter does not move.
- Confirm the daily limit message appears after 10 completed ads and resets the next day.
