import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class FoodClassifierModule extends NativeModule<{}> {
  /** Whether the LFM2.5-VL model files are bundled in this build. */
  isLfmAvailable(): boolean;
  /** File paths of the LFM2.5-VL model (Android copies them out of the APK on first call). */
  prepareLfmModelAsync(): Promise<{ model: string; mmproj: string } | null>;
}

// Optional so the rest of the app still runs in Expo Go, which can't include custom native code.
export default requireOptionalNativeModule<FoodClassifierModule>('FoodClassifier');
