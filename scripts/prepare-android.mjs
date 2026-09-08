import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";

const source = new URL("../google-services.json", import.meta.url);
const androidApp = new URL("../android/app/", import.meta.url);
const destination = new URL("../android/app/google-services.json", import.meta.url);
const rootGradle = new URL("../android/build.gradle", import.meta.url);
const appGradle = new URL("../android/app/build.gradle", import.meta.url);

try {
  await access(source, constants.R_OK);
} catch {
  throw new Error(
    "google-services.json is missing from the project root. Download it for online.helloaisha.app from Firebase.",
  );
}

try {
  await access(androidApp, constants.F_OK);
} catch {
  throw new Error("Android project is missing. Run npm run cap:add first.");
}

await mkdir(androidApp, { recursive: true });
await copyFile(source, destination);

const firebaseConfig = JSON.parse(await readFile(source, "utf8"));
const configuredPackage = firebaseConfig.client?.[0]?.client_info?.android_client_info?.package_name;
if (configuredPackage !== "online.helloaisha.app") {
  throw new Error(
    `google-services.json is for ${configuredPackage ?? "an unknown package"}, not online.helloaisha.app.`,
  );
}

let rootBuild = await readFile(rootGradle, "utf8");
if (!rootBuild.includes("com.google.gms:google-services")) {
  const dependenciesMarker = /dependencies\s*\{/;
  if (!dependenciesMarker.test(rootBuild)) {
    throw new Error("Could not configure Firebase: android/build.gradle has no dependencies block.");
  }
  rootBuild = rootBuild.replace(
    dependenciesMarker,
    "dependencies {\n        classpath 'com.google.gms:google-services:4.4.4'",
  );
  await writeFile(rootGradle, rootBuild);
}

let appBuild = await readFile(appGradle, "utf8");
if (!appBuild.includes("com.google.gms.google-services")) {
  const applicationPlugin = "apply plugin: 'com.android.application'";
  if (!appBuild.includes(applicationPlugin)) {
    throw new Error("Could not configure Firebase: Android application plugin was not found.");
  }
  appBuild = appBuild.replace(
    applicationPlugin,
    `${applicationPlugin}\napply plugin: 'com.google.gms.google-services'`,
  );
  await writeFile(appGradle, appBuild);
}

console.log("Firebase Android configuration copied and Google Services plugin verified.");