import ExpoModulesCore

/// Gives JS the paths of the bundled, fine-tuned LFM2.5-VL model, which llama.rn runs on-device.
public class FoodClassifierModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FoodClassifier")

    Function("isLfmAvailable") {
      return Self.lfmPaths() != nil
    }

    // Same shape as Android, where the model first has to be copied out of the APK.
    AsyncFunction("prepareLfmModelAsync") { () -> [String: String]? in
      return Self.lfmPaths()
    }
  }

  private static func lfmPaths() -> [String: String]? {
    guard let bundleURL = Bundle(for: FoodClassifierModule.self)
      .url(forResource: "FoodClassifierModel", withExtension: "bundle"),
          let bundle = Bundle(url: bundleURL),
          let model = bundle.url(forResource: "BiteScanLFM", withExtension: "gguf"),
          let mmproj = bundle.url(forResource: "BiteScanLFM-mmproj", withExtension: "gguf") else {
      return nil
    }
    return ["model": model.path, "mmproj": mmproj.path]
  }
}
