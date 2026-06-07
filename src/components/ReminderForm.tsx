import { useState, useRef, useMemo, useCallback } from 'react';
import { Reminder, Priority, RepeatType, BuiltInSound, BUILT_IN_SOUNDS, Category } from '@/types/reminder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useSounds } from '@/hooks/useSounds';
import { Volume2, Upload, X, CalendarIcon, Clock, Repeat2, Bell, ChevronRight, Play } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReminderFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Reminder, 'id' | 'completed' | 'notified'>) => void;
  editingReminder?: Reminder | null;
  defaultSound: BuiltInSound;
  volume: number;
  existingReminders?: Reminder[];
}

function getDefaultDateTime(): Date {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
}

// Hours 1–12
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { value: String(h).padStart(2, '0'), label: String(h) };
});

// Minutes 00–59
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => ({
  value: String(m).padStart(2, '0'),
  label: String(m).padStart(2, '0'),
}));

// Convert 24h to 12h parts
function to12h(hour24: number): { hour12: string; ampm: 'AM' | 'PM' } {
  const ampm: 'AM' | 'PM' = hour24 < 12 ? 'AM' : 'PM';
  const h = hour24 % 12 || 12;
  return { hour12: String(h).padStart(2, '0'), ampm };
}

// Convert 12h + ampm to 24h
function to24h(hour12: string, ampm: 'AM' | 'PM'): number {
  const h = parseInt(hour12);
  if (ampm === 'AM') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}


export function ReminderForm({
  open,
  onClose,
  onSave,
  editingReminder,
  defaultSound,
  volume,
  existingReminders = [],
}: ReminderFormProps) {
  const { playBuiltIn, playCustom } = useSounds();
  const fileRef = useRef<HTMLInputElement>(null);

  const defaultDT = editingReminder?.dateTime
    ? new Date(editingReminder.dateTime)
    : getDefaultDateTime();

  const { hour12: defH12, ampm: defAmpm } = to12h(defaultDT.getHours());

  const [title, setTitle]               = useState(editingReminder?.title ?? '');
  const [description, setDescription]   = useState(editingReminder?.description ?? '');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDT);
  const [hour12, setHour12]             = useState(defH12);
  const [minute, setMinute]             = useState(String(defaultDT.getMinutes()).padStart(2, '0'));
  const [ampm, setAmpm]                 = useState<'AM' | 'PM'>(defAmpm);
  const [repeat, setRepeat]             = useState<RepeatType>(editingReminder?.repeat ?? 'once');
  const [priority, setPriority]         = useState<Priority>(editingReminder?.priority ?? 'medium');
  const [sound, setSound]               = useState<BuiltInSound | 'custom'>(editingReminder?.sound ?? defaultSound);
  const [customSoundData, setCustomSoundData] = useState<string | undefined>(editingReminder?.customSoundData);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Rebuild added states
  const [category, setCategory] = useState<Category>(editingReminder?.category ?? 'personal');
  const [warnBefore, setWarnBefore] = useState<Reminder['warnBefore']>(editingReminder?.warnBefore ?? 'none');
  const [escalate, setEscalate] = useState(editingReminder?.escalate ?? false);
  const [escalateInterval, setEscalateInterval] = useState(editingReminder?.escalateInterval ?? 5);
  const [skipHolidays, setSkipHolidays] = useState(editingReminder?.skipHolidays ?? false);

  const [repeatType, setRepeatType] = useState<'days' | 'weekdays' | 'monthly'>(
    editingReminder?.repeatRule?.type ?? 'days'
  );
  const [repeatInterval, setRepeatInterval] = useState(
    editingReminder?.repeatRule?.interval ?? 1
  );
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>(
    editingReminder?.repeatRule?.days ?? []
  );
  const [endDate, setEndDate] = useState<string>(
    editingReminder?.endDate ? format(new Date(editingReminder.endDate), 'yyyy-MM-dd') : ''
  );

  // For repeating reminders, date is irrelevant — we only care about time
  const isRepeating = repeat === 'daily' || repeat === 'weekly' || repeat === 'custom';

  const computedDateTime = useMemo(() => {
    const hour24 = to24h(hour12, ampm);
    if (isRepeating) {
      // Use today's date but allow any time — next occurrence computed in useNotifications
      const d = new Date();
      d.setHours(hour24, parseInt(minute), 0, 0);
      // If this time already passed today, advance by one interval so it's meaningful
      // (useNotifications will handle the real next-occurrence logic)
      return d;
    }
    if (!selectedDate) return null;
    try {
      const d = new Date(selectedDate);
      d.setHours(hour24, parseInt(minute), 0, 0);
      return d;
    } catch {
      return null;
    }
  }, [selectedDate, hour12, minute, ampm, isRepeating]);

  const isDateTimeValid = useMemo(() => {
    if (!computedDateTime) return false;
    // Repeating reminders are always valid — useNotifications advances to next occurrence
    if (isRepeating) return true;
    return computedDateTime.getTime() > Date.now();
  }, [computedDateTime, isRepeating]);

  const customSoundMissing = sound === 'custom' && !customSoundData;

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setCalendarOpen(false);
  }, []);

  const isDuplicate = useMemo(() => {
    if (!title.trim() || !computedDateTime) return false;
    return existingReminders.some((r) => {
      if (editingReminder && r.id === editingReminder.id) return false;
      return (
        r.title.toLowerCase() === title.trim().toLowerCase() &&
        Math.abs(new Date(r.dateTime).getTime() - computedDateTime.getTime()) < 60000
      );
    });
  }, [title, computedDateTime, existingReminders, editingReminder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error('Please enter a title'); return; }
    if (trimmedTitle.length > 200) { toast.error('Title must be less than 200 characters'); return; }
    if (!computedDateTime) { toast.error('Please select a valid date and time'); return; }
    if (!isRepeating && computedDateTime.getTime() <= Date.now()) {
      toast.error('Please select a future date and time'); return;
    }
    if (isDuplicate) { toast.error('A reminder with this title and time already exists'); return; }

    try {
      onSave({
        title: trimmedTitle,
        description: description.trim().slice(0, 1000) || undefined,
        dateTime: computedDateTime.toISOString(),
        repeat,
        repeatRule: repeat === 'custom' ? {
          type: repeatType,
          interval: repeatType === 'days' ? repeatInterval : undefined,
          days: repeatType === 'weekdays' ? repeatWeekdays : undefined
        } : undefined,
        endDate: (repeat !== 'once' && endDate) ? new Date(endDate).toISOString() : undefined,
        priority,
        sound,
        customSoundData,
        category,
        warnBefore,
        escalate,
        escalateInterval: escalate ? escalateInterval : undefined,
        skipHolidays,
      });
      toast.success(editingReminder ? 'Reminder updated ✓' : 'Reminder created ✓');
      onClose();
    } catch {
      toast.error('Failed to save reminder');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Sound file must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { setCustomSoundData(reader.result as string); setSound('custom'); };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsDataURL(file);
  };

  const timePreview = useMemo(() => {
    if (!computedDateTime) return null;
    const timeStr = format(computedDateTime, 'h:mm a');
    if (isRepeating) {
      if (repeat === 'daily') return `🔁 Every day at ${timeStr}`;
      if (repeat === 'weekly') return `🔁 Every ${format(computedDateTime, 'EEEE')} at ${timeStr}`;
    }
    if (!isDateTimeValid) return null;
    return `📅 ${format(computedDateTime, "EEE, MMM d 'at' h:mm a")}`;
  }, [computedDateTime, isRepeating, repeat, isDateTimeValid]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] md:max-h-[90vh] flex flex-col p-0 gap-0 border-0 shadow-2xl overflow-hidden rounded-2xl sm:rounded-2xl">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gradient-to-br from-red-500 to-rose-600">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-white" />
              </div>
              <DialogTitle className="text-white text-lg font-bold tracking-tight">
                {editingReminder ? 'Edit Reminder' : 'New Reminder'}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-background">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Title ── */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Team standup call"
              maxLength={200}
              required
              className="h-11 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
            />
            {isDuplicate && (
              <p className="text-xs text-destructive">⚠ A similar reminder already exists</p>
            )}
          </div>

          {/* ── Description ── */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Note
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={2}
              maxLength={1000}
              className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors resize-none"
            />
          </div>

          {/* ── Category ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="h-11 rounded-xl border-border/60 bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="work">Work 💼</SelectItem>
                <SelectItem value="personal">Personal 🙂</SelectItem>
                <SelectItem value="health">Health ❤️</SelectItem>
                <SelectItem value="finance">Finance 💰</SelectItem>
                <SelectItem value="church">Church ⛪</SelectItem>
                <SelectItem value="other">Other 🔖</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Repeat & Priority row ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Repeat2 className="w-3 h-3" /> Repeat
              </Label>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatType)}>
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom Rule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className={cn(
                  'h-11 rounded-xl border-border/60 bg-muted/30',
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Custom Repeat Rule Builder ── */}
          {repeat === 'custom' && (
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rule Type</Label>
                <Select value={repeatType} onValueChange={(v) => setRepeatType(v as 'days' | 'weekdays' | 'monthly')}>
                  <SelectTrigger className="h-10 rounded-xl bg-background border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="days">Every N Days</SelectItem>
                    <SelectItem value="weekdays">Specific Weekdays</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {repeatType === 'days' && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Repeat Interval (Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Math.max(1, Math.min(30, Number(e.target.value))))}
                    className="h-10 rounded-xl bg-background border-border/60"
                  />
                </div>
              )}

              {repeatType === 'weekdays' && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Select Days</Label>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, i) => {
                      const active = repeatWeekdays.includes(i);
                      const toggle = () => {
                        setRepeatWeekdays(prev =>
                          prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                        );
                      };
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={toggle}
                          className={`w-8 h-8 rounded-full border text-xs font-bold flex items-center justify-center transition-colors
                            ${active
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-background text-muted-foreground border-border/70 hover:bg-muted/50'
                            }`}
                        >
                          {dayChar}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {repeatType === 'monthly' && (
                <p className="text-xs text-muted-foreground mt-1 bg-background px-3 py-2 rounded-lg border border-border/40">
                  📅 Repeats on day {computedDateTime?.getDate() || '??'} of every month.
                </p>
              )}
            </div>
          )}

          {/* ── Stop Repeating End Date ── */}
          {repeat !== 'once' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Stop Repeating After
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-muted/30 font-medium"
              />
            </div>
          )}

          {/* ── Date (hidden for repeating) ── */}
          {!isRepeating && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> Date <span className="text-destructive">*</span>
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-between text-left font-normal h-11 rounded-xl border-border/60 bg-muted/30 hover:bg-muted/50',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {selectedDate ? format(selectedDate, 'EEE, MMMM d, yyyy') : 'Pick a date'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/50" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* ── Time ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time <span className="text-destructive">*</span>
            </Label>

            {/* 3 dropdowns: Hour : Minute  AM/PM */}
            <div className="flex items-center gap-2">

              {/* Hour */}
              <Select value={hour12} onValueChange={setHour12}>
                <SelectTrigger className="flex-1 h-11 rounded-xl border-border/60 bg-muted/30 font-medium text-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[220px] rounded-xl">
                  {HOUR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-lg font-bold text-muted-foreground">:</span>

              {/* Minute */}
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="flex-1 h-11 rounded-xl border-border/60 bg-muted/30 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[220px] rounded-xl">
                  {MINUTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* AM / PM */}
              <Select value={ampm} onValueChange={(v) => setAmpm(v as 'AM' | 'PM')}>
                <SelectTrigger className="w-20 h-11 rounded-xl border-border/60 bg-muted/30 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {timePreview && (
              <p className={cn(
                'text-xs font-medium px-1',
                !isDateTimeValid && !isRepeating ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {!isDateTimeValid && !isRepeating ? '⚠ Selected time is in the past' : timePreview}
              </p>
            )}
          </div>

          {/* ── Alert Options ── */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Alert Options
            </div>

            {/* Pre-warning Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Warn me before</Label>
              <Select value={warnBefore} onValueChange={(v) => setWarnBefore(v as Reminder['warnBefore'])}>
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/60">
                  <SelectValue placeholder="None (at event time)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">None (at event time)</SelectItem>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="10">10 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kerala Holidays Toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-muted-foreground">Skip Kerala Holidays</Label>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Automatically skip Sundays & Kerala public holidays 2026.
                </p>
              </div>
              <Switch
                checked={skipHolidays}
                onCheckedChange={setSkipHolidays}
              />
            </div>

            {/* Escalating Alert Toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-muted-foreground">Escalate if not dismissed</Label>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Re-fire sound & notification if not dismissed.
                </p>
              </div>
              <Switch
                checked={escalate}
                onCheckedChange={setEscalate}
              />
            </div>

            {/* Escalating Interval Select */}
            {escalate && (
              <div className="space-y-1.5 pl-3 border-l-2 border-red-500/30">
                <Label className="text-xs font-semibold text-muted-foreground">Escalate every</Label>
                <Select value={String(escalateInterval)} onValueChange={(v) => setEscalateInterval(Number(v))}>
                  <SelectTrigger className="h-10 rounded-xl bg-background border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ── Sound ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Bell className="w-3 h-3" /> Sound
            </Label>
            <div className="flex items-center gap-2">
              <Select value={sound} onValueChange={(v) => setSound(v as BuiltInSound | 'custom')}>
                <SelectTrigger className="flex-1 h-11 rounded-xl border-border/60 bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {BUILT_IN_SOUNDS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Sound</SelectItem>
                </SelectContent>
              </Select>
              {sound !== 'custom' && (
                <Button type="button" variant="outline" size="icon"
                  className="h-11 w-11 rounded-xl border-border/60 bg-muted/30 hover:bg-muted/50"
                  onClick={() => playBuiltIn(sound, volume)}>
                  <Volume2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {sound === 'custom' && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="gap-1.5 rounded-lg h-8">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Sound
                </Button>
                {customSoundData ? (
                  <>
                    <span className="text-xs text-emerald-600 font-medium">✓ Sound loaded</span>
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => playCustom(customSoundData, volume)}
                      className="gap-1.5 rounded-lg h-8 ml-1">
                      <Play className="w-3 h-3" />
                      Preview
                    </Button>
                    <Button type="button" variant="ghost" size="icon"
                      onClick={() => setCustomSoundData(undefined)} className="h-7 w-7 ml-auto">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">No file selected</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="audio/mp3,audio/wav,audio/*"
                className="hidden" onChange={handleFileUpload} />
            </div>
          )}

          {customSoundMissing && (
            <p className="text-xs text-destructive">⚠ Please upload a custom sound file before saving.</p>
          )}

          </div>

          {/* ── Sticky Footer ── */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border/40 bg-background flex gap-3">
            <Button type="button" variant="outline"
              className="flex-1 h-11 rounded-xl border-border/60 font-medium"
              onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit"
              className="flex-1 h-11 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-md shadow-red-500/20 border-0"
              disabled={!isDateTimeValid || isDuplicate || !title.trim() || customSoundMissing}>
              {editingReminder ? 'Update' : 'Create Reminder'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}