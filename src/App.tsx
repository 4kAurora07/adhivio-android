import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { LocalNotifications } from '@capacitor/local-notifications';
import { useEffect } from 'react';

const queryClient = new QueryClient();

const App = () => {

  useEffect(() => {

    const setupNotifications = async () => {

      // Request permission (Android 13+)
      await LocalNotifications.requestPermissions();

      // Create notification channel (Android 8+)
      await LocalNotifications.createChannel({
        id: 'reminder-channel',
        name: 'Reminder Notifications',
        description: 'Channel for reminder alerts',
        importance: 5,
        sound: 'reminder_sound', // NO .wav extension
        vibration: true,
        visibility: 1
      });

    };

    setupNotifications();

  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;