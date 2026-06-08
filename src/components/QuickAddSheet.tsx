import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category, CATEGORY_DETAILS, Reminder } from '@/types/reminder';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Reminder, 'id' | 'completed' | 'notified'>) => void;
  defaultSound: Reminder['sound'];
}

export function QuickAddSheet({ open, onClose, onSave, defaultSound }: QuickAddSheetProps) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(() => {
    const d = new Date();
    // Default time is next hour
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [category, setCategory] = useState<Category>('personal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Title is required');
      return;
    }

    try {
      // Parse time to Date object (today or tomorrow if past)
      const [hours, minutes] = time.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);
      
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1); // Move to tomorrow
      }

      onSave({
        title: trimmedTitle,
        dateTime: targetDate.toISOString(),
        repeat: 'once',
        priority: 'medium', // Default priority
        sound: defaultSound,
        category,
        warnBefore: 'none',
        escalate: false,
        skipHolidays: false,
      });

      toast.success('Quick Reminder added ✓');
      onClose();
    } catch {
      toast.error('Failed to quick-add reminder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="fixed bottom-0 top-auto translate-y-0 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:max-w-md w-full flex flex-col p-0 gap-0 border-0 shadow-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-background">
        
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-5 bg-surface border-b border-border/40">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-light flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-primary-red" />
              </div>
              <DialogTitle className="text-text-primary text-base font-bold tracking-tight">
                Quick Add Reminder
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-background">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </Label>
            <Input
              id="quick-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Buy milk"
              maxLength={200}
              required
              autoFocus
              className="h-11 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
            />
          </div>

          {/* Time Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Time
            </Label>
            <Input
              id="quick-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="h-11 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors font-medium text-center text-base"
            />
          </div>

          {/* Categories Horizontal Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </Label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(Object.keys(CATEGORY_DETAILS) as Category[]).map((catKey) => {
                const details = CATEGORY_DETAILS[catKey];
                const active = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all duration-200
                      ${active
                        ? `${details.bg} ${details.border} ${details.color} scale-105`
                        : 'border-border/50 bg-background text-muted-foreground hover:bg-muted/30'
                      }`}
                  >
                    <span>{details.emoji}</span>
                    <span>{details.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex gap-3 pt-3 border-t border-border/40 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border-border/60 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl font-semibold bg-primary-red hover:opacity-90 text-white border-0 transition-opacity"
              disabled={!title.trim()}
            >
              Add Reminder
            </Button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
}
