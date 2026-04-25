/* ── Polyfills: MUST be first imports before anything else ─────────────────── */
// Firebase Web SDK requires crypto.getRandomValues which is missing in React Native.
// react-native-get-random-values patches global.crypto.getRandomValues.
import 'react-native-get-random-values';
// Firebase also checks globalThis.crypto — make sure it points to global.crypto
if (typeof globalThis.crypto === 'undefined' && typeof global.crypto !== 'undefined') {
  globalThis.crypto = global.crypto;
}
// Firebase Auth Web SDK requires IndexedDB for persistence.
// React Native doesn't have IndexedDB — fake-indexeddb provides an in-memory
// implementation so Firebase falls back to InMemoryPersistence instead of crashing.
try {
  require('fake-indexeddb/auto');
} catch (e) {
  console.warn('[Polyfill] fake-indexeddb failed to load, Firebase persistence may not work:', e);
}

import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
