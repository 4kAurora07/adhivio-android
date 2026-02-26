import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Reminder, AppSettings } from '@/types/reminder';

export function useNotifications(
  reminders: Reminder[],
  settings: AppSettings,
  markNotified: (id: string) => void
) {

  // Schedule reminders natively
  useEffect(() => {
    if (!settings.notificationsEnabled) return;

    const scheduleReminders = async () => {

      try {
        const notifications = reminders
          .filter(r => !r.completed && !r.notified)
          .map(r => {

            const rawTime = r.snoozedUntil ? r.snoozedUntil : r.dateTime;

            if (!rawTime) return null;

            // Force safe ISO date parsing
            const triggerDate = new Date(new Date(rawTime).toISOString());

            // Validate date
            if (isNaN(triggerDate.getTime())) {
              console.warn("Invalid date for reminder:", r.title, rawTime);
              return null;
            }

            // Skip past reminders
            if (triggerDate.getTime() <= Date.now()) {
              console.log("Skipping past reminder:", r.title);
              return null;
            }

            const numericId =
              Number(r.id.replace(/\D/g, '').slice(0, 9)) ||
              Math.floor(Math.random() * 100000000);

            return {
              id: numericId,
              title: r.title,
              body: r.description || `Reminder: ${r.title}`,
              schedule: {
                at: triggerDate,
                allowWhileIdle: true,
              },
              sound: "reminder_sound"
            };
          })
          .filter(Boolean) as any[];

        if (notifications.length > 0) {
          await LocalNotifications.schedule({
            notifications
          });
        }

      } catch (err) {
        console.error("Notification scheduling error:", err);
      }
    };

    scheduleReminders();

  }, [reminders, settings.notificationsEnabled]);

  // Listener when notification is received
  useEffect(() => {

    let listenerHandle: any;

    const setupListener = async () => {
      listenerHandle = await LocalNotifications.addListener(
        'localNotificationReceived',
        notification => {
          markNotified(String(notification.id));
        }
      );
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };

  }, [markNotified]);

}