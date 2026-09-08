import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Hello Aisha — Production Android Configuration.
 *
 * Optimized for TanStack Start / Nitro static output.
 */
const config: CapacitorConfig = {
  appId: "online.helloaisha.app",
  appName: "Hello Aisha",
  webDir: ".output/public",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
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
      style: "LIGHT",
      backgroundColor: "#4C1D95",
      overlaysWebView: false,
    },
    App: {
      killOnPause: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
