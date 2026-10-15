This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## BiteScan project notes

- **iPhone only** (`platforms: ["ios"]` in app.json). Xcode 27 is installed; the app is signed with the free Personal Team `A767Z4L4DT` (bundle id `com.mpradeep.bitescan`), so installs expire after 7 days.
- Install on the iPhone: `npx expo run:ios` fails at signing (it doesn't pass `-allowProvisioningUpdates`). Instead run `xcodebuild -workspace ios/BiteScan.xcworkspace -scheme BiteScan -configuration Release -destination id=<UDID> -derivedDataPath ios/build -allowProvisioningUpdates DEVELOPMENT_TEAM=A767Z4L4DT build`, then `xcrun devicectl device install app --device <UDID> ios/build/Build/Products/Release-iphoneos/BiteScan.app`.
- iOS 27 kills apps that don't adopt the UIScene life cycle. `plugins/withSceneLifecycle.js` wires up Expo's `ExpoAppSceneDelegate`; remove it once the Expo template does this itself.
- Food log and profile live in on-device SQLite (`src/db/database.ts`). Log entries store nutrition totals at the time of logging.
- Indian food list is in `src/data/foods.ts`. Values are approximate per-serving estimates, not yet verified against ICMR-NIN IFCT.
- Food scanning: `ml/` trains an EfficientNet-B0 classifier on Wikimedia Commons + our own photos and exports `BiteScanFood.mlpackage` into `modules/food-classifier/ios/models/`. The local Expo module (`modules/food-classifier`) runs it with Core ML + Vision. It loads via `requireOptionalNativeModule`, so the app still runs in Expo Go; there the Scan screen explains scanning needs a development build (`npx expo run:ios`, requires full Xcode).
- Model class labels are food ids from `src/data/foods.ts`; keep Commons/photo folder names in sync with those ids.
- Dish recognition (`src/lib/dishRecognizer.ts`): a LoRA-fine-tuned LFM2.5-VL-450M (GGUF, run with `llama.rn`) gives the top answer; EfficientNet (Core ML) fills in alternatives. Photos are shrunk to ≤512px first to match training. Both model files are bundled through the `food-classifier` module's resource bundle; `*.gguf` is git-ignored and regenerated from `ml/` (see ml/README.md).
- `ml/` is excluded from tsconfig, ESLint and Metro.
- Goals, history and notifications: `src/lib/history.ts` analyses past days (calories, weight log, streaks, drift from goal); `src/lib/notifications.ts` schedules **local** notifications only (`refreshReminders` after any change, `afterFoodChanged` after logging). `plugins/withoutPushEntitlement.js` strips `aps-environment`, which free Personal Team signing can't provision — keep it unless remote push is added with a paid account.
- Workouts tab: exercise plans per age band (18–29/30–44/45–59/60+) × goal in `src/data/exercises.ts` (`PLANS`), plus a browsable library with impact-based age suitability. Pictures are SF Symbol figures via expo-symbols (names are type-checked); kcal = MET × kg × hours.
- After adding a route, typed routes only regenerate when the dev server runs (`npx expo start`), not on export.
- App icon is generated by `ml/make_icon.py` (plate with a bite + dosa + scan corners).
- Roadmap: (1) manual log + target ✅ → (2) camera scan suggesting dishes, user confirms (code done; needs trained model + dev build) → (3) Apple HealthKit sync for InBody data (needs a paid Apple Developer account) → (4) accuracy improvements.
