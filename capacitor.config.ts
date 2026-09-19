import { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {

  appId: 'com.example.astrologer',

  appName: 'Astroauraa',

  webDir: 'www',

  server: {

    androidScheme: 'https',

    cleartext: true

  },

  plugins: {

    // The app targets SDK 35 (Android 15), where enforced edge-to-edge makes the
    // manifest's android:windowSoftInputMode="adjustResize" ineffective — the WebView
    // no longer shrinks for the keyboard, so ion-footer (the chat input) ends up
    // hidden underneath it. Ionic resize makes the Keyboard plugin shrink the ion-app
    // element instead, which behaves the same on every Android version. Body resize is
    // the wrong choice here — ion-app is fixed-position and would not follow a shrunken
    // document body.
    Keyboard: {

      resize: KeyboardResize.Ionic

    }

  }

};

export default config;