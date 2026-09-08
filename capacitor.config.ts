import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Hello Aisha — Production Android Configuration.
 *
 * webDir is set to ".output/public" to match the TanStack Start / Nitro
 * production build output.
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
      backgroundColor: "#4C1D95",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
