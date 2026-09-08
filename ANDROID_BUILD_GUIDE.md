# Hello Aisha — Android APK build (PowerShell + Android Studio)

This turns the Hello Aisha web app into a native Android app using **Capacitor**.
The app is a thin native shell around the live site `https://helloaisha.online`,
so all login, chat, and notifications keep running on the cloud — the APK just
adds a real Android experience (splash screen, status bar, back button,
installable app).

> Requirements already on your PC: Android Studio, Node.js, Git.

---

## 1) Clone your GitHub repo

Open **Windows PowerShell** and run:

```powershell
cd $HOME
git clone https://github.com/leakagelink/hello-aisha-connect.git hello-aisha
cd hello-aisha
```

> Make sure this clone contains the latest Lovable code (including the
> `capacitor.config.ts`, `www/` folder and the `@capacitor/*` packages in
> `package.json`). If your GitHub repo is not synced with Lovable, set up
> **Lovable → GitHub sync** (Plus menu → GitHub → Connect project) so the
> Capacitor files arrive in the repo.

## 2) Install dependencies

```powershell
npm install
```

(If you prefer Bun, use `bun install` instead.)

## 3) Add the Android platform (first time only)

```powershell
npm run cap:add
```

This creates the `android\` folder. You only run this once; afterwards it stays
in the project.

## 4) Sync the web + native config into the Android project

Run this every time you change `capacitor.config.ts` or the `www\` folder:

```powershell
npm run cap:sync
```

This command also copies `google-services.json`, confirms that it matches
`online.helloaisha.app`, and enables the Google Services Gradle plugin required
for Firebase device-token registration.

## 5) Open in Android Studio

```powershell
npx cap open android
```

Android Studio opens with the Hello Aisha project.

## 6) Build a test APK

In Android Studio:

1. Let Gradle finish syncing (bottom status bar).
2. Top menu → **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. When it finishes, click **locate** in the popup. The debug APK is at:
   `android\app\build\outputs\apk\debug\app-debug.apk`

## 7) Install on your phone

Either:

- **USB**: enable Developer Options + USB Debugging on the phone, plug it in,
  then in Android Studio select the device and click the green ▶ **Run** button.
- **Manual**: copy the `app-debug.apk` to your phone and open it
  (allow "install from unknown sources"). Sign in with your Hello Aisha account.

---

## Common tweaks

### Change the app package name (before Play Store)

Edit `appId` in `capacitor.config.ts`, then delete and re-add Android:

```powershell
Remove-Item -Recurse -Force android
npx cap add android
npx cap sync android
```

### Add a real app icon / splash image

Put a source image (at least 1024x1024 PNG) at `assets\icon.png`, then:

```powershell
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

### Sign a production build (AAB for Play Store)

In Android Studio: **Build → Generate Signed Bundle / APK → Android App
Bundle**. Create a keystore when prompted and keep it safe (you need the same
keystore for every future update).

---

## Notes

- The app loads `https://helloaisha.online`, so it needs internet on first
  launch. Offline shows a short "Connecting…" fallback page.
- Because the WebView origin is `https://helloaisha.online`, email sign-in and
  service-worker push work exactly like the website.
- Notifications use native FCM and the `hello_aisha_channel` Android channel.
  After changing notification code, run `npm run cap:sync`, rebuild the APK,
  uninstall the old app, and install the new APK.
