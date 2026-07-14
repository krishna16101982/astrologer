import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {

  appId: 'com.example.astrologer',

  appName: 'astrologer',

  webDir: 'www',

  server: {

    androidScheme: 'https',

    cleartext: true

  }

};

export default config;