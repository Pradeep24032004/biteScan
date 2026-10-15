import type * as HealthKitModule from '@kingstinct/react-native-healthkit';

/** Latest body measurements from Apple Health, e.g. written there by the InBody app. */
export type BodyReading = {
  weightKg: number | null;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  heightCm: number | null;
  /** When the most recent body-composition sample was measured. */
  measuredAt: Date | null;
  /** App that wrote it, e.g. "InBody". */
  source: string | null;
};

let healthKit: typeof HealthKitModule | null | undefined;

/** HealthKit needs a development build; in Expo Go the native module is missing. */
function getHealthKit(): typeof HealthKitModule | null {
  if (healthKit === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      healthKit = require('@kingstinct/react-native-healthkit') as typeof HealthKitModule;
      if (!healthKit.isHealthDataAvailable()) healthKit = null;
    } catch {
      healthKit = null;
    }
  }
  return healthKit;
}

export function isHealthAvailable(): boolean {
  return getHealthKit() != null;
}

export async function readLatestBody(): Promise<BodyReading> {
  const hk = getHealthKit();
  if (!hk) throw new Error('Apple Health is not available in this build.');

  await hk.requestAuthorization({
    toRead: [
      'HKQuantityTypeIdentifierBodyMass',
      'HKQuantityTypeIdentifierBodyFatPercentage',
      'HKQuantityTypeIdentifierLeanBodyMass',
      'HKQuantityTypeIdentifierHeight',
    ],
  });

  const [weight, fat, lean, height] = await Promise.all([
    hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg'),
    hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%'),
    hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierLeanBodyMass', 'kg'),
    hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierHeight', 'cm'),
  ]);

  const weightKg = weight?.quantity ?? null;
  // HealthKit returns percentages as fractions (0.245 = 24.5%).
  let bodyFatPct = fat ? (fat.quantity <= 1 ? fat.quantity * 100 : fat.quantity) : null;
  const leanMassKg = lean?.quantity ?? null;
  if (bodyFatPct == null && leanMassKg != null && weightKg) {
    bodyFatPct = (1 - leanMassKg / weightKg) * 100;
  }

  const composition = [fat, lean, weight].filter((s) => s != null);
  const newest = composition.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];

  return {
    weightKg: round1(weightKg),
    bodyFatPct: round1(bodyFatPct),
    leanMassKg: round1(leanMassKg),
    heightCm: height ? Math.round(height.quantity) : null,
    measuredAt: newest?.startDate ?? null,
    source: newest?.sourceRevision.source.name ?? null,
  };
}

function round1(n: number | null): number | null {
  return n == null ? null : Math.round(n * 10) / 10;
}
