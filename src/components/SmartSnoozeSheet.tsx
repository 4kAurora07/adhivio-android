import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Moon, Sun, Sunrise } from 'lucide-react';

interface SmartSnoozeSheetProps {
  open: boolean;
  onClose: () => void;
  onSnoozeSelected: (minutes: number) => void;
  reminderTitle: string;
}

export function SmartSnoozeSheet({ open, onClose, onSnoozeSelected, reminderTitle }: SmartSnoozeSheetProps) {
  const now = new Date();
  const hours = now.getHours();


  let icon = <Moon className="w-5 h-5 text-red-400" />;
  let label = 'Night Snooze';
  let options = [
    { label: '15 Min', description: 'Quick break', value: 15 },
    { label: '30 Min', description: 'Rest a bit', value: 30 },
    { label: '1 Hour', description: 'Deep snooze', value: 60 },
  ];

  if (hours >= 6 && hours < 12) {

    icon = <Sunrise className="w-5 h-5 text-amber-500" />;
    label = 'Morning Snooze';
    options = [
      { label: '5 Min', description: 'Just a moment', value: 5 },
      { label: '10 Min', description: 'Short delay', value: 10 },
      { label: '15 Min', description: 'Prepare self', value: 15 },
    ];
  } else if (hours >= 12 && hours < 18) {

    icon = <Sun className="w-5 h-5 text-amber-400" />;
    label = 'Afternoon Snooze';
    options = [
      { label: '10 Min', description: 'Short rest', value: 10 },
      { label: '15 Min', description: 'Tea break', value: 15 },
      { label: '30 Min', description: 'Settle down', value: 30 },
    ];
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="fixed bottom-0 top-auto translate-y-0 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:max-w-md w-full flex flex-col p-0 gap-0 border-0 shadow-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-background transition-transform duration-300">
        
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-5 bg-gradient-to-br from-red-500 to-rose-600">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {icon}
              </div>
              <div>
                <DialogTitle className="text-white text-base font-bold tracking-tight">
                  {label}
                </DialogTitle>
                <p className="text-xs text-white/80 mt-0.5 truncate max-w-[280px]">
                  Snooze: &ldquo;{reminderTitle}&rdquo;
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Snooze options list */}
        <div className="p-6 space-y-3.5 bg-background">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Adaptive Options
          </p>

          <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className="flex items-center justify-between h-16 px-5 rounded-2xl border-border/70 bg-muted/20 hover:bg-muted/40 hover:border-red-500/50 hover:scale-[1.01] transition-all duration-200 text-left font-normal"
                onClick={() => {
                  onSnoozeSelected(opt.value);
                  onClose();
                }}
              >
                <div>
                  <span className="text-sm font-bold text-foreground block">
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {opt.description}
                  </span>
                </div>
                 <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500">
                  <Clock className="w-4 h-4" />
                </div>
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground font-semibold mt-2"
          >
            Cancel
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
