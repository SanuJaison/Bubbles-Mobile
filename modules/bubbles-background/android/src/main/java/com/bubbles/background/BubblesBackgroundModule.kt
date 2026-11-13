package com.bubbles.background

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BubblesBackgroundModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BubblesBackground")

    Function("start") { title: String, text: String ->
      val context = appContext.reactContext ?: return@Function false

      val intent = Intent(context, BubblesBackgroundService::class.java).apply {
        putExtra(BubblesBackgroundService.EXTRA_TITLE, title)
        putExtra(BubblesBackgroundService.EXTRA_TEXT, text)
      }

      // Android 12+ can refuse a foreground-service start when the app is not
      // in the foreground at that moment. That must never crash the chat.
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        true
      } catch (error: Exception) {
        false
      }
    }

    Function("stop") {
      val context = appContext.reactContext ?: return@Function false

      try {
        context.stopService(Intent(context, BubblesBackgroundService::class.java))
        true
      } catch (error: Exception) {
        false
      }
    }
  }
}
