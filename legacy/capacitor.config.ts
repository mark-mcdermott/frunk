import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.frunk.app',
  appName: 'Frunk',
  webDir: 'build',
  server: {
    // For development: point to local SvelteKit dev server
    // Comment out for production builds
    url: 'http://192.168.1.240:5173',
    cleartext: true
  }
};

export default config;
