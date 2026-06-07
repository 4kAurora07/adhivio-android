import { Reminder } from '@/types/reminder';
import { ReminderCard } from './ReminderCard';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCircle2, Sparkles } from 'lucide-react';

interface ReminderListProps {
  activeReminders: Reminder[];
  completedReminders: Reminder[];
  onComplete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  defaultSnoozeMinutes: number;
  onSwipeLeft: (id: string) => void;
}

export function ReminderList({
  activeReminders,
  completedReminders,
  onComplete,
  onSnooze,
  onDelete,
  onEdit,
  defaultSnoozeMinutes,
  onSwipeLeft,
}: ReminderListProps) {
  const hasAny = activeReminders.length > 0 || completedReminders.length > 0;

  if (!hasAny) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center py-28 px-8 text-center"
      >
        {/* Decorative icon cluster */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-100 to-emerald-100 dark:from-red-950/40 dark:to-emerald-950/40 flex items-center justify-center shadow-inner">
            <BellRing className="w-9 h-9 text-red-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">All clear!</h2>
        <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
          No reminders yet. Tap&nbsp;<span className="font-semibold text-red-500">+ Add</span>&nbsp;to create your first one.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Active / Upcoming ── */}
      {activeReminders.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1.5 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Upcoming
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-500 text-[10px] font-extrabold">
              {activeReminders.length}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {activeReminders.map((r, i) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                index={i}
                onComplete={onComplete}
                onSnooze={onSnooze}
                onDelete={onDelete}
                onEdit={onEdit}
                defaultSnoozeMinutes={defaultSnoozeMinutes}
                onSwipeLeft={onSwipeLeft}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Completed ── */}
      {completedReminders.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1.5 mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Completed
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 text-[10px] font-extrabold">
              {completedReminders.length}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {completedReminders.map((r, i) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                index={i}
                onComplete={onComplete}
                onSnooze={onSnooze}
                onDelete={onDelete}
                onEdit={onEdit}
                defaultSnoozeMinutes={defaultSnoozeMinutes}
                onSwipeLeft={() => {}}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
