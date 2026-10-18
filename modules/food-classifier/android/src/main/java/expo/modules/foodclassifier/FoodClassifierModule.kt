package expo.modules.foodclassifier

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private const val MODEL = "BiteScanLFM.gguf"
private const val MMPROJ = "BiteScanLFM-mmproj.gguf"

/**
 * Android side of BiteScan's food recogniser. The fine-tuned LFM2.5-VL model (run by llama.rn)
 * ships as APK assets; llama.cpp needs real file paths, so it's copied to app storage once.
 */
class FoodClassifierModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FoodClassifier")

    Function("isLfmAvailable") {
      val assets = context.assets.list("")?.toSet() ?: emptySet()
      MODEL in assets && MMPROJ in assets
    }

    AsyncFunction("prepareLfmModelAsync") {
      val dir = File(context.filesDir, "models").apply { mkdirs() }
      mapOf("model" to copyAsset(MODEL, dir).absolutePath, "mmproj" to copyAsset(MMPROJ, dir).absolutePath)
    }
  }

  /** Copies an asset unless an identical-size copy is already there (e.g. after an app update). */
  private fun copyAsset(name: String, dir: File): File {
    val target = File(dir, name)
    context.assets.openFd(name).use { fd ->
      if (target.exists() && target.length() == fd.length) return target
    }
    val tmp = File(dir, "$name.tmp")
    context.assets.open(name).use { input -> tmp.outputStream().use { input.copyTo(it, 1 shl 20) } }
    tmp.renameTo(target)
    return target
  }
}
