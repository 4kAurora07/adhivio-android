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
  backgroundServiceActive: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  defaultSound: 'bell',
  defaultSnoozeMinutes: 5,
  darkMode: false,
  volume: 0.7,
  skipKeralaHolidays: false,
  backgroundServiceActive: false,
};

export const BUILT_IN_SOUNDS: { value: BuiltInSound; label: string }[] = [
  { value: 'alarm', label: 'Alarm' },
  { value: 'beep', label: 'Beep' },
  { value: 'soft-tone', label: 'Soft Tone' },
  { value: 'bell', label: 'Bell' },
  { value: 'digital-alert', label: 'Digital Alert' },
];

export const CATEGORY_DETAILS: Record<Category, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  work:     { label: 'Work',     emoji: '💼', color: 'text-primary-red', bg: 'bg-red-light dark:bg-[#3A1F1F]', border: 'border-primary-red/20' },
  personal: { label: 'Personal', emoji: '🙂', color: 'text-primary-green', bg: 'bg-green-light dark:bg-[#1B3528]', border: 'border-primary-green/20' },
  health:   { label: 'Health',   emoji: '❤️', color: 'text-primary-red', bg: 'bg-red-light dark:bg-[#3A1F1F]', border: 'border-primary-red/20' },
  finance:  { label: 'Finance',  emoji: '💰', color: 'text-[#D97706]', bg: 'bg-[#FEF3C7] dark:bg-[#3D2E14]', border: 'border-[#D97706]/20' },
  church:   { label: 'Church',   emoji: '⛪', color: 'text-primary-green', bg: 'bg-green-light dark:bg-[#1B3528]', border: 'border-primary-green/20' },
  other:    { label: 'Other',    emoji: '🔖', color: 'text-text-secondary dark:text-[#9CA3AF]', bg: 'bg-surface-alt dark:bg-[#22302A]', border: 'border-border/40' },
};