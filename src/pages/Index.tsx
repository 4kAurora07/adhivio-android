import { useState, useCallback, useEffect, useMemo } from 'react';
import { AppBar } from '@/components/AppBar';
import { ReminderList } from '@/components/ReminderList';
import { ReminderForm } from '@/components/ReminderForm';
import { SettingsPanel } from '@/components/SettingsPanel';
import { InstallPrompt } from '@/components/InstallPrompt';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { useRemindersContext } from '@/contexts/RemindersContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Reminder, CATEGORY_DETAILS, Category } from '@/types/reminder';
import { SmartSnoozeSheet } from '@/components/SmartSnoozeSheet';
import { QuickAddSheet } from '@/components/QuickAddSheet';
import { Search, X, Zap, AlertCircle, BellRing, Check, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Index = () => {
  const {
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
    clickedReminderId,
    setClickedReminderId,
  } = useRemindersContext();

  // Foreground Alert Popup
  const [foregroundAlertReminder, setForegroundAlertReminder] = useState<Reminder | null>(null);

  useNotifications({
    reminders: [...activeReminders, ...completedReminders, ...missedReminders],
    markNotified,
    clearSnooze,
    volume: settings.volume,
    skipKeralaHolidays: settings.skipKeralaHolidays,
    onForegroundAlert: (reminder) => {
      setForegroundAlertReminder(reminder);
    },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  
  // Navigation tabs ('home' | 'completed' | 'settings')
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  
  // Home tab sub-views ('active' | 'missed' | 'completed')
  const [viewTab, setViewTab] = useState<'active' | 'missed' | 'completed'>('active');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all');

  // Quick Add Sheet
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Smart Snooze Sheet
  const [smartSnoozeOpen, setSmartSnoozeOpen] = useState(false);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);

  // Permission Banner Status
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'>('granted');

  const checkPermission = useCallback(async () => {
    try {
      const status = await LocalNotifications.checkPermissions();
      setPermissionStatus(status.display);
    } catch (e) {
      console.warn('[Index] Failed to check permissions:', e);
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestPermission = async () => {
    try {
      const res = await LocalNotifications.requestPermissions();
      setPermissionStatus(res.display);
      if (res.display === 'granted') {
        toast.success('Notifications enabled successfully!');
      } else {
        toast.error('Permission denied. Please enable notifications in App Settings.');
      }
    } catch {
      toast.error('Failed to request notification permissions');
    }
  };

  // Android hardware back button handler
  useEffect(() => {
    const handleBackButton = App.addListener('backButton', () => {
      if (foregroundAlertReminder) {
        setForegroundAlertReminder(null);
        return;
      }
      if (formOpen) {
        setFormOpen(false);
        return;
      }
      if (quickAddOpen) {
        setQuickAddOpen(false);
        return;
      }
      if (smartSnoozeOpen) {
        setSmartSnoozeOpen(false);
        setSnoozeTargetId(null);
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (categoryFilter !== 'all') {
        setCategoryFilter('all');
        return;
      }
      if (searchQuery) {
        setSearchQuery('');
        return;
      }
      if (viewTab !== 'active') {
        setViewTab('active');
        return;
      }
      
      // If nothing is open and filters are clear, exit app
      App.exitApp();
    });

    return () => {
      handleBackButton.then((h) => h.remove());
    };
  }, [formOpen, quickAddOpen, smartSnoozeOpen, settingsOpen, categoryFilter, searchQuery, viewTab, foregroundAlertReminder]);

  // Widget click launcher
  useEffect(() => {
    if (clickedReminderId) {
      const allReminders = [...activeReminders, ...completedReminders, ...missedReminders];
      const match = allReminders.find((r) => r.id === clickedReminderId);
      if (match) {
        setEditingReminder(match);
        setFormOpen(true);
        // Clear click target ID so it doesn't prompt again
        setClickedReminderId(null);
      }
    }
  }, [clickedReminderId, activeReminders, completedReminders, missedReminders, setClickedReminderId]);

  const handleAdd = useCallback(() => {
    setEditingReminder(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormOpen(true);
  }, []);

  const handleSave = useCallback(
    (data: Omit<Reminder, 'id' | 'completed' | 'notified' | 'escalationCount'>) => {
      if (editingReminder) {
        updateReminder(editingReminder.id, { ...data, notified: false, escalationCount: 0 });
      } else {
        addReminder(data);
      }
    },
    [editingReminder, addReminder, updateReminder]
  );

  const handleTabChange = useCallback((tab: NavTab) => {
    if (tab === 'settings') {
      setSettingsOpen(true);
    } else {
      setActiveTab(tab);
      // Sync bottom tab selection with sub-views
      if (tab === 'completed') {
        setViewTab('completed');
      } else if (tab === 'home') {
        setViewTab('active');
      }
    }
  }, []);

  const handleSwipeLeft = useCallback((id: string) => {
    setSnoozeTargetId(id);
    setSmartSnoozeOpen(true);
  }, []);

  const handleSmartSnoozeSelect = useCallback((minutes: number) => {
    if (snoozeTargetId) {
      snoozeReminder(snoozeTargetId, minutes);
      setSnoozeTargetId(null);
    }
  }, [snoozeTargetId, snoozeReminder]);

  const snoozeTargetReminder = useMemo(() => {
    if (!snoozeTargetId) return null;
    return reminders.find((r) => r.id === snoozeTargetId) || null;
  }, [snoozeTargetId, reminders]);

  // Filtering Logic
  const filterReminders = useCallback(
    (list: Reminder[]) => {
      return list.filter((r) => {
        const matchSearch =
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchCategory = categoryFilter === 'all' || r.category === categoryFilter;
        return matchSearch && matchCategory;
      });
    },
    [searchQuery, categoryFilter]
  );

  const filteredActive = useMemo(() => filterReminders(activeReminders), [activeReminders, filterReminders]);
  const filteredMissed = useMemo(() => filterReminders(missedReminders), [missedReminders, filterReminders]);
  const filteredCompleted = useMemo(() => filterReminders(completedReminders), [completedReminders, filterReminders]);

  return (
    <div className="min-h-screen bg-background">
      <AppBar
        onAddClick={handleAdd}
        onSettingsClick={() => setSettingsOpen(true)}
        darkMode={settings.darkMode}
        onToggleDark={() => updateSettings({ darkMode: !settings.darkMode })}
      />

      {/* Premium Notification Permission Denied Alert Banner */}
      {permissionStatus === 'denied' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-20 mb-[-12px] max-w-lg md:mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Notifications Disabled</h4>
              <p className="text-xs text-muted-foreground">Alerts won't sound or fire on time.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={requestPermission}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold flex-shrink-0"
          >
            Enable
          </Button>
        </motion.div>
      )}

      <main className="pt-24 pb-24 px-4 max-w-lg mx-auto">
        
        {/* Search & Category Filter Section */}
        <div className="space-y-4 mb-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/65"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-200
                ${categoryFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-sm'
                  : 'border-border/50 bg-background text-muted-foreground hover:bg-muted/30'
                }`}
            >
              All
            </button>
            {(Object.keys(CATEGORY_DETAILS) as Category[]).map((catKey) => {
              const details = CATEGORY_DETAILS[catKey];
              const active = categoryFilter === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setCategoryFilter(catKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all duration-200
                    ${active
                      ? `${details.bg} ${details.border} ${details.color} scale-105 shadow-sm`
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

        {/* View Tabs: Active | Missed | Completed */}
        <div className="flex p-1 rounded-xl bg-muted/40 border border-border/60 mb-6 max-w-sm mx-auto">
          <button
            onClick={() => {
              setViewTab('active');
              setActiveTab('home');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all duration-200 relative flex items-center justify-center gap-1.5
              ${viewTab === 'active'
                ? 'bg-background text-foreground shadow-sm font-extrabold'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>Active</span>
            {activeReminders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {activeReminders.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => {
              setViewTab('missed');
              setActiveTab('home');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all duration-200 relative flex items-center justify-center gap-1.5
              ${viewTab === 'missed'
                ? 'bg-background text-foreground shadow-sm font-extrabold'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>Missed</span>
            {missedReminders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold animate-pulse">
                {missedReminders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setViewTab('completed');
              setActiveTab('completed');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all duration-200 relative flex items-center justify-center gap-1.5
              ${viewTab === 'completed'
                ? 'bg-background text-foreground shadow-sm font-extrabold'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>Completed</span>
            {completedReminders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                {completedReminders.length}
              </span>
            )}
          </button>
        </div>

        {/* Reminders List */}
        <div className="pt-2">
          {viewTab === 'active' && (
            <ReminderList
              activeReminders={filteredActive}
              completedReminders={[]}
              onComplete={completeReminder}
              onSnooze={snoozeReminder}
              onDelete={deleteReminder}
              onEdit={handleEdit}
              defaultSnoozeMinutes={settings.defaultSnoozeMinutes}
              onSwipeLeft={handleSwipeLeft}
            />
          )}

          {viewTab === 'missed' && (
            <ReminderList
              activeReminders={filteredMissed}
              completedReminders={[]}
              onComplete={completeReminder}
              onSnooze={snoozeReminder}
              onDelete={deleteReminder}
              onEdit={handleEdit}
              defaultSnoozeMinutes={settings.defaultSnoozeMinutes}
              onSwipeLeft={handleSwipeLeft}
            />
          )}

          {viewTab === 'completed' && (
            <ReminderList
              activeReminders={[]}
              completedReminders={filteredCompleted}
              onComplete={completeReminder}
              onSnooze={snoozeReminder}
              onDelete={deleteReminder}
              onEdit={handleEdit}
              defaultSnoozeMinutes={settings.defaultSnoozeMinutes}
              onSwipeLeft={() => {}}
            />
          )}
        </div>
      </main>

      {/* Floating Action Button for Quick Add */}
      {activeTab !== 'settings' && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setQuickAddOpen(true)}
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:from-red-600 hover:to-rose-700 transition-all duration-200"
          aria-label="Quick Add Reminder"
        >
          <Zap className="w-6 h-6 animate-pulse" />
        </motion.button>
      )}

      {/* Navigation tabs bottom bar */}
      <BottomNav
        active={activeTab}
        onChange={handleTabChange}
        completedCount={completedReminders.length}
      />

      {/* Detailed edit/create form dialog */}
      {formOpen && (
        <ReminderForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          editingReminder={editingReminder}
          defaultSound={settings.defaultSound}
          volume={settings.volume}
          existingReminders={[...activeReminders, ...completedReminders, ...missedReminders]}
        />
      )}

      {/* Settings control panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />

      {/* Quick Add Bottom Sheet Dialog */}
      {quickAddOpen && (
        <QuickAddSheet
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onSave={handleSave}
          defaultSound={settings.defaultSound}
        />
      )}

      {/* Adaptive smart snooze sheet */}
      {smartSnoozeOpen && snoozeTargetReminder && (
        <SmartSnoozeSheet
          open={smartSnoozeOpen}
          onClose={() => {
            setSmartSnoozeOpen(false);
            setSnoozeTargetId(null);
          }}
          onSnoozeSelected={handleSmartSnoozeSelect}
          reminderTitle={snoozeTargetReminder.title}
        />
      )}

      {/* ── Foreground Alert Dialog ── */}
      {foregroundAlertReminder && (
        <Dialog open={!!foregroundAlertReminder} onOpenChange={(open) => !open && setForegroundAlertReminder(null)}>
          <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] sm:max-w-md w-[92%] flex flex-col p-0 gap-0 border-0 shadow-3xl overflow-hidden rounded-2xl bg-background animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className={`flex-shrink-0 px-6 py-5 bg-gradient-to-br ${
              foregroundAlertReminder.priority === 'high'
                ? 'from-rose-500 via-red-500 to-orange-500'
                : 'from-red-500 to-rose-600'
            }`}>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-bounce">
                    <BellRing className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-white text-base font-extrabold tracking-tight">
                      {foregroundAlertReminder.priority === 'high' ? '🚨 CRITICAL ALERT' : '⏰ Reminder Alert'}
                    </DialogTitle>
                    <p className="text-xs text-white/80 mt-0.5">
                      Happening now
                    </p>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">
                    {CATEGORY_DETAILS[foregroundAlertReminder.category || 'other'].emoji}
                  </span>
                  <h3 className="text-lg font-extrabold text-foreground leading-snug">
                    {foregroundAlertReminder.title}
                  </h3>
                </div>
                {foregroundAlertReminder.description && (
                  <p className="text-sm text-muted-foreground bg-muted/30 border border-border/40 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {foregroundAlertReminder.description}
                  </p>
                )}
              </div>

              {/* Badges metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Badge */}
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  CATEGORY_DETAILS[foregroundAlertReminder.category || 'other'].bg
                } ${CATEGORY_DETAILS[foregroundAlertReminder.category || 'other'].border} ${
                  CATEGORY_DETAILS[foregroundAlertReminder.category || 'other'].color
                }`}>
                  {CATEGORY_DETAILS[foregroundAlertReminder.category || 'other'].emoji}{' '}
                  {CATEGORY_DETAILS[foregroundAlertReminder.category || 'other'].label}
                </span>

                {/* Priority Badge */}
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  foregroundAlertReminder.priority === 'high'
                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                    : foregroundAlertReminder.priority === 'medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                }`}>
                  {foregroundAlertReminder.priority.toUpperCase()} PRIORITY
                </span>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col gap-2 pt-3 border-t border-border/40 mt-4">
                <div className="flex gap-2">
                  {/* Snooze Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSnoozeTargetId(foregroundAlertReminder.id);
                      setSmartSnoozeOpen(true);
                      setForegroundAlertReminder(null);
                    }}
                    className="flex-1 h-12 rounded-xl border-border/60 hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-500 font-bold transition-all duration-200 flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    Snooze
                  </Button>

                  {/* Complete Button */}
                  <Button
                    type="button"
                    onClick={() => {
                      completeReminder(foregroundAlertReminder.id);
                      toast.success('Reminder completed ✓');
                      setForegroundAlertReminder(null);
                    }}
                    className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 border-0 transition-all duration-200 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Complete
                  </Button>
                </div>

                {/* Dismiss (simply close) */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForegroundAlertReminder(null)}
                  className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground font-semibold"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <InstallPrompt />
    </div>
  );
};

export default Index;