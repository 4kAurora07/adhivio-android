import { Plus, Settings, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/BrandLogo';

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
      <div className="bg-white dark:bg-[#1A2420] border-b border-border shadow-none">
        <div className="flex items-center justify-between px-5 h-16 max-w-lg mx-auto">

          {/* BRAND */}
          <BrandLogo layout="horizontal" size={32} />

          {/* ACTIONS */}
          <div className="flex items-center gap-1">

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDark}
              className="w-9 h-9 rounded-xl text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-muted/60"
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
              className="w-9 h-9 rounded-xl text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-muted/60"
            >
              <Settings className="w-4.5 h-4.5" />
            </Button>

            {/* Add Button */}
            <Button
              size="sm"
              onClick={onAddClick}
              className="ml-1 h-9 px-4 gap-1.5 rounded-xl bg-[#E05C5C] hover:bg-[#E05C5C]/90 text-white font-semibold shadow-sm border-0"
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