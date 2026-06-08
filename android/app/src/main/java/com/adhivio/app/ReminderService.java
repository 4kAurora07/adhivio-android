package com.adhivio.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * ReminderService — Lightweight Android Foreground Service
 *
 * Purpose:
 *   Keeps the app's process alive in the background so that:
 *   1. Capacitor LocalNotifications can fire reliably.
 *   2. Custom sounds (saved as files in app internal storage) can be played
 *      even when the app is not in the foreground.
 *
 * Power usage:
 *   The service itself is nearly zero-cost — it does nothing but sit idle.
 *   It holds a foreground notification (required by Android 8+) but does
 *   not acquire CPU wakelock or run any periodic work.
 *
 * Actions (sent via startService Intent):
 *   ACTION_START        — start the service
 *   ACTION_STOP         — stop the service
 *   ACTION_PLAY_SOUND   — play a sound file from internal storage
 *                          extras: "soundKey" (prefs key for the file path)
 *                                  "volume" (float 0.0–1.0)
 */
public class ReminderService extends Service {

    private static final String TAG = "ReminderService";

    public static final String ACTION_START      = "com.adhivio.app.START_SERVICE";
    public static final String ACTION_STOP       = "com.adhivio.app.STOP_SERVICE";
    public static final String ACTION_PLAY_SOUND = "com.adhivio.app.PLAY_SOUND";

    // Foreground service notification channel (separate from reminder_channel)
    private static final String FG_CHANNEL_ID   = "adhivio_fg_service";
    private static final int    FG_NOTIF_ID     = 9999;

    public static final String PREFS_NAME       = "adhivio_sounds";

    private MediaPlayer mediaPlayer;

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        createForegroundChannel();
        Log.d(TAG, "Service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // Restarted by Android after being killed — re-enter foreground
            startForeground(FG_NOTIF_ID, buildForegroundNotification());
            return START_STICKY;
        }

        String action = intent.getAction();
        if (action == null) action = ACTION_START;

        switch (action) {
            case ACTION_START:
                startForeground(FG_NOTIF_ID, buildForegroundNotification());
                Log.d(TAG, "Foreground service started");
                break;

            case ACTION_STOP:
                Log.d(TAG, "Stopping service");
                stopForeground(true);
                stopSelf();
                break;

            case ACTION_PLAY_SOUND:
                startForeground(FG_NOTIF_ID, buildForegroundNotification());
                String soundKey = intent.getStringExtra("soundKey");
                float volume    = intent.getFloatExtra("volume", 0.7f);
                if (soundKey != null) playStoredSound(soundKey, volume);
                break;
        }

        // START_STICKY: Android restarts the service if it is killed
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        super.onDestroy();
        Log.d(TAG, "Service destroyed");
    }

    // ─── Foreground notification ──────────────────────────────────────────────

    private void createForegroundChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                FG_CHANNEL_ID,
                "Adhivio Background Service",
                NotificationManager.IMPORTANCE_LOW  // IMPORTANCE_LOW = silent, no sound
            );
            ch.setDescription("Keeps reminders running in background");
            ch.setShowBadge(false);
            ch.enableVibration(false);
            ch.setSound(null, null); // No sound for this channel
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }

    private Notification buildForegroundNotification() {
        // Tap notification to re-open app
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, FG_CHANNEL_ID)
            .setContentTitle("Adhivio")
            .setContentText("Reminders are active")
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentIntent(pi)
            .setOngoing(true)        // Cannot be swiped away by user
            .setSilent(true)         // No sound/vibration for the service notification
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    // ─── Sound playback ───────────────────────────────────────────────────────

    /**
     * Reads a base64-encoded audio file that was previously saved to internal
     * storage by the JS layer (via the SoundStoragePlugin), decodes it to a
     * temp file, and plays it.
     */
    private void playStoredSound(String soundKey, float volume) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String filePath = prefs.getString(soundKey, null);

        if (filePath == null) {
            Log.w(TAG, "No sound file stored for key: " + soundKey);
            return;
        }

        File soundFile = new File(filePath);
        if (!soundFile.exists()) {
            Log.w(TAG, "Sound file not found: " + filePath);
            return;
        }

        try {
            releasePlayer();
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            );
            mediaPlayer.setDataSource(filePath);
            mediaPlayer.setVolume(volume, volume);
            mediaPlayer.prepare();
            mediaPlayer.start();
            mediaPlayer.setOnCompletionListener(mp -> releasePlayer());
            Log.d(TAG, "Playing custom sound: " + filePath);
        } catch (IOException e) {
            Log.e(TAG, "Failed to play sound: " + e.getMessage());
            releasePlayer();
        }
    }

    private void releasePlayer() {
        if (mediaPlayer != null) {
            if (mediaPlayer.isPlaying()) mediaPlayer.stop();
            mediaPlayer.release();
            mediaPlayer = null;
        }

        // If the persistent background service is NOT enabled, stop the service now
        boolean serviceActive = getSharedPreferences("adhivio_settings", MODE_PRIVATE)
            .getBoolean("backgroundServiceActive", false);

        if (!serviceActive) {
            Log.d(TAG, "Stopping service after sound completion (backgroundServiceActive is false)");
            stopForeground(true);
            stopSelf();
        }
    }

    // ─── Static helper: save base64 audio to internal storage ────────────────

    /**
     * Decodes a base64 audio data URI and writes it to the app's internal
     * files directory. Returns the file path, or null on failure.
     *
     * Call this from the SoundStoragePlugin when the user uploads a sound.
     */
    public static String saveBase64Sound(android.content.Context ctx, String key, String base64DataUri) {
        try {
            // Strip "data:audio/...;base64," prefix
            String base64 = base64DataUri;
            int commaIdx = base64DataUri.indexOf(',');
            if (commaIdx >= 0) {
                base64 = base64DataUri.substring(commaIdx + 1);
            }

            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            File dir  = new File(ctx.getFilesDir(), "sounds");
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, key + ".mp3");

            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(bytes);
            }

            // Save path to SharedPreferences
            ctx.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
               .edit()
               .putString(key, file.getAbsolutePath())
               .apply();

            Log.d(TAG, "Saved sound: " + file.getAbsolutePath());
            return file.getAbsolutePath();
        } catch (Exception e) {
            Log.e(TAG, "Failed to save sound: " + e.getMessage());
            return null;
        }
    }

    /**
     * Deletes a previously saved custom sound file and removes it from preferences.
     */
    public static boolean deleteSound(android.content.Context ctx, String key) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String filePath = prefs.getString(key, null);
            if (filePath != null) {
                File file = new File(filePath);
                if (file.exists()) {
                    file.delete();
                }
                prefs.edit().remove(key).apply();
                Log.d(TAG, "Deleted sound file: " + filePath);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to delete sound: " + e.getMessage());
        }
        return false;
    }
}
