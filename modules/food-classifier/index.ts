// Re-export the native module. On web, it will be resolved to FoodClassifierModule.web.ts
// and on native platforms to FoodClassifierModule.ts
export { default } from './src/FoodClassifierModule';
export * from './src/FoodClassifier.types';
