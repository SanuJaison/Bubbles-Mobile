const { withGradleProperties } = require("expo/config-plugins");

/**
 * Limits the ABIs that are packaged into the app.
 *
 * EAS sets BUBBLES_ANDROID_ABIS for the production profile, so the APK shipped
 * on GitHub Releases stays small enough to download reliably on a phone
 * connection. Leaving the variable unset keeps the default (every ABI), which
 * is what you want for a Play Store bundle.
 */
const withAndroidAbis = (config) => {
  const abis = (process.env.BUBBLES_ANDROID_ABIS || "").trim();

  if (!abis) return config;

  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter(
      (item) =>
        !(item.type === "property" && item.key === "reactNativeArchitectures")
    );

    cfg.modResults.push({
      type: "property",
      key: "reactNativeArchitectures",
      value: abis,
    });

    return cfg;
  });
};

module.exports = withAndroidAbis;
