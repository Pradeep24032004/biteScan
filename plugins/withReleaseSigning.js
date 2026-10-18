// Signs Android release builds with BiteScan's permanent key, so shared APKs can be updated in place.
// The keystore and passwords live outside the repo, in ~/.gradle/gradle.properties:
//   BITESCAN_UPLOAD_STORE_FILE, BITESCAN_UPLOAD_KEY_ALIAS, BITESCAN_UPLOAD_STORE_PASSWORD, BITESCAN_UPLOAD_KEY_PASSWORD
// Without them (e.g. on another machine), release builds fall back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('BITESCAN_UPLOAD_STORE_FILE')) return cfg;

    const debugConfig = /(signingConfigs \{\s*debug \{[\s\S]*?\n {8}\})/;
    const releaseUsesDebug = /(release \{\s*\/\/ Caution![\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!debugConfig.test(src) || !releaseUsesDebug.test(src)) {
      throw new Error('withReleaseSigning: android/app/build.gradle template changed; update plugins/withReleaseSigning.js.');
    }
    src = src.replace(
      debugConfig,
      `$1
        release {
            if (project.hasProperty('BITESCAN_UPLOAD_STORE_FILE')) {
                storeFile file(BITESCAN_UPLOAD_STORE_FILE)
                storePassword BITESCAN_UPLOAD_STORE_PASSWORD
                keyAlias BITESCAN_UPLOAD_KEY_ALIAS
                keyPassword BITESCAN_UPLOAD_KEY_PASSWORD
            }
        }`
    );
    src = src.replace(
      releaseUsesDebug,
      "$1signingConfig project.hasProperty('BITESCAN_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
    );
    cfg.modResults.contents = src;
    return cfg;
  });
};
