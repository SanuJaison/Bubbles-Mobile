package com.bubbles.background

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * A quiet foreground service whose only job is to keep the process (and with
 * it the Socket.IO connection) alive while Bubbles is minimized. Without FCM
 * this is the only way Android lets a chat app receive messages in the
 * background, because a cached app gets frozen and its socket stops reading.
 */
class BubblesBackgroundService : Service() {

  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    createChannel()
    acquireWakeLock()
  }

  override fun onDestroy() {
    releaseWakeLock()
    super.onDestroy()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Bubbles"
    val text = intent?.getStringExtra(EXTRA_TEXT) ?: "Listening for new messages"

    val notification = buildNotification(title, text)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }

    // START_STICKY: if Android kills the process anyway, bring the service
    // back so the socket reconnects without the user reopening the app.
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  /**
   * A foreground service is not enough on its own: once the screen goes off
   * Android suspends the CPU and the socket stops reading until the next wake
   * up. A partial wake lock keeps the processor running (screen and radios are
   * unaffected) so message delivery is immediate.
   */
  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return

    try {
      val powerManager = getSystemService(PowerManager::class.java) ?: return

      wakeLock = powerManager
        .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_LOCK_TAG)
        .apply {
          setReferenceCounted(false)
          acquire()
        }
    } catch (error: Exception) {
      // Missing permission or a revoked service must not crash the app.
      wakeLock = null
    }
  }

  private fun releaseWakeLock() {
    try {
      if (wakeLock?.isHeld == true) {
        wakeLock?.release()
      }
    } catch (error: Exception) {
      // Ignore — the system already dropped the lock.
    }

    wakeLock = null
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = getSystemService(NotificationManager::class.java) ?: return

    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Message delivery",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Keeps Bubbles connected so new messages arrive instantly."
      setShowBadge(false)
      enableVibration(false)
      setSound(null, null)
    }

    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(title: String, text: String): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = launchIntent?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(android.R.drawable.stat_notify_chat)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setOngoing(true)
      .setShowWhen(false)
      .setSilent(true)
      .setContentIntent(contentIntent)
      .build()
  }

  companion object {
    const val EXTRA_TITLE = "bubbles.background.title"
    const val EXTRA_TEXT = "bubbles.background.text"

    private const val CHANNEL_ID = "bubbles-background"
    private const val NOTIFICATION_ID = 4210
    private const val WAKE_LOCK_TAG = "Bubbles:chat-connection"
  }
}
