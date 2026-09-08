#!/usr/bin/env node
/**
 * Hello Aisha — Fixed static SPA export for Capacitor / Android.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
// Standard Nitro/TanStack Start output is in .output
const nitroPublicDir = join(root, ".output", "public");
const nitroServerEntry = join(root, ".output", "server", "index.mjs");
const outDir = join(root, ".output", "public"); // Keep it here for Capacitor

console.log("→ Building web assets…");
// We run the standard build which populates .output
execSync("npm run build", { stdio: "inherit", cwd: root });

console.log("→ Pre-rendering the app shell for mobile…");
if (!existsSync(nitroServerEntry)) {
  console.error(`No server bundle found at ${nitroServerEntry}.`);
  process.exit(1);
}

const mod = await import(pathToFileURL(nitroServerEntry).href);
const handler = mod.default ?? mod;

const ctx = { waitUntil() {}, passThroughOnException() {} };
// We fetch the root to capture the index.html content
const response = await handler.fetch(new Request("http://localhost/"), {}, ctx);

let html = "";
if (!response || response.status >= 400) {
  console.warn(`Prerender of "/" returned ${response?.status}. Using fallback shell.`);
  html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hello Aisha</title></head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>`;
} else {
  html = await response.text();
}

for (const name of ["index.html", "200.html", "404.html"]) {
  writeFileSync(join(outDir, name), html);
}

console.log(`✔ Static SPA export ready at ${outDir}`);
process.exit(0);
