#!/usr/bin/env node
/**
 * Hello Aisha — static SPA export for Capacitor / Android.
 *
 * The hosted build targets a server runtime (Nitro), so it never writes a
 * static `index.html`. Capacitor needs one. This script:
 *
 *   1. runs the normal web build
 *   2. copies every browser asset into `.output/public`
 *   3. pre-renders the app shell with the freshly built server bundle and
 *      saves it as `index.html` (plus 200/404 fallbacks for deep links)
 *
 * Usage:  npm run build:android   (then `npm run cap:sync`)
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const clientDir = join(root, "dist", "client");
const serverEntry = join(root, "dist", "server", "index.mjs");
const outDir = join(root, ".output", "public");

console.log("→ Building web assets…");
execSync("npx vite build", { stdio: "inherit", cwd: root });

if (!existsSync(clientDir)) {
  console.error(`No browser assets found at ${clientDir}. The build did not complete.`);
  process.exit(1);
}

console.log("→ Copying browser assets…");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(clientDir, outDir, { recursive: true });

console.log("→ Pre-rendering the app shell…");
if (!existsSync(serverEntry)) {
  console.error(`No server bundle found at ${serverEntry}; cannot pre-render index.html.`);
  process.exit(1);
}

const mod = await import(pathToFileURL(serverEntry).href);
const handler = mod.default ?? mod;

const ctx = { waitUntil() {}, passThroughOnException() {} };
const response = await handler.fetch(new Request("http://localhost/"), {}, ctx);

if (!response || response.status >= 400) {
  console.error(`Pre-render of "/" failed with status ${response?.status}.`);
  process.exit(1);
}

const html = await response.text();
if (!html.includes("<html")) {
  console.error("Pre-render returned no HTML document.");
  process.exit(1);
}

for (const name of ["index.html", "200.html", "404.html"]) {
  writeFileSync(join(outDir, name), html);
}

console.log(`✔ Static SPA export ready at .output/public (index.html, ${html.length} bytes)`);
process.exit(0);
