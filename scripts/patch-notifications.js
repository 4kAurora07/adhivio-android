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

  // Let's restore the original clean signature if any patch is present, to allow fresh re-patch
  const cleanSignature = `        NotificationStorage storage = new NotificationStorage(context);
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        LocalNotificationsPlugin.fireReceived(notificationJson);`;

  // Search for the start of the patched section and replace it back to clean signature
  const patchStart = content.indexOf('NotificationStorage storage = new NotificationStorage(context);');
  const patchEnd = content.indexOf('LocalNotificationsPlugin.fireReceived(notificationJson);');

  if (patchStart >= 0 && patchEnd > patchStart && (content.includes('escalateInterval') || content.includes('ReminderService'))) {
    console.log('[Patch] Found existing patch. Restoring original code first...');
    const beforePatch = content.substring(0, patchStart);
    const afterPatch = content.substring(patchEnd + 'LocalNotificationsPlugin.fireReceived(notificationJson);'.length);
    content = beforePatch + cleanSignature + afterPatch;
  }

  const targetCode = `        NotificationStorage storage = new NotificationStorage(context);
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        LocalNotificationsPlugin.fireReceived(notificationJson);`;

  const replacementCode = `        NotificationStorage storage = new NotificationStorage(context);
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));

        // Process background tasks/escalation natively without active foreground services
        if (notificationJson != null) {
            try {
                org.json.JSONObject extra = notificationJson.optJSONObject("extra");
                if (extra != null) {
                    // --- Custom background sound playback ---
                    String sound = extra.optString("sound", "");
                    String reminderId = extra.optString("reminderId", "");
                    if ("custom".equals(sound) && !reminderId.isEmpty()) {
                        Intent serviceIntent = new Intent(context, com.adhivio.app.ReminderService.class);
                        serviceIntent.setAction(com.adhivio.app.ReminderService.ACTION_PLAY_SOUND);
                        serviceIntent.putExtra("soundKey", reminderId);

                        // Read native volume setting from shared preferences
                        float volume = context.getSharedPreferences("adhivio_settings", Context.MODE_PRIVATE)
                            .getFloat("volume", 0.7f);
                        serviceIntent.putExtra("volume", volume);

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
                Logger.error("LN", "Failed to process extra tasks in background", e);
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
  console.log('[Patch] Successfully patched TimedNotificationPublisher.java to support escalating alerts natively!');
} catch (err) {
  console.error(`[Patch] Failed to patch file: ${err.message}`);
  process.exit(1);
}
