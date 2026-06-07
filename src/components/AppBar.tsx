import { Plus, Settings, Moon, Sun, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface AppBarProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export function AppBar({
  onAddClick,
  onSettingsClick,
  darkMode,
  onToggleDark,
}: AppBarProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 app-safe-top"
    >
      <div className="bg-background/75 backdrop-blur-2xl border-b border-border/60 shadow-sm">
        <div className="flex items-center justify-between px-5 h-16 max-w-lg mx-auto">

          {/* BRAND */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shadow-md shadow-secondary/20">
              <BellRing className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight gradient-text">
              Adhivio
            </span>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-1">

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDark}
              className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <motion.div
                key={darkMode ? 'sun' : 'moon'}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </motion.div>
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <Settings className="w-4.5 h-4.5" />
            </Button>

            {/* Add Button */}
            <Button
              size="sm"
              onClick={onAddClick}
              className="ml-1 h-9 px-4 gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold shadow-md shadow-red-500/25 border-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>

          </div>
        </div>
      </div>
    </motion.header>
  );
}