import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { Prediction } from './FoodClassifier.types';

declare class FoodClassifierModule extends NativeModule<{}> {
  isModelAvailable(): boolean;
  /** Whether the LFM2.5-VL model files are bundled in this build. */
  isLfmAvailable(): boolean;
  /** File paths of the LFM2.5-VL model (Android copies them out of the APK on first call). */
  prepareLfmModelAsync(): Promise<{ model: string; mmproj: string } | null>;
  classifyAsync(uri: string, topK: number): Promise<Prediction[]>;
}

// Optional so the rest of the app still runs in Expo Go, which can't include custom native code.
export default requireOptionalNativeModule<FoodClassifierModule>('FoodClassifier');
