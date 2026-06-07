import { Home, CheckCircle2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export type NavTab = 'home' | 'completed' | 'settings';

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  completedCount: number;
}

const tabs = [
  { id: 'home' as NavTab,      label: 'Home',      icon: Home },
  { id: 'completed' as NavTab, label: 'Done',       icon: CheckCircle2 },
  { id: 'settings' as NavTab,  label: 'Settings',   icon: Settings },
];

export function BottomNav({ active, onChange, completedCount }: BottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-50 app-safe-bottom"
    >
      <div className="bg-background/80 backdrop-blur-2xl border-t border-border/60 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around max-w-lg mx-auto h-16">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className="relative flex flex-col items-center gap-1 py-2 px-5 rounded-2xl transition-all duration-200 outline-none"
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl bg-primary/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Icon wrapper */}
                <div className="relative">
                  <tab.icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  {/* Badge */}
                  {tab.id === 'completed' && completedCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full bg-gradient-to-br from-red-500 to-emerald-800 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                      {completedCount > 99 ? '99+' : completedCount}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-semibold transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
