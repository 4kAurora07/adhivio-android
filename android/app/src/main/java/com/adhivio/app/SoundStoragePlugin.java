package com.adhivio.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.app.AlarmManager;
import android.os.PowerManager;
import android.provider.Settings;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * SoundStoragePlugin — Capacitor Plugin
 *
 * Bridges the JS layer to the native Android ReminderService.
 *
 * JS API:
 *   SoundStorage.start()                          — start the foreground service
 *   SoundStorage.stop()                           — stop it
 *   SoundStorage.saveSound({ key, base64 })       — save base64 audio to disk
 *   SoundStorage.playSound({ key, volume })       — play a saved sound file
 */
@CapacitorPlugin(name = "SoundStorage")
public class SoundStoragePlugin extends Plugin {

    private static final String TAG = "SoundStoragePlugin";

    /** Start the foreground service — keeps process alive. */
    @PluginMethod
    public void start(PluginCall call) {
        startService(ReminderService.ACTION_START, null, 0f);
        call.resolve();
    }

    /** Stop the foreground service. Call when no reminders are pending. */
    @PluginMethod
    public void stop(PluginCall call) {
        startService(ReminderService.ACTION_STOP, null, 0f);
        call.resolve();
    }

    /**
     * Save base64 audio to internal storage for later playback.
     * @param key    Unique key (e.g. the reminder's UUID)
     * @param base64 Full data URI (e.g. "data:audio/mp3;base64,...")
     */
    @PluginMethod
    public void saveSound(PluginCall call) {
        String key    = call.getString("key");
        String base64 = call.getString("base64");

        if (key == null || base64 == null) {
            call.reject("key and base64 are required");
            return;
        }

        Context ctx = getContext();
        String path = ReminderService.saveBase64Sound(ctx, key, base64);

        if (path != null) {
            JSObject ret = new JSObject();
            ret.put("path", path);
            call.resolve(ret);
        } else {
            call.reject("Failed to save sound file");
        }
    }

    /**
     * Play a previously saved sound file via the background service.
     * @param key    The key used when saving
     * @param volume 0.0 – 1.0
     */
    @PluginMethod
    public void playSound(PluginCall call) {
        String key  = call.getString("key");
        float volume = call.getFloat("volume", 0.7f);

        if (key == null) {
            call.reject("key is required");
            return;
        }

        startService(ReminderService.ACTION_PLAY_SOUND, key, volume);
        call.resolve();
    }

    /**
     * Delete a previously saved sound file via preferences key.
     */
    @PluginMethod
    public void deleteSound(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("key is required");
            return;
        }
        Context ctx = getContext();
        boolean deleted = ReminderService.deleteSound(ctx, key);
        JSObject ret = new JSObject();
        ret.put("deleted", deleted);
        call.resolve(ret);
    }

    /** Check notification, exact alarm, and battery exemption permissions */
    @PluginMethod
    public void checkBackgroundPermissions(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();

        // 1. Notifications
        boolean notificationsGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationsGranted = androidx.core.content.ContextCompat.checkSelfPermission(
                ctx,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else {
            notificationsGranted = androidx.core.app.NotificationManagerCompat.from(ctx).areNotificationsEnabled();
        }
        ret.put("notificationsGranted", notificationsGranted);

        // 2. Exact Alarm
        boolean exactAlarmGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            exactAlarmGranted = alarmManager != null && alarmManager.canScheduleExactAlarms();
        }
        ret.put("exactAlarmGranted", exactAlarmGranted);

        // 3. Battery Optimization Exemption
        boolean batteryOptimizationIgnored = true;
        PowerManager powerManager = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            batteryOptimizationIgnored = powerManager.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }
        ret.put("batteryOptimizationIgnored", batteryOptimizationIgnored);

        call.resolve(ret);
    }

    /** Open Settings dialog to grant Exact Alarm permission */
    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        }
        call.resolve();
    }

    /** Open Settings dialog to whitelist battery optimization */
    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        } catch (Exception e) {
            // Fallback to general settings if ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS is not allowed/working
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        }
        call.resolve();
    /** Open general system App Settings screen for the app */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    /** Enable or disable persistent foreground service */
    @PluginMethod
    public void setBackgroundServiceActive(PluginCall call) {
        Boolean active = call.getBoolean("active", false);
        Context ctx = getContext();
        ctx.getSharedPreferences("adhivio_settings", Context.MODE_PRIVATE)
           .edit()
           .putBoolean("backgroundServiceActive", active)
           .apply();

        if (active) {
            startService(ReminderService.ACTION_START, null, 0f);
        } else {
            startService(ReminderService.ACTION_STOP, null, 0f);
        }
        call.resolve();
    }

    /** Store volume setting natively for background alerts */
    @PluginMethod
    public void setVolume(PluginCall call) {
        Float volume = call.getFloat("volume", 0.7f);
        Context ctx = getContext();
        ctx.getSharedPreferences("adhivio_settings", Context.MODE_PRIVATE)
           .edit()
           .putFloat("volume", volume)
           .apply();
        call.resolve();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private void startService(String action, String soundKey, float volume) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, ReminderService.class);
        intent.setAction(action);
        if (soundKey != null) {
            intent.putExtra("soundKey", soundKey);
            intent.putExtra("volume", volume);
        }

        // On Android 8+ foreground services must be started with startForegroundService
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent);
        } else {
            ctx.startService(intent);
        }

        Log.d(TAG, "Service intent sent: " + action);
    }
}
