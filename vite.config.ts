import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Force client-only mode for Capacitor bundling to get index.html
    ssr: false,
  },
  nitro: {
    // Generate a static SPA entry point
    preset: 'static',
    prerender: {
      routes: ['/'],
      crawlLinks: true,
      failOnError: false
    }
  }
});
