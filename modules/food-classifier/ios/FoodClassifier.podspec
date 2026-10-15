Pod::Spec.new do |s|
  s.name           = 'FoodClassifier'
  s.version        = '1.0.0'
  s.summary        = 'On-device Indian food classifier for BiteScan'
  s.description    = 'Runs the BiteScan Core ML food model with Vision.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"

  # BiteScanFood.mlpackage (EfficientNet, ml/export_coreml.py) and the LFM2.5-VL GGUF files
  # (BiteScanLFM.gguf + BiteScanLFM-mmproj.gguf). Each is optional; the JS side checks what's bundled.
  s.resource_bundles = {
    'FoodClassifierModel' => ['models/*.mlpackage', 'models/*.gguf']
  }
end
