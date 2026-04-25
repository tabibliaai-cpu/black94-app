import { initializeApp, getApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBAVWmNA9fo0hg4xRIi_O6ry3kAuuQylck',
  authDomain: 'black94.firebaseapp.com',
  projectId: 'black94',
  storageBucket: 'black94.firebasestorage.app',
  messagingSenderId: '210565807767',
  appId: '1:210565807767:web:7ba097fc1980fce42373d2',
  measurementId: 'G-9SRSQ1S4ME',
};

// Initialize Firebase (safe to call multiple times)
const app = initializeApp(firebaseConfig, 'black94-app');
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, fbSignOut };
