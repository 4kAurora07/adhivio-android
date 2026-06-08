import { Reminder } from '@/types/reminder';
import { ReminderCard } from './ReminderCard';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

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
        className="flex flex-col items-center justify-center py-20 px-8 text-center"
      >
        <div className="mb-6">
          <BrandLogo layout="stacked" size={64} />
        </div>

        <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed mt-4">
          Tap&nbsp;<span className="font-semibold text-primary-red">+ Add</span>&nbsp;to create your first reminder.
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
              <div className="w-1.5 h-1.5 rounded-full bg-primary-red animate-pulse" />
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Upcoming
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary-red/10 dark:bg-primary-red/20 text-primary-red text-[10px] font-extrabold">
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
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-green" />
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Completed
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary-green/10 dark:bg-primary-green/20 text-primary-green text-[10px] font-extrabold">
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
