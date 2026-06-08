import { AppSettings, BUILT_IN_SOUNDS, BuiltInSound } from '@/types/reminder';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Volume2, Bell, Moon, BellRing, Timer, Code2,
  Smartphone, Calendar, ShieldCheck, Layers,
} from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function SettingsPanel({ open, onClose, settings, onUpdate }: SettingsPanelProps) {
  const { playBuiltIn } = useSounds();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] md:max-h-[90vh] flex flex-col p-0 gap-0 border-0 shadow-2xl overflow-hidden rounded-3xl sm:rounded-3xl">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-card border-b border-border/40">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <Layers className="w-4.5 h-4.5 text-[#E05C5C]" />
              </div>
              <DialogTitle className="text-foreground text-lg font-bold tracking-tight">
                Settings
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-background">

          {/* ═══ PREFERENCES ═══ */}
          <Section label="Preferences">

            {/* Notifications */}
            <SettingRow
              icon={<BellRing className="w-4 h-4 text-[#E05C5C]" />}
              title="Notifications"
              description="Show reminder alerts on your device"
              alternate={false}
              action={
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(v) => onUpdate({ notificationsEnabled: v })}
                />
              }
            />

            {/* Dark Mode */}
            <SettingRow
              icon={<Moon className="w-4 h-4 text-primary-green" />}
              title="Dark Mode"
              description="Switch to a darker appearance"
              alternate={true}
              action={
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={(v) => onUpdate({ darkMode: v })}
                />
              }
            />

            {/* Skip Kerala Holidays */}
            <SettingRow
              icon={<Calendar className="w-4 h-4 text-[#E05C5C]" />}
              title="Skip Kerala Public Holidays"
              description="Reschedule reminders on Kerala holidays to next working day"
              alternate={false}
              action={
                <Switch
                  checked={settings.skipKeralaHolidays}
                  onCheckedChange={(v) => onUpdate({ skipKeralaHolidays: v })}
                />
              }
            />

            {/* Persistent Background Service */}
            <SettingRow
              icon={<Layers className="w-4 h-4 text-primary-green" />}
              title="Persistent Background Service"
              description="Keeps a silent notification active to prevent Android from killing the app process"
              alternate={true}
              action={
                <Switch
                  checked={settings.backgroundServiceActive}
                  onCheckedChange={(v) => onUpdate({ backgroundServiceActive: v })}
                />
              }
            />
          </Section>

          <Separator className="opacity-50" />

          {/* ═══ SOUND & ALERTS ═══ */}
          <Section label="Sound & Alerts">

            {/* Default Ringtone */}
            <div className="p-4 rounded-xl border border-border/20 bg-surface space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <Label className="text-sm font-semibold">Default Ringtone</Label>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={settings.defaultSound}
                  onValueChange={(v) => onUpdate({ defaultSound: v as BuiltInSound })}
                >
                  <SelectTrigger className="flex-1 rounded-xl h-10 border-border/60 bg-muted/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {BUILT_IN_SOUNDS.map((sound) => (
                      <SelectItem key={sound.value} value={sound.value} className="rounded-lg">
                        {sound.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-10 w-10 border-border/60 bg-muted/40 flex-shrink-0"
                  onClick={() => playBuiltIn(settings.defaultSound, settings.volume)}
                >
                  <Volume2 className="w-4 h-4 text-primary-red" />
                </Button>
              </div>
            </div>

            {/* Volume */}
            <div className="p-4 rounded-xl border border-border/20 bg-surface-alt space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary-green flex-shrink-0" />
                  <Label className="text-sm font-semibold">Volume</Label>
                </div>
                <span className="text-xs font-bold text-primary-red bg-red-light dark:bg-[#3A1F1F] px-2 py-0.5 rounded-full">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.volume]}
                onValueChange={([v]) => onUpdate({ volume: v })}
                min={0} max={1} step={0.05}
                className="w-full"
              />
            </div>

            {/* Default Snooze */}
            <div className="p-4 rounded-xl border border-border/20 bg-surface space-y-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#E05C5C] flex-shrink-0" />
                <Label className="text-sm font-semibold">Default Snooze</Label>
              </div>
              <Select
                value={String(settings.defaultSnoozeMinutes)}
                onValueChange={(v) => onUpdate({ defaultSnoozeMinutes: Number(v) })}
              >
                <SelectTrigger className="rounded-xl h-10 border-border/60 bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="5" className="rounded-lg">5 minutes</SelectItem>
                  <SelectItem value="10" className="rounded-lg">10 minutes</SelectItem>
                  <SelectItem value="15" className="rounded-lg">15 minutes</SelectItem>
                  <SelectItem value="30" className="rounded-lg">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* ═══ ABOUT ═══ */}
          <Section label="About Adhivio">

            {/* App identity card */}
            <div className="rounded-2xl overflow-hidden border border-border/60">

              {/* Top flat band */}
              <div className="h-16 bg-surface-alt dark:bg-[#22302A] relative border-b border-border/40">
                <div className="absolute -bottom-5 left-5 w-10 h-10 rounded-xl bg-white dark:bg-[#1A2420] shadow-sm flex items-center justify-center border-2 border-border">
                  <BellRing className="w-5 h-5 text-[#E05C5C]" />
                </div>
              </div>

              <div className="px-5 pt-8 pb-5 bg-muted/20 space-y-4">
                <div>
                  <h3 className="font-bold text-base text-foreground">Adhivio</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    A smart, offline-first reminder app designed for clarity and reliability.
                    Never miss what matters.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <AboutChip icon={<Code2 className="w-3.5 h-3.5" />}  label="Version"  value="2.0.0" />
                  <AboutChip icon={<Calendar className="w-3.5 h-3.5" />} label="Released" value="June 2026" />
                  <AboutChip icon={<Smartphone className="w-3.5 h-3.5" />} label="Platform" value="Android" />
                  <AboutChip icon={<ShieldCheck className="w-3.5 h-3.5" />} label="License" value="Private" />
                </div>

                <Separator className="opacity-40" />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Crafted by</span>
                  <span className="font-bold text-primary-red">ADAL Studio</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Built by</span>
                  <span className="font-bold text-primary-red">Alwin</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Data storage</span>
                  <span className="font-semibold text-foreground">100% On-device</span>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-muted-foreground/70">
              © 2026 ADAL Studio · All rights reserved
            </p>
          </Section>

        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-4 bg-background border-t border-border/40 flex items-center justify-between">
          <Button
            className="w-full h-11 rounded-xl font-semibold bg-[#E05C5C] hover:bg-[#E05C5C]/90 text-white shadow-sm border-0"
            onClick={onClose}
          >
            Save & Close
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

/* ── Section wrapper ── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p 
        style={{ fontVariant: 'all-small-caps' }} 
        className="text-xs font-bold uppercase tracking-widest text-[#6B7280]"
      >
        {label}
      </p>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

/* ── Toggle row ── */
function SettingRow({
  icon, title, description, action, alternate,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  alternate?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border/20 ${
      alternate ? 'bg-surface-alt' : 'bg-surface'
    }`}>
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <Label className="text-sm font-semibold leading-tight">{title}</Label>
          <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

/* ── About chip ── */
function AboutChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border/60">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className="text-xs font-bold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}