import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Reminder } from '@/types/reminder';

const STORAGE_KEY = 'reminders_data';

// ----------------------------------------
// LOAD FROM STORAGE
// ----------------------------------------
function loadReminders(): Reminder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// ----------------------------------------
// SAVE TO STORAGE
// ----------------------------------------
function saveReminders(reminders: Reminder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch (e) {
    console.warn('Failed to save reminders to localStorage', e);
  }
}

export function useReminders() {

  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);

  // Persist changes
  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // ----------------------------------------
  // ADD REMINDER
  // ----------------------------------------
  const addReminder = useCallback(
    (data: Omit<Reminder, 'id' | 'completed' | 'notified'>) => {

      const reminder: Reminder = {
        ...data,
        id: uuidv4(),
        completed: false,
        notified: false,
        snoozedUntil: undefined
      };

      setReminders(prev => [reminder, ...prev]);
      return reminder;
    },
    []
  );

  // ----------------------------------------
  // PARTIAL UPDATE (used by UI)
  // ----------------------------------------
  const updateReminder = useCallback(
    (id: string, data: Partial<Reminder>) => {
      setReminders(prev =>
        prev.map(r => (r.id === id ? { ...r, ...data } : r))
      );
    },
    []
  );

  // ----------------------------------------
  // FULL OBJECT UPDATE (🔥 used by notifications)
  // ----------------------------------------
  const replaceReminder = useCallback(
    (updatedReminder: Reminder) => {
      setReminders(prev =>
        prev.map(r =>
          r.id === updatedReminder.id ? updatedReminder : r
        )
      );
    },
    []
  );

  // ----------------------------------------
  // DELETE
  // ----------------------------------------
  const deleteReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  // ----------------------------------------
  // COMPLETE
  // ----------------------------------------
  const completeReminder = useCallback((id: string) => {
    setReminders(prev =>
      prev.map(r =>
        r.id === id ? { ...r, completed: true } : r
      )
    );
  }, []);

  // ----------------------------------------
  // SNOOZE (local state only — scheduling handled elsewhere)
  // ----------------------------------------
  const snoozeReminder = useCallback((id: string, minutes: number) => {

    const snoozedUntil = new Date(
      Date.now() + minutes * 60 * 1000
    ).toISOString();

    setReminders(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              snoozedUntil,
              notified: false
            }
          : r
      )
    );
  }, []);

  // ----------------------------------------
  // MARK NOTIFIED (for "once" reminders)
  // ----------------------------------------
  const markNotified = useCallback((id: string) => {
    setReminders(prev =>
      prev.map(r =>
        r.id === id ? { ...r, notified: true } : r
      )
    );
  }, []);

  // ----------------------------------------
  // CLEAR SNOOZE
  // Called after a snoozed reminder's snooze time fires.
  // Resets snoozedUntil so the reminder returns to its normal
  // repeat schedule (daily/weekly) or becomes overdue (once).
  // Also resets notified so the next occurrence will be scheduled.
  // ----------------------------------------
  const clearSnooze = useCallback((id: string) => {
    setReminders(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, snoozedUntil: undefined, notified: false }
          : r
      )
    );
  }, []);

  // ----------------------------------------
  // SORTED LISTS
  // ----------------------------------------
  const activeReminders = reminders
    .filter(r => !r.completed)
    .sort(
      (a, b) =>
        new Date(a.dateTime).getTime() -
        new Date(b.dateTime).getTime()
    );

  const completedReminders = reminders
    .filter(r => r.completed)
    .sort(
      (a, b) =>
        new Date(b.dateTime).getTime() -
        new Date(a.dateTime).getTime()
    );

  return {
    reminders,
    activeReminders,
    completedReminders,
    addReminder,
    updateReminder,     // partial updates
    replaceReminder,    // full object update (used by notifications)
    deleteReminder,
    completeReminder,
    snoozeReminder,
    markNotified,
    clearSnooze,        // clears snoozedUntil after snooze fires
  };
}