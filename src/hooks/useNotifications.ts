import { useEffect, useRef, useCallback } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { registerPlugin, Capacitor } from "@capacitor/core";
import type { Reminder, BuiltInSound } from "@/types/reminder";
import { getNextWorkingDay } from "@/lib/holidays";

interface SoundStoragePlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
  saveSound(options: { key: string; base64: string }): Promise<{ path: string }>;
  playSound(options: { key: string; volume?: number }): Promise<void>;
  deleteSound(options: { key: string }): Promise<{ deleted: boolean }>;
}

const SoundStorage = registerPlugin<SoundStoragePlugin>("SoundStorage");
const isAndroid = Capacitor.getPlatform() === "android";

// ─────────────────────────────────────────────────────────────────────────────
// UUID → Numeric ID (djb2 hash, deterministic, 32-bit safe)
// Android notification IDs must be 32-bit signed integers.
// ─────────────────────────────────────────────────────────────────────────────
function uuidToNumericId(uuid: string): number {
  let hash = 5381;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 33) ^ uuid.charCodeAt(i);
  }
  return Math.abs(hash >>> 0) || 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission — re-checked each app session (NOT cached across sessions)
// so that users who grant permission in Settings are not stuck denied.
// ─────────────────────────────────────────────────────────────────────────────
let _permissionThisSession: boolean | null = null;

async function ensurePermission(): Promise<boolean> {
  if (_permissionThisSession !== null) return _permissionThisSession;
  try {
    // First check existing status — avoids prompting again if already granted
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") {
      _permissionThisSession = true;
      return true;
    }
    // Not granted — request it
    const req = await LocalNotifications.requestPermissions();
    _permissionThisSession = req.display === "granted";
    return _permissionThisSession;
  } catch {
    _permissionThisSession = false;
    return false;
  }
}



// ─────────────────────────────────────────────────────────────────────────────
// Next fire time
// ─────────────────────────────────────────────────────────────────────────────
function getNextFireTime(reminder: Reminder, now: number, skipHolidaysSetting = false): Date | null {
  if (reminder.snoozedUntil) {
    const d = new Date(reminder.snoozedUntil);
    return d.getTime() > now ? d : null;
  }

  let fireAt = new Date(reminder.dateTime);

  const adjustHolidays = (date: Date) => {
    const skip = reminder.skipHolidays || skipHolidaysSetting;
    return skip ? getNextWorkingDay(date) : date;
  };

  if (fireAt.getTime() > now) {
    return adjustHolidays(fireAt);
  }

  if (reminder.repeat === "once") return null;

  // Check if we have already passed the end date
  if (reminder.endDate) {
    const endLimit = new Date(reminder.endDate).getTime();
    if (now > endLimit) return null;
  }

  if (reminder.repeat === "daily") {
    while (fireAt.getTime() <= now) {
      fireAt = new Date(fireAt.getTime() + 24 * 60 * 60 * 1000);
    }
  } else if (reminder.repeat === "weekly") {
    while (fireAt.getTime() <= now) {
      fireAt = new Date(fireAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  } else if (reminder.repeat === "custom" && reminder.repeatRule) {
    const rule = reminder.repeatRule;
    if (rule.type === "days") {
      const intervalDays = rule.interval || 1;
      while (fireAt.getTime() <= now) {
        fireAt = new Date(fireAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      }
    } else if (rule.type === "weekdays") {
      const weekdays = rule.days || [];
      if (weekdays.length === 0) return null;
      while (fireAt.getTime() <= now || !weekdays.includes(fireAt.getDay())) {
        fireAt = new Date(fireAt.getTime() + 24 * 60 * 60 * 1000);
      }
    } else if (rule.type === "monthly") {
      while (fireAt.getTime() <= now) {
        fireAt.setMonth(fireAt.getMonth() + 1);
      }
    }
  } else {
    return null;
  }

  // Check if target fire matches end date constraints
  if (reminder.endDate) {
    const endLimit = new Date(reminder.endDate).getTime();
    if (fireAt.getTime() > endLimit) return null;
  }

  return adjustHolidays(fireAt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Web Audio foreground sound (in-app alerts)
// ─────────────────────────────────────────────────────────────────────────────
let _sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_sharedCtx || _sharedCtx.state === "closed") {
    _sharedCtx = new AudioContext();
  }
  return _sharedCtx;
}

function playOscillator(
  ctx: AudioContext,
  gain: GainNode,
  freq: number,
  type: OscillatorType,
  dur: number,
  pattern: number[] = [1]
) {
  let t = ctx.currentTime;
  pattern.forEach((beat) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + beat * dur);
    t += beat * dur + 0.05;
  });
}

async function playBuiltInForeground(sound: BuiltInSound, volume = 0.7) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    gain.connect(ctx.destination);
    switch (sound) {
      case "alarm":
        playOscillator(ctx, gain, 880,  "square",   0.15, [1, 1, 1, 1]);
        break;
      case "beep":
        playOscillator(ctx, gain, 1000, "sine",     0.1,  [1, 0.5, 1]);
        break;
      case "soft-tone":
        playOscillator(ctx, gain, 520,  "sine",     0.3,  [1, 1]);
        break;
      case "bell":
        playOscillator(ctx, gain, 660,  "triangle", 0.4,  [1]);
        break;
      case "digital-alert":
        playOscillator(ctx, gain, 1200, "sawtooth", 0.08, [1, 1, 1, 0.5, 1, 1]);
        break;
    }
  } catch (e) {
    console.warn("[Notifications] Foreground sound failed:", e);
  }
}

async function playCustomForeground(base64: string, volume = 0.7) {
  try {
    const audio = new Audio(base64);
    audio.volume = Math.max(0, Math.min(1, volume));
    await audio.play();
  } catch (e) {
    console.warn("[Notifications] Custom foreground sound failed:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook options
// ─────────────────────────────────────────────────────────────────────────────
interface UseNotificationsOptions {
  reminders: Reminder[];
  markNotified: (id: string) => void;
  clearSnooze: (id: string) => void;
  volume?: number;
  skipKeralaHolidays?: boolean;
  onForegroundAlert?: (reminder: Reminder) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// useNotifications
//
// Key behaviours:
//  1. Schedules ONE upcoming notification per reminder (Android limitation).
//     Repeating reminders are rescheduled after each fire via the received
//     listener — this works reliably when the app is in foreground.
//     When the app is in background/killed, Capacitor reschedules on next open
//     via the syncSchedule effect (which runs on every mount).
//  2. Custom sounds play in-app (foreground) via Web Audio / <audio>.
//     Background custom sounds fall back to reminder_sound.mp3 — this is an
//     Android restriction: base64 cannot be passed to a system notification.
//  3. Snoozed reminders fire at snoozedUntil; after firing, clearSnooze()
//     resets the reminder so normal scheduling resumes.
//  4. "once" reminders call markNotified() after firing to prevent re-scheduling.
//  5. Completed reminders are never scheduled.
//  6. Permissions are checked once per session (not re-prompted if granted).
// ─────────────────────────────────────────────────────────────────────────────
export function useNotifications({
  reminders,
  markNotified,
  clearSnooze,
  volume = 0.7,
  skipKeralaHolidays = false,
  onForegroundAlert,
}: UseNotificationsOptions): void {
  const markNotifiedRef = useRef(markNotified);
  const clearSnoozeRef  = useRef(clearSnooze);
  const volumeRef       = useRef(volume);
  const remindersRef    = useRef(reminders);
  const onForegroundAlertRef = useRef(onForegroundAlert);
  const scheduledIds    = useRef<Set<number>>(new Set());
  const prevRemindersRef = useRef<Reminder[]>(reminders);

  useEffect(() => { markNotifiedRef.current = markNotified; }, [markNotified]);
  useEffect(() => { clearSnoozeRef.current  = clearSnooze;  }, [clearSnooze]);
  useEffect(() => { volumeRef.current       = volume;       }, [volume]);
  useEffect(() => { remindersRef.current    = reminders;    }, [reminders]);
  useEffect(() => { onForegroundAlertRef.current = onForegroundAlert; }, [onForegroundAlert]);

  // ── Foreground notification received ─────────────────────────────────────
  // Plays the reminder's own sound and handles state transitions.
  // Also re-schedules the NEXT occurrence for repeating reminders.
  const handleReceived = useCallback(async (numericId: number) => {
    const all = remindersRef.current;
    const reminder = all.find((r) => uuidToNumericId(r.id) === numericId);
    if (!reminder) return;

    console.debug("[Notifications] Foreground fire:", reminder.title);

    // Play sound in-app
    try {
      if (reminder.sound === "custom" && reminder.customSoundData) {
        await playCustomForeground(reminder.customSoundData, volumeRef.current);
      } else if (reminder.sound !== "custom") {
        await playBuiltInForeground(reminder.sound, volumeRef.current);
      }
    } catch { /* non-fatal */ }

    // Trigger UI popup
    if (onForegroundAlertRef.current) {
      onForegroundAlertRef.current(reminder);
    }

    // State updates
    if (reminder.snoozedUntil) {
      // Snooze fired — clear it so normal repeat resumes
      clearSnoozeRef.current(reminder.id);
    } else if (reminder.repeat === "once") {
      // One-time fired — stop rescheduling
      markNotifiedRef.current(reminder.id);
    }
    // daily/weekly: getNextFireTime advances automatically on next syncSchedule
  }, []);

  // ── Event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const subReceived = LocalNotifications.addListener(
      "localNotificationReceived",
      (n) => handleReceived(n.id)
    );

    // User tapped notification from shade (background/killed app)
    const subAction = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (action) => {
        const all = remindersRef.current;
        const reminder = all.find(
          (r) => uuidToNumericId(r.id) === action.notification.id
        );
        if (!reminder) return;

        console.debug("[Notifications] Tapped from shade:", reminder.title);

        if (onForegroundAlertRef.current) {
          onForegroundAlertRef.current(reminder);
        }

        if (reminder.snoozedUntil) {
          clearSnoozeRef.current(reminder.id);
        } else if (reminder.repeat === "once") {
          markNotifiedRef.current(reminder.id);
        }
        // Repeating: next occurrence already handled by syncSchedule on re-open
      }
    );

    return () => {
      subReceived.then((h) => h.remove());
      subAction.then((h) => h.remove());
    };
  }, [handleReceived]);

  // ── Schedule / cancel sync ────────────────────────────────────────────────
  // Runs whenever `reminders` changes. Cancels stale IDs, schedules new ones.
  // This also runs on app launch — catching up any missed repeating reminders.
  useEffect(() => {
    let cancelled = false;

    async function syncSchedule(): Promise<void> {
      const granted = await ensurePermission();
      if (!granted) {
        console.warn("[Notifications] Permission not granted");
        return;
      }
      if (cancelled) return;

      // --- Custom Native Sound & Service Management ---
      if (isAndroid) {
        try {
          // 1. Delete native custom sounds for deleted reminders
          const deletedReminders = prevRemindersRef.current.filter(
            (prev) => !reminders.some((curr) => curr.id === prev.id)
          );
          for (const deleted of deletedReminders) {
            const cacheKey = `sound_saved_${deleted.id}`;
            localStorage.removeItem(cacheKey);
            if (deleted.sound === "custom") {
              await SoundStorage.deleteSound({ key: deleted.id });
              console.debug(`[Notifications] Deleted native sound file for deleted reminder ${deleted.id}`);
            }
          }

          // 2. Delete native custom sounds for reminders whose sound type is no longer custom
          for (const curr of reminders) {
            const prev = prevRemindersRef.current.find((p) => p.id === curr.id);
            if (prev && prev.sound === "custom" && curr.sound !== "custom") {
              const cacheKey = `sound_saved_${curr.id}`;
              localStorage.removeItem(cacheKey);
              await SoundStorage.deleteSound({ key: curr.id });
              console.debug(`[Notifications] Deleted native sound file for updated reminder ${curr.id}`);
            }
          }

          // 3. Save custom sounds to native storage if they aren't already saved
          for (const reminder of reminders) {
            if (reminder.completed) continue;
            if (reminder.repeat === "once" && reminder.notified) continue;
            if (reminder.sound === "custom" && reminder.customSoundData) {
              const cacheKey = `sound_saved_${reminder.id}`;
              if (!localStorage.getItem(cacheKey)) {
                const res = await SoundStorage.saveSound({
                  key: reminder.id,
                  base64: reminder.customSoundData,
                });
                console.debug(`[Notifications] Saved custom sound for ${reminder.id} at ${res.path}`);
                localStorage.setItem(cacheKey, "true");
              }
            }
          }

          // 4. Start/stop foreground service depending on active reminders
          const activePending = reminders.filter(
            (r) => !r.completed && !(r.repeat === "once" && r.notified)
          );
          if (activePending.length > 0) {
            await SoundStorage.start();
          } else {
            await SoundStorage.stop();
          }
        } catch (e) {
          console.warn("[Notifications] SoundStorage native operations failed:", e);
        }
      }

      prevRemindersRef.current = reminders;
      // -------------------------------------------------

      const now = Date.now();
      const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
      const incomingIds = new Set<number>();

      for (const reminder of reminders) {
        if (reminder.completed) continue;
        if (reminder.repeat === "once" && reminder.notified) continue;

        const fireAt = getNextFireTime(reminder, now, skipKeralaHolidays);
        if (!fireAt) continue;

        const numericId = uuidToNumericId(reminder.id);
        incomingIds.add(numericId);

        // Build notification body
        const body = reminder.description
          ? reminder.description
          : `⏰ ${reminder.title}`;

        // Priority/urgency label in body
        const priorityEmoji =
          reminder.priority === "high"   ? "🔴 " :
          reminder.priority === "medium" ? "🟡 " : "🟢 ";

        toSchedule.push({
          id: numericId,
          title: `${priorityEmoji}${reminder.title}`,
          body,
          schedule: {
            at: fireAt,
            allowWhileIdle: true, // fires in Doze / battery-saver mode
          },
          // NOTE: channelId must match the channel created in main.tsx.
          channelId: "reminder_channel",
          // smallIcon must match a drawable in res/drawable
          smallIcon: "ic_stat_icon_config_sample",
          extra: {
            reminderId: reminder.id,
            sound: reminder.sound,
            escalate: reminder.escalate,
            escalateInterval: reminder.escalateInterval || 5,
          },
        });

        // 5. Pre-warning alerts
        const warnBeforeMinutes = reminder.warnBefore && reminder.warnBefore !== 'none' ? parseInt(reminder.warnBefore) : 0;
        const preWarningFireAt = warnBeforeMinutes > 0 ? new Date(fireAt.getTime() - warnBeforeMinutes * 60 * 1000) : null;
        
        if (preWarningFireAt && preWarningFireAt.getTime() > now) {
          const preWarningId = numericId + 1000000;
          incomingIds.add(preWarningId);
          
          toSchedule.push({
            id: preWarningId,
            title: `⏰ Coming up: ${reminder.title}`,
            body: `Starts in ${reminder.warnBefore} minutes`,
            schedule: {
              at: preWarningFireAt,
              allowWhileIdle: true,
            },
            channelId: "reminder_channel",
            smallIcon: "ic_stat_icon_config_sample",
            extra: {
              reminderId: reminder.id,
              sound: 'soft-tone', // softer sound for warning alerts
              isPreWarning: true,
            }
          });
        }
      }

      // Cancel notifications no longer needed
      const toCancel = [...scheduledIds.current]
        .filter((id) => !incomingIds.has(id))
        .map((id) => ({ id }));

      if (toCancel.length > 0) {
        try {
          await LocalNotifications.cancel({ notifications: toCancel });
          console.debug("[Notifications] Cancelled:", toCancel.map((n) => n.id));
        } catch (e) {
          console.warn("[Notifications] Cancel failed:", e);
        }
      }

      if (cancelled) return;

      if (toSchedule.length > 0) {
        try {
          // Cancel + re-schedule in one pass to ensure updated fire times
          // (updating an existing notification ID replaces it on Android)
          await LocalNotifications.schedule({ notifications: toSchedule });
          console.debug(
            "[Notifications] Scheduled:",
            toSchedule.map((n) => `#${n.id} "${n.title}" @ ${n.schedule?.at}`)
          );
        } catch (e) {
          console.error("[Notifications] Schedule failed:", e);
        }
      }

      scheduledIds.current = incomingIds;
    }

    syncSchedule().catch((e) =>
      console.error("[Notifications] syncSchedule error:", e)
    );

    return () => { cancelled = true; };
  }, [reminders, skipKeralaHolidays]);
}