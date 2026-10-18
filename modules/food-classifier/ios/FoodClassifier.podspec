Pod::Spec.new do |s|
  s.name           = 'FoodClassifier'
  s.version        = '1.0.0'
  s.summary        = 'Bundles the BiteScan food model'
  s.description    = 'Ships the fine-tuned LFM2.5-VL GGUF files that llama.rn runs on-device.'
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

  # The LFM2.5-VL GGUF files (BiteScanLFM.gguf + BiteScanLFM-mmproj.gguf) exported by ml/.
  s.resource_bundles = {
    'FoodClassifierModel' => ['models/*.gguf']
  }
end
