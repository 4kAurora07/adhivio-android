import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Reminder, AppSettings, DEFAULT_SETTINGS } from '@/types/reminder';
import { v4 as uuidv4 } from 'uuid';
import { registerPlugin, Capacitor } from '@capacitor/core';

// Native Widget Bridge Plugin Interface
interface WidgetPluginType {
  updateWidget(options: { reminders: { id: string; title: string; time: string }[] }): Promise<void>;
  getClickedReminder(): Promise<{ reminderId: string | null }>;
}

const WidgetPlugin = registerPlugin<WidgetPluginType>('WidgetPlugin');
const isAndroid = Capacitor.getPlatform() === 'android';

interface RemindersContextType {
  reminders: Reminder[];
  settings: AppSettings;
  activeReminders: Reminder[];
  completedReminders: Reminder[];
  missedReminders: Reminder[];
  addReminder: (data: Omit<Reminder, 'id' | 'completed' | 'notified' | 'escalationCount'>) => Reminder;
  updateReminder: (id: string, data: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  completeReminder: (id: string) => void;
  snoozeReminder: (id: string, minutes: number) => void;
  clearSnooze: (id: string) => void;
  markNotified: (id: string) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  checkMissedReminders: () => void;
  clickedReminderId: string | null;
  setClickedReminderId: (id: string | null) => void;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

const STORAGE_KEY = 'adhivio_v2_reminders';
const SETTINGS_KEY = 'adhivio_v2_settings';
const LEGACY_STORAGE_KEY = 'reminders_data';

// --- Migration helper ---
function getInitialReminders(): Reminder[] {
  try {
    const v2Data = localStorage.getItem(STORAGE_KEY);
    if (v2Data) return JSON.parse(v2Data);

    // Try migration from legacy schema
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      const oldReminders = JSON.parse(legacyData);
      const migrated: Reminder[] = oldReminders.map((r: Partial<Reminder>) => ({
        ...r,
        repeat: r.repeat || 'once',
        priority: r.priority || 'medium',
        sound: r.sound || 'bell',
        completed: !!r.completed,
        category: 'other',
        warnBefore: 'none',
        skipHolidays: false,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      console.log('[Context] Successfully migrated legacy reminders to schema V2.');
      return migrated;
    }
  } catch (e) {
    console.error('[Context] Failed to load initial reminders:', e);
  }
  return [];
}

function getInitialSettings(): AppSettings {
  try {
    const v2Settings = localStorage.getItem(SETTINGS_KEY);
    if (v2Settings) return JSON.parse(v2Settings);
  } catch (e) {
    console.error('[Context] Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<Reminder[]>(getInitialReminders);
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);
  const [clickedReminderId, setClickedReminderId] = useState<string | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Apply dark mode class to HTML element
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Check for clicked reminder from widget launch
  useEffect(() => {
    async function checkWidgetLaunch() {
      if (isAndroid) {
        try {
          const res = await WidgetPlugin.getClickedReminder();
          if (res && res.reminderId) {
            setClickedReminderId(res.reminderId);
          }
        } catch (e) {
          console.warn('[Context] Failed to get clicked reminder from widget:', e);
        }
      }
    }
    checkWidgetLaunch();

    // Re-check on app resume
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkWidgetLaunch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // --- CRUD Operations ---
  const addReminder = useCallback((data: Omit<Reminder, 'id' | 'completed' | 'notified' | 'escalationCount'>) => {
    const newReminder: Reminder = {
      ...data,
      id: uuidv4(),
      completed: false,
      notified: false,
      escalationCount: 0,
    };
    setReminders((prev) => [newReminder, ...prev]);
    return newReminder;
  }, []);

  const updateReminder = useCallback((id: string, data: Partial<Reminder>) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data } : r))
    );
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const completeReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: true, snoozedUntil: undefined, escalationCount: 0 } : r))
    );
  }, []);

  const snoozeReminder = useCallback((id: string, minutes: number) => {
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              snoozedUntil,
              notified: false,
              escalationCount: 0, // Reset escalations on snooze
            }
          : r
      )
    );
  }, []);

  const clearSnooze = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, snoozedUntil: undefined, notified: false }
          : r
      )
    );
  }, []);

  const markNotified = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, notified: true } : r))
    );
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  // --- Filtered Lists ---
  // A reminder is "missed" if:
  // - it is NOT completed
  // - the scheduled dateTime is in the past
  // - it has no active/future snooze
  // - it's NOT a repeating reminder that has already moved to the next occurrence
  const nowTime = Date.now();

  const isMissed = useCallback((r: Reminder) => {
    if (r.completed) return false;
    const scheduleTime = new Date(r.dateTime).getTime();
    if (scheduleTime >= nowTime) return false;

    // Check if currently snoozed in the future
    if (r.snoozedUntil) {
      return new Date(r.snoozedUntil).getTime() < nowTime;
    }

    // If it's a one-time reminder and it has passed
    if (r.repeat === 'once') return true;

    // For repeating reminders, they are missed if they were scheduled in the past
    // and haven't been completed.
    return true;
  }, [nowTime]);

  const activeReminders = reminders
    .filter((r) => !r.completed && !isMissed(r))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const completedReminders = reminders
    .filter((r) => r.completed)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const missedReminders = reminders
    .filter((r) => isMissed(r))
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const checkMissedReminders = useCallback(() => {
    // Force a re-evaluation of state by updating a dummy toggle or just trigger React render
    setReminders((prev) => [...prev]);
  }, []);

  // Sync upcoming reminders to native Android widget
  useEffect(() => {
    if (!isAndroid) return;
    const upcoming = activeReminders.slice(0, 3).map((r) => {
      let timeLabel = '';
      try {
        const d = new Date(r.dateTime);
        timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        timeLabel = '';
      }
      return {
        id: r.id,
        title: r.title,
        time: timeLabel,
      };
    });

    try {
      WidgetPlugin.updateWidget({ reminders: upcoming });
      console.log('[Context] Synchronized widget reminders count:', upcoming.length);
    } catch (e) {
      console.warn('[Context] Failed to sync Widget data:', e);
    }
  }, [activeReminders]);

  return (
    <RemindersContext.Provider
      value={{
        reminders,
        settings,
        activeReminders,
        completedReminders,
        missedReminders,
        addReminder,
        updateReminder,
        deleteReminder,
        completeReminder,
        snoozeReminder,
        clearSnooze,
        markNotified,
        updateSettings,
        checkMissedReminders,
        clickedReminderId,
        setClickedReminderId,
      }}
    >
      {children}
    </RemindersContext.Provider>
  );
};

export const useRemindersContext = () => {
  const context = useContext(RemindersContext);
  if (!context) throw new Error('useRemindersContext must be used within a RemindersProvider');
  return context;
};
