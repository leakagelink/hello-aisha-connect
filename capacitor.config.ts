import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Hello Aisha — native Android shell configuration.
 *
 * This is a thin native wrapper around the live, deployed web app at
 * https://helloaisha.online. All backend logic (auth, chat, realtime,
 * notifications, database) runs on Lovable Cloud; the native shell only adds
 * a real Android app experience: splash screen, status bar, back-button
 * handling, and an installable APK/AAB for Google Play.
 *
 * Change `appId` to your own reverse-Domain package name before publishing to
 * the Play Store. `appId` must be lowercase and contain at least one dot.
 */
const config: CapacitorConfig = {
  appId: "online.helloaisha.app",
  appName: "Hello Aisha",
  webDir: "www",
  // Serve the live deployed app inside the native WebView. The WebView origin
  // becomes https://helloaisha.online, so Supabase auth redirects and service
  // worker work exactly as on the website.
  server: {
    url: "https://helloaisha.online",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    // Let the web app own navigation; Capacitor only intercepts hardware Back.
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#4C1D95",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      // Light text on the deep-violet splash/background.
      style: "LIGHT",
      backgroundColor: "#4C1D95",
      overlaysWebView: false,
    },
    App: {
      // Keep the WebView alive instead of recreating on cold links.
      killOnPause: false,
    },
  },
};

export default config;
