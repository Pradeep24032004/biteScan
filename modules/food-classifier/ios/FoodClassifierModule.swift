import CoreML
import ExpoModulesCore
import UIKit
import Vision

/// Runs the bundled BiteScan food model (ml/export_coreml.py) on a photo, fully on-device.
public class FoodClassifierModule: Module {
  private var model: VNCoreMLModel?

  public func definition() -> ModuleDefinition {
    Name("FoodClassifier")

    Function("isModelAvailable") {
      return Self.packagedModelURL() != nil
    }

    // File paths of the bundled LFM2.5-VL model (run by llama.rn), or nil if not bundled.
    Function("lfmModelPaths") { () -> [String: String]? in
      return Self.lfmPaths()
    }

    Function("isLfmAvailable") {
      return Self.lfmPaths() != nil
    }

    // Same shape as Android, where the model first has to be copied out of the APK.
    AsyncFunction("prepareLfmModelAsync") { () -> [String: String]? in
      return Self.lfmPaths()
    }

    AsyncFunction("classifyAsync") { (uri: String, topK: Int) -> [[String: Any]] in
      let model = try self.loadModel()
      guard let url = URL(string: uri),
            let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        throw ImageLoadException(uri)
      }

      let request = VNCoreMLRequest(model: model)
      // The model was trained on centre crops, so match that here.
      request.imageCropAndScaleOption = .centerCrop
      let handler = VNImageRequestHandler(
        cgImage: cgImage,
        orientation: CGImagePropertyOrientation(image.imageOrientation)
      )
      try handler.perform([request])

      let results = (request.results as? [VNClassificationObservation]) ?? []
      return results.prefix(max(1, topK)).map {
        ["label": $0.identifier, "confidence": Double($0.confidence)]
      }
    }
  }

  private func loadModel() throws -> VNCoreMLModel {
    if let model { return model }
    guard let modelURL = Self.packagedModelURL() else {
      throw ModelNotFoundException()
    }
    // Xcode normally compiles the .mlpackage to .mlmodelc at build time; compile on device only if it didn't.
    let compiledURL = modelURL.pathExtension == "mlmodelc" ? modelURL : try MLModel.compileModel(at: modelURL)
    let config = MLModelConfiguration()
    config.computeUnits = .all
    let loaded = try VNCoreMLModel(for: MLModel(contentsOf: compiledURL, configuration: config))
    model = loaded
    return loaded
  }

  private static func lfmPaths() -> [String: String]? {
    guard let bundle = resourceBundle(),
          let model = bundle.url(forResource: "BiteScanLFM", withExtension: "gguf"),
          let mmproj = bundle.url(forResource: "BiteScanLFM-mmproj", withExtension: "gguf") else {
      return nil
    }
    return ["model": model.path, "mmproj": mmproj.path]
  }

  private static func resourceBundle() -> Bundle? {
    guard let bundleURL = Bundle(for: FoodClassifierModule.self)
      .url(forResource: "FoodClassifierModel", withExtension: "bundle") else {
      return nil
    }
    return Bundle(url: bundleURL)
  }

  private static func packagedModelURL() -> URL? {
    let bundle = resourceBundle()
    return bundle?.url(forResource: "BiteScanFood", withExtension: "mlmodelc")
      ?? bundle?.url(forResource: "BiteScanFood", withExtension: "mlpackage")
  }
}

internal final class ModelNotFoundException: Exception {
  override var reason: String {
    "BiteScanFood.mlpackage is not bundled. Train and export the model (see ml/README.md), then rebuild the app."
  }
}

internal final class ImageLoadException: GenericException<String> {
  override var reason: String {
    "Could not read the image at '\(param)'"
  }
}

private extension CGImagePropertyOrientation {
  init(_ orientation: UIImage.Orientation) {
    switch orientation {
    case .up: self = .up
    case .upMirrored: self = .upMirrored
    case .down: self = .down
    case .downMirrored: self = .downMirrored
    case .left: self = .left
    case .leftMirrored: self = .leftMirrored
    case .right: self = .right
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}
