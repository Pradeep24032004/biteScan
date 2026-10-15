export type Prediction = {
  /** A food id from src/data/foods.ts. */
  label: string;
  /** 0–1 */
  confidence: number;
};
