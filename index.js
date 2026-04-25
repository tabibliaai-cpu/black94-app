/* ── Polyfills: MUST be first imports before anything else ─────────────────── */
// Firebase Web SDK requires crypto.getRandomValues which is missing in React Native.
// react-native-get-random-values patches global.crypto.getRandomValues.
import 'react-native-get-random-values';
// Firebase also checks globalThis.crypto — make sure it points to global.crypto
if (typeof globalThis.crypto === 'undefined' && typeof global.crypto !== 'undefined') {
  globalThis.crypto = global.crypto;
}

import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
