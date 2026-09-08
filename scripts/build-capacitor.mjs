#!/usr/bin/env node
/**
 * Hello Aisha — static SPA export for Capacitor / Android.
 *
 * The hosted build targets a server runtime (Nitro), which never emits a
 * static `index.html`. Capacitor needs one. This script runs the normal
 * build, then assembles a static SPA bundle in `.output/public`:
 *
 *   1. copy every client asset produced by the build
 *   2. generate an `index.html` shell that boots the client router
 *
 * Usage:  npm run build:android   (then `npm run cap:sync`)
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const clientDir = join(root, "dist", "client");
const outDir = join(root, ".output", "public");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", cwd: root });
}

console.log("→ Building web assets…");
run("npx vite build");

if (!existsSync(clientDir)) {
  console.error(
    `Build finished but no client assets were found at ${clientDir}.\n` +
      "Run `npx vite build` manually and check the output folder name.",
  );
  process.exit(1);
}

console.log("→ Assembling static SPA bundle…");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(clientDir, outDir, { recursive: true });

const assets = readdirSync(join(outDir, "assets"));
const entry = assets.find((f) => /^index-.*\.js$/.test(f));
const css = assets.filter((f) => f.endsWith(".css"));

if (!entry) {
  console.error("Could not find the client entry script in dist/client/assets.");
  process.exit(1);
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#4C1D95" />
    <title>Hello Aisha</title>
    <link rel="icon" href="/favicon.png" />
${css.map((f) => `    <link rel="stylesheet" href="/assets/${f}" />`).join("\n")}
    <style>
      html, body { margin: 0; min-height: 100%; background: #4C1D95; }
    </style>
    <script type="module" async src="/assets/${entry}"></script>
  </head>
  <body></body>
</html>
`;

writeFileSync(join(outDir, "index.html"), html);
// Fallback for deep links opened inside the WebView.
writeFileSync(join(outDir, "200.html"), html);
writeFileSync(join(outDir, "404.html"), html);

console.log(`✔ Static SPA export ready at .output/public (entry: assets/${entry})`);
