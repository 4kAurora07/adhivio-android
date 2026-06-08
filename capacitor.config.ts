import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adhivio.app',
  appName: 'Adhivio',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#E05C5C',
      sound: 'reminder_sound',
    },
  },
};

export default config;
