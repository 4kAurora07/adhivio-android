/**
 * notificationUtils.ts
 *
 * Pure utility functions used by useNotifications.
 * Extracted here so they can be unit-tested without React or Capacitor.
 */

import type { Reminder } from '@/types/reminder';
import { getNextWorkingDay } from '@/lib/holidays';

// ─────────────────────────────────────────────────────────────────────────────
// UUID → Numeric ID  (djb2 hash, deterministic, 32-bit safe)
// Android notification IDs must be 32-bit signed integers.
// ─────────────────────────────────────────────────────────────────────────────
export function uuidToNumericId(uuid: string): number {
  let hash = 5381;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 33) ^ uuid.charCodeAt(i);
  }
  return Math.abs(hash >>> 0) || 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Next fire time
// Returns the next Date the notification should fire, or null if it shouldn't.
// ─────────────────────────────────────────────────────────────────────────────
export function getNextFireTime(
  reminder: Reminder,
  now: number,
  skipHolidaysSetting = false,
): Date | null {
  // Snoozed — fire at snooze time if it's still in the future
  if (reminder.snoozedUntil) {
    const d = new Date(reminder.snoozedUntil);
    return d.getTime() > now ? d : null;
  }

  let fireAt = new Date(reminder.dateTime);

  const adjustHolidays = (date: Date): Date => {
    const skip = reminder.skipHolidays || skipHolidaysSetting;
    return skip ? getNextWorkingDay(date) : date;
  };

  // Future one-time or first occurrence of a repeat
  if (fireAt.getTime() > now) {
    return adjustHolidays(fireAt);
  }

  // Past one-time reminder — don't reschedule
  if (reminder.repeat === 'once') return null;

  // Check global end-date cap
  if (reminder.endDate) {
    const endLimit = new Date(reminder.endDate).getTime();
    if (now > endLimit) return null;
  }

  if (reminder.repeat === 'daily') {
    while (fireAt.getTime() <= now) {
      fireAt = new Date(fireAt.getTime() + 24 * 60 * 60 * 1000);
    }
  } else if (reminder.repeat === 'weekly') {
    while (fireAt.getTime() <= now) {
      fireAt = new Date(fireAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  } else if (reminder.repeat === 'custom' && reminder.repeatRule) {
    const rule = reminder.repeatRule;
    if (rule.type === 'days') {
      const intervalDays = rule.interval || 1;
      while (fireAt.getTime() <= now) {
        fireAt = new Date(fireAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      }
    } else if (rule.type === 'weekdays') {
      const weekdays = rule.days || [];
      if (weekdays.length === 0) return null;
      while (fireAt.getTime() <= now || !weekdays.includes(fireAt.getDay())) {
        fireAt = new Date(fireAt.getTime() + 24 * 60 * 60 * 1000);
      }
    } else if (rule.type === 'monthly') {
      while (fireAt.getTime() <= now) {
        fireAt.setMonth(fireAt.getMonth() + 1);
      }
    }
  } else {
    return null;
  }

  // End-date cap after advancing
  if (reminder.endDate) {
    const endLimit = new Date(reminder.endDate).getTime();
    if (fireAt.getTime() > endLimit) return null;
  }

  return adjustHolidays(fireAt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume clamp helper
// ─────────────────────────────────────────────────────────────────────────────
export function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─────────────────────────────────────────────────────────────────────────────
// Build notification body from a reminder
// ─────────────────────────────────────────────────────────────────────────────
export function buildNotificationBody(reminder: Reminder): string {
  return reminder.description ? reminder.description : `⏰ ${reminder.title}`;
}

export function buildPriorityPrefix(priority: Reminder['priority']): string {
  if (priority === 'high')   return '🔴 ';
  if (priority === 'medium') return '🟡 ';
  return '🟢 ';
}
