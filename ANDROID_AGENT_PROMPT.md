# Android Studio AI agent prompt (Hello Aisha)

Backend/frontend side is already done in Lovable:

- FCM token registration listener attached before `register()`, token saved to `push_tokens`.
- Server sends notifications with Android `channel_id: "hello_aisha_channel"`, priority high.
- Both member and Aisha (staff) devices receive pushes.

Paste this prompt into the Android Studio AI agent if native issues remain:

---

You are working on the Capacitor Android app `online.helloaisha.app` (Firebase project `hello-aisha`).
Verify and fix ONLY the native Android side:

1. `android/app/google-services.json` exists and its `package_name` is exactly `online.helloaisha.app`.
2. Root `build.gradle` has `com.google.gms:google-services:4.4.4` and `android/app/build.gradle` applies
   `com.google.gms.google-services`. Also add `firebase-messaging` via the Firebase BoM.
3. `AndroidManifest.xml` declares `POST_NOTIFICATIONS` permission (Android 13+) and the default
   notification channel + icon metadata:
   - `com.google.firebase.messaging.default_notification_channel_id` = `hello_aisha_channel`
   - `com.google.firebase.messaging.default_notification_icon`
4. `MainActivity` creates the notification channel `hello_aisha_channel` with
   `IMPORTANCE_HIGH`, sound and vibration enabled, before any notification is posted.
   Remove any leftover debug/test notification timers (for example the 3-second "Aisha Connection Check").
5. Do NOT add any custom `FirebaseMessagingService` that swallows messages — the Capacitor
   PushNotifications plugin handles delivery. If a custom service exists, make sure it calls
   `super.onMessageReceived` behaviour or is removed.
6. Confirm the app is not battery-restricted: keep default behaviour, do not add
   `stopService`/`finishAffinity` calls on background.
7. Build a fresh signed/debug APK after `npx cap sync android`.

Do not modify any JavaScript/TypeScript in `src/` — that side is already correct.

---

## Local build steps

```powershell
git pull
npm install
node scripts\prepare-android.mjs
npx cap sync android
npx cap open android
```

Then Android Studio: Build > Clean Project > Build APK(s), uninstall old app, install new APK,
sign in, keep the app open ~20 seconds, allow notifications, then test from Aisha's panel.
