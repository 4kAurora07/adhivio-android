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
import { motion, AnimatePresence } from 'framer-motion';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { BrandLogo } from '@/components/BrandLogo';
import adhivioLogo from '@/assets/adhivio_logo.png';

interface SoundStoragePlugin {
  checkBackgroundPermissions(): Promise<{
    notificationsGranted: boolean;
    exactAlarmGranted: boolean;
    batteryOptimizationIgnored: boolean;
  }>;
  requestExactAlarmPermission(): Promise<void>;
  requestBatteryOptimizationExemption(): Promise<void>;
  openSettings(): Promise<void>;
  setBackgroundServiceActive(options: { active: boolean }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
}
const SoundStorage = registerPlugin<SoundStoragePlugin>("SoundStorage");
const isAndroid = Capacitor.getPlatform() === 'android';

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

  // Onboarding & background permission states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingStep, setCheckingStep] = useState(false);

  // Home screen revoked permissions fixing banner & dialog
  const [showFixBanner, setShowFixBanner] = useState(false);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [showBatteryExplanation, setShowBatteryExplanation] = useState(false);

  const [bgPermsStatus, setBgPermsStatus] = useState({
    notificationsGranted: true,
    exactAlarmGranted: true,
    batteryOptimizationIgnored: true
  });

  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'>('granted');

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Silently re-check all background permissions
  const checkBackgroundPermissionsSilent = useCallback(async () => {
    if (!isAndroid) return;
    try {
      const res = await SoundStorage.checkBackgroundPermissions();
      setBgPermsStatus(res);
      // If any required background permission is revoked, show the non-intrusive banner
      if (!res.notificationsGranted || !res.exactAlarmGranted || !res.batteryOptimizationIgnored) {
        setShowFixBanner(true);
      } else {
        setShowFixBanner(false);
      }
    } catch (e) {
      console.warn('[Index] Silent background permission check failed:', e);
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    const requested = localStorage.getItem('adhivio_permissions_requested');
    if (!requested) {
      setShowOnboarding(true);
    } else {
      checkBackgroundPermissionsSilent();
    }
  }, [checkBackgroundPermissionsSilent]);

  const requestPermission = async () => {
    try {
      const res = await LocalNotifications.requestPermissions();
      setPermissionStatus(res.display);
      // Re-verify permission status
      if (isAndroid) {
        const perms = await SoundStorage.checkBackgroundPermissions();
        setBgPermsStatus(perms);
      }
      if (res.display === 'granted') {
        toast.success('Notifications enabled successfully!');
      } else {
        toast.error('Permission denied. Please enable notifications in App Settings.');
      }
    } catch {
      toast.error('Failed to request notification permissions');
    }
  };

  // Simplified onboarding: request permissions then open device settings immediately
  const startOnboardingFlow = async () => {
    setCheckingStep(true);
    try {
      // 1. Request notification permission
      await LocalNotifications.requestPermissions();

      // 2. On Android: open battery optimization settings directly, then mark complete
      if (isAndroid) {
        try {
          await SoundStorage.requestExactAlarmPermission();
        } catch (e) {
          console.warn('[Onboarding] Exact alarm permission error:', e);
        }
        try {
          await SoundStorage.requestBatteryOptimizationExemption();
        } catch (e) {
          console.warn('[Onboarding] Battery opt error:', e);
        }
      }
    } catch (e) {
      console.warn('[Onboarding] Permission request error:', e);
    } finally {
      // Mark complete immediately — don't wait for resume callbacks
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('adhivio_permissions_requested', 'true');
    setShowOnboarding(false);
    setCheckingStep(false);
    checkBackgroundPermissionsSilent();
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('adhivio_permissions_requested', 'true');
    setShowOnboarding(false);
    checkBackgroundPermissionsSilent();
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
      if (showFixDialog) {
        setShowFixDialog(false);
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
  }, [formOpen, quickAddOpen, smartSnoozeOpen, settingsOpen, showFixDialog, categoryFilter, searchQuery, viewTab, foregroundAlertReminder]);

  // Handle app resume — recheck permissions silently
  useEffect(() => {
    const handleStateChange = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkBackgroundPermissionsSilent();
      }
    });
    return () => {
      handleStateChange.then((h) => h.remove());
    };
  }, [checkBackgroundPermissionsSilent]);

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

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between px-6 py-12 max-w-lg mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-300">

          {/* Logo */}
          <img
            src={adhivioLogo}
            alt="Adhivio Logo"
            className="w-24 h-24 rounded-[28px] object-contain shadow-lg"
          />

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary dark:text-[#F3F4F6]">
              <span className="text-[#1A1A1A] dark:text-white">Adhi</span><span className="text-primary-red">vio</span>
            </h1>
            <p className="text-sm leading-relaxed text-text-secondary dark:text-muted-foreground">
              Adhivio needs permission to send notifications and run in the background so your reminders fire on time — even when the app is closed.
            </p>
          </div>

          {/* What we'll open */}
          <div className="w-full bg-muted/40 border border-border/50 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔔</span>
              <div>
                <p className="text-xs font-bold text-text-primary dark:text-[#F3F4F6]">Notification Permission</p>
                <p className="text-[11px] text-muted-foreground">Allows Adhivio to alert you at the right time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🔋</span>
              <div>
                <p className="text-xs font-bold text-text-primary dark:text-[#F3F4F6]">Battery Optimization</p>
                <p className="text-[11px] text-muted-foreground">Opens device settings — tap "Allow" to prevent Android from silencing reminders.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="space-y-3 max-w-sm mx-auto w-full">
          <Button
            onClick={startOnboardingFlow}
            disabled={checkingStep}
            className="w-full h-12 rounded-xl bg-primary-red hover:bg-primary-red/90 text-white font-bold shadow-md shadow-primary-red/25 flex items-center justify-center gap-2 border-0 transition-all duration-200"
          >
            {checkingStep ? 'Opening Settings…' : '🔓 Grant Permissions'}
          </Button>

          {isAndroid && (
            <Button
              variant="outline"
              onClick={() => SoundStorage.openSettings()}
              className="w-full h-12 rounded-xl border-border/60 hover:bg-muted/30 font-bold transition-all duration-200"
            >
              ⚙️ System App Settings
            </Button>
          )}

          <button
            onClick={handleSkipOnboarding}
            className="w-full text-center text-xs font-semibold text-text-secondary hover:text-text-primary dark:text-muted-foreground dark:hover:text-[#F3F4F6] transition-colors py-2"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] bg-white flex items-center justify-center select-none"
          >
            {/* Dark pill-shaped card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1A1A1A] rounded-[80px] px-8 py-6 flex items-center gap-6 shadow-2xl max-w-sm w-[92%] sm:w-auto animate-in fade-in zoom-in-95 duration-300"
            >
              {/* Left side: Red rounded square (104x104) containing white bell */}
              <img
                src={adhivioLogo}
                alt="Adhivio Logo"
                className="w-[104px] h-[104px] rounded-[28px] flex-shrink-0 object-contain"
              />

              {/* Right side: Wordmark (no tagline for splash pill layout) */}
              <div className="flex flex-col items-start leading-none select-none">
                <span className="font-sans font-bold tracking-[-1px] text-[36px] relative pb-2 leading-none">
                  <span className="relative">
                    <span className="text-white">Adhi</span>
                    <span className="absolute left-0 bottom-[-4px] h-[4px] w-full bg-[#4CAF87] rounded-[2px]" />
                  </span>
                  <span className="text-[#4CAF87]">vio</span>
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background">
      <AppBar
        onAddClick={handleAdd}
        onSettingsClick={() => setSettingsOpen(true)}
        darkMode={settings.darkMode}
        onToggleDark={() => updateSettings({ darkMode: !settings.darkMode })}
      />

      {/* Revoked Permission Warning Banner */}
      {showFixBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowFixDialog(true)}
          className="mx-4 mt-20 mb-[-12px] max-w-lg md:mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between gap-3 shadow-sm cursor-pointer hover:bg-amber-500/15 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-[#F3F4F6]">⚠️ Some reminders may be delayed. Tap to fix →</p>
            </div>
          </div>
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
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary-green/30 focus:border-primary-green transition-all duration-200 outline-none text-sm"
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
                  ? 'bg-primary-green text-white border-primary-green scale-105 shadow-sm'
                  : 'border-[#E5E7EB] dark:border-border bg-white dark:bg-card text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-muted/30'
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
                      : 'border-[#E5E7EB] dark:border-border bg-white dark:bg-card text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-muted/30'
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
        <div className="flex border-b border-border/60 mb-6 max-w-sm mx-auto justify-around">
          <button
            onClick={() => {
              setViewTab('active');
              setActiveTab('home');
            }}
            className={`pb-2.5 text-xs font-bold text-center transition-all duration-200 relative flex items-center justify-center gap-1.5 border-b-2
              ${viewTab === 'active'
                ? 'border-primary-green text-primary-green font-extrabold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>Active</span>
            {activeReminders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary-red text-white text-[9px] font-bold">
                {activeReminders.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => {
              setViewTab('missed');
              setActiveTab('home');
            }}
            className={`pb-2.5 text-xs font-bold text-center transition-all duration-200 relative flex items-center justify-center gap-1.5 border-b-2
              ${viewTab === 'missed'
                ? 'border-primary-green text-primary-green font-extrabold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>Missed</span>
            {missedReminders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-white text-[9px] font-bold animate-pulse">
                {missedReminders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setViewTab('completed');
              setActiveTab('completed');
            }}
            className={`pb-2.5 text-xs font-bold text-center transition-all duration-200 relative flex items-center justify-center gap-1.5 border-b-2
              ${viewTab === 'completed'
                ? 'border-primary-green text-primary-green font-extrabold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>Completed</span>
            {completedReminders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary-green text-white text-[10px] font-extrabold shadow-sm">
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
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-primary-red text-white flex items-center justify-center shadow-md hover:bg-primary-red/90 transition-all duration-200"
          aria-label="Quick Add Reminder"
        >
          <Zap className="w-6 h-6" />
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
            <div className="flex-shrink-0 px-6 py-5 bg-card border-b border-border/40">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center animate-bounce">
                    <BellRing className="w-5 h-5 text-primary-red" />
                  </div>
                  <div>
                    <DialogTitle className="text-text-primary dark:text-[#F3F4F6] text-base font-extrabold tracking-tight">
                      {foregroundAlertReminder.priority === 'high' ? '🚨 CRITICAL ALERT' : '⏰ Reminder Alert'}
                    </DialogTitle>
                    <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">
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
                    ? 'bg-red-light text-primary-red border-primary-red/10'
                    : foregroundAlertReminder.priority === 'medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                    : 'bg-green-light text-primary-green border-primary-green/10'
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
                    className="flex-1 h-12 rounded-xl font-bold bg-primary-green hover:bg-primary-green/90 text-white shadow-sm border-0 transition-all duration-200 flex items-center justify-center gap-1.5"
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

      {/* Fix Permissions Dialog */}
      {showFixDialog && (
        <Dialog open={showFixDialog} onOpenChange={setShowFixDialog}>
          <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] sm:max-w-md w-[92%] flex flex-col p-0 gap-0 border-0 shadow-2xl overflow-hidden rounded-2xl bg-background border-t-[3px] border-t-primary-red">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 bg-card border-b border-border/40">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-primary-red" />
                  </div>
                  <div>
                    <DialogTitle className="text-foreground text-base font-extrabold tracking-tight">
                      Fix Background Issues
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enable permissions to ensure reminders fire on time
                    </p>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* List of items */}
            <div className="p-6 space-y-4 bg-background">
              {/* Notification Status */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-surface">
                <div>
                  <h4 className="text-sm font-bold text-text-primary dark:text-[#F3F4F6]">Notifications</h4>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">To show reminder banners</p>
                </div>
                {bgPermsStatus.notificationsGranted ? (
                  <span className="text-xs font-bold text-[#4CAF87] bg-green-light px-2.5 py-1 rounded-full">Active</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={requestPermission}
                    className="h-8 rounded-lg bg-primary-red hover:bg-primary-red/90 text-white font-semibold text-xs border-0"
                  >
                    Fix
                  </Button>
                )}
              </div>

              {/* Exact Alarms Status */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-surface">
                <div>
                  <h4 className="text-sm font-bold text-text-primary dark:text-[#F3F4F6]">Exact Timing</h4>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">To fire alarms precisely on time</p>
                </div>
                {bgPermsStatus.exactAlarmGranted ? (
                  <span className="text-xs font-bold text-[#4CAF87] bg-green-light px-2.5 py-1 rounded-full">Active</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => SoundStorage.requestExactAlarmPermission()}
                    className="h-8 rounded-lg bg-primary-red hover:bg-primary-red/90 text-white font-semibold text-xs border-0"
                  >
                    Fix
                  </Button>
                )}
              </div>

              {/* Battery Optimization Status */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-surface">
                <div>
                  <h4 className="text-sm font-bold text-text-primary dark:text-[#F3F4F6]">Battery Exemption</h4>
                  <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">To run reliably when closed</p>
                </div>
                {bgPermsStatus.batteryOptimizationIgnored ? (
                  <span className="text-xs font-bold text-[#4CAF87] bg-green-light px-2.5 py-1 rounded-full">Active</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowFixDialog(false);
                      setShowBatteryExplanation(true);
                    }}
                    className="h-8 rounded-lg bg-primary-red hover:bg-primary-red/90 text-white font-semibold text-xs border-0"
                  >
                    Fix
                  </Button>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border/40 gap-2">
                {isAndroid && (
                  <Button
                    onClick={() => {
                      setShowFixDialog(false);
                      SoundStorage.openSettings();
                    }}
                    className="h-10 rounded-xl px-4 text-xs font-bold bg-[#E05C5C] hover:bg-[#E05C5C]/90 text-white border-0"
                  >
                    ⚙️ Open App Settings
                  </Button>
                )}
                <Button
                  onClick={() => setShowFixDialog(false)}
                  variant="outline"
                  className="h-10 rounded-xl px-4 text-xs font-bold border-border/60"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Explanation for battery optimizations in home dialog */}
      {showBatteryExplanation && (
        <Dialog open={showBatteryExplanation} onOpenChange={setShowBatteryExplanation}>
          <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] sm:max-w-md w-[92%] flex flex-col p-6 gap-5 rounded-2xl bg-surface border-t-[3px] border-t-primary-red border-border shadow-2xl">
            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-text-primary dark:text-[#F3F4F6]">
                Battery Optimization
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary dark:text-muted-foreground">
                To make sure your reminders fire on time, allow Adhivio unrestricted battery usage in the next screen.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
              <Button
                onClick={async () => {
                  setShowBatteryExplanation(false);
                  await SoundStorage.requestBatteryOptimizationExemption();
                }}
                className="w-full h-12 rounded-xl bg-primary-red hover:bg-primary-red/90 text-white font-bold shadow-md shadow-primary-red/25 border-0 transition-all duration-200"
              >
                Continue to settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <InstallPrompt />
    </div>
    </>
  );
};

export default Index;