import { access, copyFile, mkdir } from "node:fs/promises";
import { constants } from "node:fs";

const source = new URL("../google-services.json", import.meta.url);
const androidApp = new URL("../android/app/", import.meta.url);
const destination = new URL("../android/app/google-services.json", import.meta.url);

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
console.log("Firebase Android configuration copied to android/app/google-services.json");