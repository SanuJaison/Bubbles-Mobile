const fs = require("fs");
const path = require("path");

/**
 * Signs the generated Android project with the Bubbles release key.
 *
 * `expo prebuild` produces a project that signs release builds with the debug
 * key. Shipping that would break in-place updates (Android refuses an APK whose
 * signing certificate differs from the installed one), so this appends the real
 * signing config after the generated `android {}` block.
 *
 * The keystore and its passwords only exist inside the CI runner; nothing is
 * written to the repository.
 */
const required = [
  "ANDROID_KEYSTORE_BASE64",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing signing secrets: ${missing.join(", ")}`);
  process.exit(1);
}

const root = path.resolve(__dirname, "..", "..");
const androidDir = path.join(root, "android");
const gradlePath = path.join(androidDir, "app", "build.gradle");

if (!fs.existsSync(gradlePath)) {
  console.error("android/app/build.gradle not found — run expo prebuild first.");
  process.exit(1);
}

const keystore = Buffer.from(process.env.ANDROID_KEYSTORE_BASE64, "base64");

if (keystore.length === 0) {
  console.error("The keystore secret decoded to an empty file.");
  process.exit(1);
}

fs.writeFileSync(path.join(androidDir, "app", "bubbles-release.jks"), keystore);

let gradle = fs.readFileSync(gradlePath, "utf8");

if (!gradle.includes("buildTypes")) {
  console.error("Unexpected build.gradle layout: no buildTypes block.");
  process.exit(1);
}

if (gradle.includes("bubblesRelease")) {
  console.log("Release signing already configured.");
  process.exit(0);
}

gradle += `
// Appended by scripts/ci/configure-signing.js — signs release builds with the
// Bubbles release key so updates install over the existing app.
android {
    signingConfigs {
        bubblesRelease {
            storeFile file("bubbles-release.jks")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.bubblesRelease
        }
    }
}
`;

fs.writeFileSync(gradlePath, gradle);
console.log(`Configured release signing with ${keystore.length} bytes of keystore.`);
