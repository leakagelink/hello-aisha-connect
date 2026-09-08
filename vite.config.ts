import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Disable SSR to produce a static SPA that Capacitor can bundle
  tanstackStart: {
    ssr: false,
  },
  // Ensure Nitro generates a static entry point for mobile
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/'],
      crawlLinks: false,
      failOnError: false
    }
  }
});
