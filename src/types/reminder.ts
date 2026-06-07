export type Priority = 'low' | 'medium' | 'high';
export type RepeatType = 'once' | 'daily' | 'weekly' | 'custom';
export type BuiltInSound = 'alarm' | 'beep' | 'soft-tone' | 'bell' | 'digital-alert';
export type Category = 'work' | 'personal' | 'health' | 'finance' | 'church' | 'other';

export interface RepeatRule {
  type: 'days' | 'weekdays' | 'monthly';
  interval?: number; // Picker for N days (1–30)
  days?: number[];   // Specific weekdays: 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dateTime: string; // ISO string of starting date-time
  repeat: RepeatType;
  repeatRule?: RepeatRule;
  endDate?: string; // Stop repeating after this date ISO string
  priority: Priority;
  sound: BuiltInSound | 'custom';
  customSoundData?: string;
  completed: boolean;
  snoozedUntil?: string; // ISO string
  notified?: boolean;
  category?: Category;
  escalate?: boolean; // Toggle: escalate if not dismissed
  escalateInterval?: number; // re-fire every X minutes (5, 10, 15)
  escalationCount?: number; // Tracks current escalation attempts
  warnBefore?: 'none' | '5' | '10' | '30'; // Pre-warning offset
  skipHolidays?: boolean; // Skip Kerala public holidays
}

export interface AppSettings {
  notificationsEnabled: boolean;
  defaultSound: BuiltInSound;
  defaultSnoozeMinutes: number;
  darkMode: boolean;
  volume: number;
  skipKeralaHolidays: boolean; // Settings option
}

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  defaultSound: 'bell',
  defaultSnoozeMinutes: 5,
  darkMode: false,
  volume: 0.7,
  skipKeralaHolidays: false,
};

export const BUILT_IN_SOUNDS: { value: BuiltInSound; label: string }[] = [
  { value: 'alarm', label: 'Alarm' },
  { value: 'beep', label: 'Beep' },
  { value: 'soft-tone', label: 'Soft Tone' },
  { value: 'bell', label: 'Bell' },
  { value: 'digital-alert', label: 'Digital Alert' },
];

export const CATEGORY_DETAILS: Record<Category, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  work:     { label: 'Work',     emoji: '💼', color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-950/20',       border: 'border-red-500' },
  personal: { label: 'Personal', emoji: '🙂', color: 'text-emerald-600 dark:text-emerald-400',   bg: 'bg-emerald-50 dark:bg-emerald-950/20',   border: 'border-emerald-500' },
  health:   { label: 'Health',   emoji: '❤️', color: 'text-rose-600 dark:text-rose-400',         bg: 'bg-rose-50 dark:bg-rose-950/20',         border: 'border-rose-500' },
  finance:  { label: 'Finance',  emoji: '💰', color: 'text-amber-600 dark:text-amber-400',       bg: 'bg-amber-50 dark:bg-amber-950/20',       border: 'border-amber-500' },
  church:   { label: 'Church',   emoji: '⛪', color: 'text-emerald-700 dark:text-emerald-400',   bg: 'bg-emerald-50 dark:bg-emerald-950/20',   border: 'border-emerald-500' },
  other:    { label: 'Other',    emoji: '🔖', color: 'text-slate-600 dark:text-slate-400',       bg: 'bg-slate-50 dark:bg-slate-950/20',       border: 'border-slate-500' },
};