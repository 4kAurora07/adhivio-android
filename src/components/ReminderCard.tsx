import React, { forwardRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Clock, Trash2, MoreHorizontal, Pencil, Bell, RefreshCcw } from 'lucide-react';
import { Reminder, CATEGORY_DETAILS } from '@/types/reminder';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import { isKeralaHoliday } from '@/lib/holidays';

interface ReminderCardProps {
  reminder: Reminder;
  index: number;
  onComplete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  defaultSnoozeMinutes: number;
  onSwipeLeft: (id: string) => void;
}

function formatReminderDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    if (isToday(date))    return `Today · ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow · ${format(date, 'h:mm a')}`;
    return format(date, 'EEE, MMM d · h:mm a');
  } catch {
    return 'Invalid date';
  }
}

const PRIORITY_STYLES = {
  high:   { bar: 'bg-red-500',    badge: 'bg-red-50  text-red-600  dark:bg-red-950/40  dark:text-red-400',  label: 'High'   },
  medium: { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', label: 'Med' },
  low:    { bar: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', label: 'Low' },
} as const;


function isReminderOverdue(reminder: Reminder): boolean {
  if (reminder.completed) return false;
  if (reminder.repeat !== 'once') return false;
  if (reminder.snoozedUntil && !isPast(new Date(reminder.snoozedUntil))) return false;
  return isPast(new Date(reminder.dateTime));
}

const ReminderCard = forwardRef<HTMLDivElement, ReminderCardProps>(
  ({ reminder, index, onComplete, onSnooze, onDelete, onEdit, defaultSnoozeMinutes, onSwipeLeft }, ref) => {
    const overdue   = isReminderOverdue(reminder);
    const isSnoozed = !!reminder.snoozedUntil && !isPast(new Date(reminder.snoozedUntil));
    const pStyle    = PRIORITY_STYLES[reminder.priority];
    const cat       = CATEGORY_DETAILS[reminder.category || 'other'];
    const showHolidayBadge = isKeralaHoliday(new Date(reminder.dateTime));

    const dragX = useMotionValue(0);
    const completeOpacity = useTransform(dragX, [0, 80], [0, 1]);
    const snoozeOpacity = useTransform(dragX, [-80, 0], [1, 0]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 80;
      if (info.offset.x > threshold) {
        onComplete(reminder.id);
      } else if (info.offset.x < -threshold) {
        onSwipeLeft(reminder.id);
      }
    };

    const snoozeOptions = Array.from(
      new Set([defaultSnoozeMinutes, defaultSnoozeMinutes * 2, 30, 60])
    ).filter(Boolean).sort((a, b) => a - b);

    const handleSnooze = (mins: number) => {
      onSnooze(reminder.id, mins);
      const until = new Date(Date.now() + mins * 60 * 1000);
      toast.success(`⏰ Snoozed until ${format(until, 'h:mm a')}`, { duration: 2500 });
    };

    return (
      <div className="relative overflow-hidden rounded-2xl">
        {/* Swipe action backgrounds */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          {/* Complete background */}
          <motion.div
            style={{ opacity: completeOpacity }}
            className="absolute inset-0 bg-emerald-500 flex items-center justify-start pl-6"
          >
            <div className="flex items-center gap-2 text-white">
              <Check className="w-5 h-5" />
              <span className="font-semibold text-sm">Complete</span>
            </div>
          </motion.div>

          {/* Snooze background */}
          <motion.div
            style={{ opacity: snoozeOpacity }}
            className="absolute inset-0 bg-orange-500 flex items-center justify-end pr-6"
          >
            <div className="flex items-center gap-2 text-white">
              <span className="font-semibold text-sm">Snooze</span>
              <Clock className="w-5 h-5" />
            </div>
          </motion.div>
        </div>

        {/* Draggable Card layer */}
        <motion.div
          ref={ref}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: -80, scale: 0.95 }}
          transition={{ delay: index * 0.035, duration: 0.28, ease: 'easeOut' }}
          layout
          whileHover={{ y: -1, scale: 1.005 }}
          className={`group relative rounded-2xl border border-border/40 bg-card/75 backdrop-blur-md overflow-hidden select-none touch-pan-y
            shadow-sm hover:shadow-md hover:border-border/80 dark:hover:shadow-black/20
            transition-all duration-200 cursor-grab active:cursor-grabbing
            ${reminder.completed ? 'opacity-55' : ''}
          `}
        >
          {/* ── Category left border accent ── */}
          <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${cat.border} border-l-4`} />

          {/* ── Overdue pulsing glow (high priority only) ── */}
          {overdue && reminder.priority === 'high' && (
            <div className="absolute inset-0 rounded-2xl ring-1 ring-red-400/40 animate-pulse pointer-events-none" />
          )}

          <div className="pl-5 pr-3 py-4 flex items-start gap-3.5">
            {/* ── Checkbox ── */}
            <button
              onClick={() => onComplete(reminder.id)}
              aria-label={reminder.completed ? 'Mark incomplete' : 'Mark complete'}
              className={`mt-1.5 flex-shrink-0 w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center
                transition-all duration-200 shadow-sm
                ${reminder.completed
                  ? 'bg-gradient-to-br from-red-500 to-emerald-800 border-transparent text-white'
                  : 'border-muted-foreground/30 hover:border-red-500 hover:scale-110 hover:shadow-red-500/10'
                }`}
            >
              {reminder.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>

            {/* ── Category Icon Container ── */}
            <div className={`mt-0.5 w-9 h-9 rounded-xl ${cat.bg} border border-border/20 flex items-center justify-center text-base flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105`}>
              <span>{cat.emoji}</span>
            </div>

            {/* ── Main content ── */}
            <div
              className="flex-1 min-w-0 cursor-pointer space-y-1.5"
              onClick={() => !reminder.completed && onEdit(reminder)}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={`text-sm font-bold text-foreground leading-snug truncate flex-1
                    ${reminder.completed ? 'line-through text-muted-foreground/60' : ''}
                  `}
                >
                  {reminder.title}
                </h3>

                {/* Priority badge (compact) */}
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase border border-current/10 flex-shrink-0 ${pStyle.badge}`}>
                  {pStyle.label}
                </span>
              </div>

              {reminder.description && (
                <p className="text-xs text-muted-foreground/85 line-clamp-1 leading-relaxed pr-2">
                  {reminder.description}
                </p>
              )}

              {/* ── Meta row ── */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {/* Snoozed */}
                {isSnoozed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold
                    text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400
                    px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/40">
                    <Clock className="w-3 h-3" />
                    Snoozed · {formatReminderDate(reminder.snoozedUntil!)}
                  </span>
                )}

                {/* Date */}
                {!isSnoozed && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    overdue
                      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200/50 dark:border-red-900/30'
                      : 'text-muted-foreground bg-muted/30 border-border/40'
                  }`}>
                    {overdue ? (
                      <><Bell className="w-3 h-3 animate-bounce" /> Overdue · {formatReminderDate(reminder.dateTime)}</>
                    ) : (
                      formatReminderDate(reminder.dateTime)
                    )}
                  </span>
                )}

                {/* Repeat badge */}
                {reminder.repeat !== 'once' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold
                    text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40
                    px-2.5 py-0.5 rounded-full border border-red-200/50 dark:border-red-900/40">
                    <RefreshCcw className="w-2.5 h-2.5" />
                    {reminder.repeat === 'custom' && reminder.repeatRule
                      ? `${reminder.repeatRule.type === 'days' ? `Every ${reminder.repeatRule.interval} days` : reminder.repeatRule.type === 'weekdays' ? 'Weekdays' : 'Monthly'}`
                      : reminder.repeat === 'daily' ? 'Daily' : 'Weekly'}
                  </span>
                )}

                {/* Holiday Badge */}
                {showHolidayBadge && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold
                    text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30
                    px-2.5 py-0.5 rounded-full border border-emerald-200/40 dark:border-emerald-800/40 animate-pulse">
                    🎉 Kerala Holiday
                  </span>
                )}
              </div>
            </div>

            {/* ── Actions menu ── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                {!reminder.completed && (
                  <>
                    <div className="px-2 pt-1.5 pb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        Snooze
                      </p>
                    </div>
                    {snoozeOptions.map((mins) => (
                      <DropdownMenuItem
                        key={mins}
                        onClick={() => handleSnooze(mins)}
                        className="rounded-lg"
                      >
                        <Clock className="w-3.5 h-3.5 mr-2 text-amber-500" />
                        {mins >= 60 ? `${mins / 60} hour${mins / 60 > 1 ? 's' : ''}` : `${mins} minutes`}
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => onComplete(reminder.id)} className="rounded-lg">
                      <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Mark complete
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onEdit(reminder)} className="rounded-lg">
                      <Pencil className="w-3.5 h-3.5 mr-2 text-red-500" /> Edit
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                  </>
                )}

                {reminder.completed && (
                  <DropdownMenuItem onClick={() => onEdit(reminder)} className="rounded-lg">
                    <Pencil className="w-3.5 h-3.5 mr-2 text-red-500" /> Edit
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => onDelete(reminder.id)}
                  className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      </div>
    );
  }
);

ReminderCard.displayName = 'ReminderCard';
export { ReminderCard };