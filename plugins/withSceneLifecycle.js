// iOS 27 terminates apps at launch unless they adopt the UIScene life cycle
// (UIKit asserts in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// Expo SDK 57 ships ExpoAppSceneDelegate for this, but the prebuild template doesn't wire it up yet.
// This plugin registers it in Info.plist and moves window creation out of AppDelegate.
// Remove once the Expo template adopts scenes itself.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate'; // @objc name of ExpoAppSceneDelegate

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: expected a Swift AppDelegate.');
    }
    let src = cfg.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return cfg; // already applied

    const classDecl = 'class AppDelegate: ExpoAppDelegate {';
    const windowStart = /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif/;
    if (!src.includes(classDecl) || !windowStart.test(src)) {
      throw new Error(
        'withSceneLifecycle: AppDelegate template changed; update plugins/withSceneLifecycle.js (or remove it if Expo now adopts scenes).'
      );
    }
    src = src.replace(classDecl, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    src = src.replace(
      windowStart,
      '// The window is created and React Native started by ExpoAppSceneDelegate (UIScene life cycle, required by iOS 27).'
    );
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
