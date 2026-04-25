/* ── Polyfills ─────────────────────────────────────────────────────────── */
// Firebase Web SDK requires crypto.getRandomValues which is missing in React Native.
import 'react-native-get-random-values';

import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
