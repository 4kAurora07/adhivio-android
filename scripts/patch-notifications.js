import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(
  __dirname,
  '../node_modules/@capacitor/local-notifications/android/src/main/java/com/capacitorjs/plugins/localnotifications/TimedNotificationPublisher.java'
);

if (!fs.existsSync(targetFile)) {
  console.error(`[Patch] Target file not found: ${targetFile}`);
  console.error('[Patch] Make sure to run npm install first.');
  process.exit(0);
}

try {
  let content = fs.readFileSync(targetFile, 'utf8');

  // Check if already patched with escalation logic
  if (content.includes('escalateInterval')) {
    console.log('[Patch] TimedNotificationPublisher.java is already patched with custom sound and escalation.');
    process.exit(0);
  }

  // If already patched with just custom sound, restore it first to allow clean patch
  if (content.includes('com.adhivio.app.ReminderService')) {
    console.log('[Patch] Old custom sound patch detected. Restoring original node_modules file first...');
    // We can do a simple restore by re-installing or running npm install, but to be fast
    // let's just replace the old patch back to the clean signature.
    const oldPatchedSignature = `        NotificationStorage storage = new NotificationStorage(context);
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));

        // Play custom sound in background if configured
        if (notificationJson != null) {
            try {
                org.json.JSONObject extra = notificationJson.optJSONObject("extra");
                if (extra != null) {
                    String sound = extra.optString("sound");
                    String reminderId = extra.optString("reminderId");
                    if ("custom".equals(sound) && reminderId != null && !reminderId.isEmpty()) {
                        Intent serviceIntent = new Intent(context, Class.forName("com.adhivio.app.ReminderService"));
                        serviceIntent.setAction("com.adhivio.app.PLAY_SOUND");
                        serviceIntent.putExtra("soundKey", reminderId);
                        serviceIntent.putExtra("volume", 0.7f);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent);
                        } else {
                            context.startService(serviceIntent);
                        }
                    }
                }
            } catch (Exception e) {
                Logger.error("LN", "Failed to play custom sound in background", e);
            }
        }

        LocalNotificationsPlugin.fireReceived(notificationJson);`;

    const cleanSignature = `        NotificationStorage storage = new NotificationStorage(context);
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        LocalNotificationsPlugin.fireReceived(notificationJson);`;

    content = content.replace(oldPatchedSignature, cleanSignature);
  }

  const targetCode = `        NotificationStorage storage = new NotificationStorage(context);
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        LocalNotificationsPlugin.fireReceived(notificationJson);`;

  const replacementCode = `        NotificationStorage storage = new NotificationStorage(context);
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));

        // Play custom sound in background if configured
        if (notificationJson != null) {
            try {
                org.json.JSONObject extra = notificationJson.optJSONObject("extra");
                if (extra != null) {
                    String sound = extra.optString("sound");
                    String reminderId = extra.optString("reminderId");
                    if ("custom".equals(sound) && reminderId != null && !reminderId.isEmpty()) {
                        Intent serviceIntent = new Intent(context, Class.forName("com.adhivio.app.ReminderService"));
                        serviceIntent.setAction("com.adhivio.app.PLAY_SOUND");
                        serviceIntent.putExtra("soundKey", reminderId);
                        serviceIntent.putExtra("volume", 0.7f);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent);
                        } else {
                            context.startService(serviceIntent);
                        }
                    }

                    // --- Escalating Alerts ---
                    boolean escalate = extra.optBoolean("escalate", false);
                    int escalateInterval = extra.optInt("escalateInterval", 5);
                    if (escalate) {
                        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                        Intent clone = (Intent) intent.clone();
                        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                            flags = flags | PendingIntent.FLAG_MUTABLE;
                        }
                        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, id, clone, flags);
                        long trigger = System.currentTimeMillis() + (escalateInterval * 60 * 1000);
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                            alarmManager.set(AlarmManager.RTC, trigger, pendingIntent);
                        } else {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
                        }
                        Logger.debug("LN", "Scheduled escalation for notification " + id + " in " + escalateInterval + " mins");
                    }
                }
            } catch (Exception e) {
                Logger.error("LN", "Failed to process custom sound or escalation in background", e);
            }
        }

        LocalNotificationsPlugin.fireReceived(notificationJson);`;

  if (!content.includes(targetCode)) {
    console.error('[Patch] Target signature not found in TimedNotificationPublisher.java!');
    console.error('[Patch] This might be due to a version mismatch of @capacitor/local-notifications.');
    process.exit(1);
  }

  content = content.replace(targetCode, replacementCode);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[Patch] Successfully patched TimedNotificationPublisher.java to support custom background sounds and escalating alerts!');
} catch (err) {
  console.error(`[Patch] Failed to patch file: ${err.message}`);
  process.exit(1);
}
