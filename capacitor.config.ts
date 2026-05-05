import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.milkify.app',
  appName: 'Milkify',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
