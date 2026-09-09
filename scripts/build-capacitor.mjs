#!/usr/bin/env node
/**
 * Hello Aisha — static SPA export for Capacitor / Android.
 *
 * The hosted build targets a server runtime (Nitro), so it never writes a
 * static `index.html`. Capacitor needs one. This script:
 *
 *   1. runs the normal web build (skipped with --skip-build)
 *   2. discovers the ACTUAL build output directories (from nitro.json when
 *      present, otherwise by probing known layouts) — never hard-coded
 *   3. copies every browser asset into `.output/public`
 *   4. pre-renders the app shell with the freshly built server bundle and
 *      saves it as `index.html` (plus 200/404 fallbacks for deep links)
 *
 * Usage:  npm run build:android   (then `npm run cap:sync`)
 *         node scripts/build-capacitor.mjs --skip-build   (postbuild hook)
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  mkdirSync,
  cpSync,
  rmSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const skipBuild = process.argv.includes("--skip-build");
// In the postbuild hook we never want to fail the hosted deployment.
const soft = process.argv.includes("--soft");

const root = resolve(process.cwd());
const outDir = join(root, ".output", "public");

function fail(message) {
  if (soft) {
    console.warn(`⚠ Skipped Capacitor static export: ${message}`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

function abs(base, p) {
  return isAbsolute(p) ? p : join(base, p);
}

/** Read nitro.json from any known build root; it names publicDir + serverEntry. */
function fromNitroManifest() {
  const manifestDirs = [join(root, "dist"), join(root, ".output"), root];
  for (const dir of manifestDirs) {
    const manifestPath = join(dir, "nitro.json");
    if (!existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const clientDir = manifest.publicDir ? abs(dir, manifest.publicDir) : null;
      const serverEntry = manifest.serverEntry ? abs(dir, manifest.serverEntry) : null;
      if (clientDir && existsSync(clientDir)) {
        return { clientDir, serverEntry: serverEntry && existsSync(serverEntry) ? serverEntry : null };
      }
    } catch {
      // fall through to probing
    }
  }
  return null;
}

function looksLikeClientDir(dir) {
  if (!existsSync(dir)) return false;
  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function probeLayouts() {
  const clientCandidates = [
    join(root, "dist", "client"),
    join(root, ".output", "public"),
    join(root, ".vinxi", "build", "client"),
    join(root, "build", "client"),
  ];
  const serverCandidates = [
    join(root, "dist", "server", "index.mjs"),
    join(root, ".output", "server", "index.mjs"),
    join(root, ".output", "server", "index.js"),
    join(root, "dist", "server", "server.mjs"),
    join(root, "build", "server", "index.mjs"),
  ];
  const clientDir = clientCandidates.find(looksLikeClientDir) ?? null;
  const serverEntry = serverCandidates.find((p) => existsSync(p)) ?? null;
  return clientDir ? { clientDir, serverEntry } : null;
}

if (!skipBuild) {
  console.log("→ Building web assets…");
  execSync("npx vite build", { stdio: "inherit", cwd: root });
}

const manifestResult = fromNitroManifest();
const probeResult = probeLayouts();
const clientDir = manifestResult?.clientDir ?? probeResult?.clientDir ?? null;
const serverEntry = manifestResult?.serverEntry ?? probeResult?.serverEntry ?? null;

if (!clientDir) {
  fail(
    "No browser assets found. Looked at nitro.json (publicDir) and the usual " +
      "locations (dist/client, .output/public, .vinxi/build/client, build/client). " +
      "The build did not complete.",
  );
}

console.log(`→ Using browser assets from ${clientDir}`);

const sameDir = resolve(clientDir) === resolve(outDir);
if (!sameDir) {
  console.log("→ Copying browser assets…");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(clientDir, outDir, { recursive: true });
} else {
  console.log("→ Browser assets already live in .output/public; copy skipped.");
  mkdirSync(outDir, { recursive: true });
}

console.log("→ Pre-rendering the app shell…");
if (!serverEntry) {
  fail(
    "No server bundle found (checked nitro.json serverEntry, dist/server/index.mjs, " +
      ".output/server/index.mjs); cannot pre-render index.html.",
  );
}
console.log(`→ Using server bundle ${serverEntry}`);

let html;
try {
  const mod = await import(pathToFileURL(serverEntry).href);
  const handler = mod.default ?? mod;
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const response = await handler.fetch(new Request("http://localhost/"), {}, ctx);

  if (!response || response.status >= 400) {
    fail(`Pre-render of "/" failed with status ${response?.status}.`);
  }

  html = await response.text();
} catch (error) {
  fail(`Pre-render threw: ${error instanceof Error ? error.message : String(error)}`);
}

if (!html || !html.includes("<html")) {
  fail("Pre-render returned no HTML document.");
}

for (const name of ["index.html", "200.html", "404.html"]) {
  writeFileSync(join(outDir, name), html);
}

console.log(`✔ Static SPA export ready at .output/public (index.html, ${html.length} bytes)`);
process.exit(0);
