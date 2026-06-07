package com.adhivio.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

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
