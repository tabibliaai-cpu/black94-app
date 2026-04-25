// Firebase Web SDK with @react-native-firebase-compatible API
// Web SDK works in React Native via Metro: auth uses HTTP, Firestore uses WebSocket/HTTP.

import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  inMemoryPersistence,
  getAuth as fbGetAuth,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
  GoogleAuthProvider as FbGoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where as fbWhere,
  orderBy as fbOrderBy,
  limit as fbLimit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

/* ── Firebase Config ──────────────────────────────────────────────────── */

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBAVWmNA9fo0hg4xRIi_O6ry3kAuuQylck',
  authDomain: 'black94.firebaseapp.com',
  projectId: 'black94',
  storageBucket: 'black94.firebasestorage.app',
  messagingSenderId: '210565807767',
  appId: '1:210565807767:web:7ba097fc1980fce42373d2',
  measurementId: 'G-9SRSQ1S4ME',
};

/* ── Firebase Init (eager — fail fast with clear error) ───────────────── */

let _app: any = null;
let _auth: any = null;
let _db: any = null;

function ensureFirebaseApp() {
  if (_app) return _app;
  try {
    _app = initializeApp(FIREBASE_CONFIG);
    console.log('[Firebase] App initialized');
  } catch (e: any) {
    console.error('[Firebase] App init failed:', e?.message || e);
  }
  return _app;
}

function ensureAuth() {
  if (_auth) return _auth;
  const app = ensureFirebaseApp();
  if (app) {
    try {
      // Use initializeAuth with inMemoryPersistence explicitly.
      // This avoids IndexedDB entirely — no fake-indexeddb needed.
      _auth = initializeAuth(app, {
        persistence: inMemoryPersistence,
      });
      console.log('[Firebase] Auth initialized (in-memory persistence)');
    } catch (e: any) {
      console.error('[Firebase] Auth init failed:', e?.message || e);
    }
  }
  return _auth;
}

function ensureDb() {
  if (_db) return _db;
  const app = ensureFirebaseApp();
  if (app) {
    try {
      _db = getFirestore(app);
      console.log('[Firebase] Firestore initialized');
    } catch (e: any) {
      console.error('[Firebase] Firestore init failed:', e?.message || e);
    }
  }
  return _db;
}

/* ── Compat: Auth ─────────────────────────────────────────────────────── */

function auth() {
  return ensureAuth();
}

/* ── Compat: Collection Reference ─────────────────────────────────────── */

class CompatCollectionRef {
  _db: any;
  _path: string;
  _constraints: any[];

  constructor(database: any, path: string, constraints: any[] = []) {
    this._db = database;
    this._path = path;
    this._constraints = constraints;
  }

  doc(docId: string) {
    const docPath = `${this._path}/${docId}`;
    return new CompatDocRef(this._db, docPath);
  }

  where(field: string, op: string, value: any) {
    return new CompatCollectionRef(this._db, this._path, [
      ...this._constraints,
      fbWhere(field, op, value),
    ]);
  }

  orderBy(field: string, dir: string = 'asc') {
    return new CompatCollectionRef(this._db, this._path, [
      ...this._constraints,
      fbOrderBy(field, dir),
    ]);
  }

  limit(n: number) {
    return new CompatCollectionRef(this._db, this._path, [
      ...this._constraints,
      fbLimit(n),
    ]);
  }

  async get() {
    const db = ensureDb();
    if (!db) {
      console.error('[Firebase] Firestore not initialized');
      return { docs: [], empty: true, size: 0 };
    }
    const ref = collection(db, ...this._path.split('/'));
    const q = this._constraints.length > 0 ? query(ref, ...this._constraints) : ref;
    try {
      const snapshot = await getDocs(q);
      return {
        docs: snapshot.docs,
        empty: snapshot.empty,
        size: snapshot.size,
      };
    } catch (e: any) {
      console.warn('[Firebase] Collection get error:', e?.message);
      return { docs: [], empty: true, size: 0 };
    }
  }

  async add(data: any) {
    const db = ensureDb();
    if (!db) throw new Error('Firebase not initialized');
    return await addDoc(collection(db, ...this._path.split('/')), data);
  }
}

/* ── Compat: Document Reference ───────────────────────────────────────── */

class CompatDocRef {
  _db: any;
  _path: string;
  id: string;

  constructor(database: any, path: string) {
    this._db = database;
    this._path = path;
    this.id = path.split('/').pop() || '';
  }

  collection(subPath: string) {
    return new CompatCollectionRef(this._db, `${this._path}/${subPath}`);
  }

  async get() {
    const db = ensureDb();
    if (!db) {
      return { id: this.id, exists: false, data: () => null };
    }
    try {
      const snapshot = await getDoc(doc(db, ...this._path.split('/')));
      return {
        id: snapshot.id,
        exists: snapshot.exists(),
        data: () => snapshot.data(),
      };
    } catch (e: any) {
      console.warn('[Firebase] Doc get error:', e?.message);
      return { id: this.id, exists: false, data: () => null };
    }
  }

  async set(data: any, options?: any) {
    const db = ensureDb();
    if (!db) return;
    await setDoc(doc(db, ...this._path.split('/')), data, options);
  }

  async update(data: any) {
    const db = ensureDb();
    if (!db) return;
    await updateDoc(doc(db, ...this._path.split('/')), data);
  }

  async delete() {
    const db = ensureDb();
    if (!db) return;
    await deleteDoc(doc(db, ...this._path.split('/')));
  }
}

/* ── Compat: Firestore ────────────────────────────────────────────────── */

function firestore() {
  return {
    collection: (path: string) => new CompatCollectionRef(ensureDb(), path),
  };
}

(firestore as any).FieldValue = {
  serverTimestamp,
  increment,
};

/* ── Exports ─────────────────────────────────────────────────────────── */

function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  if (!authInstance) {
    console.warn('[Firebase] auth is null — treating as signed out');
    setTimeout(() => callback(null), 0);
    return () => {};
  }
  return fbOnAuthStateChanged(authInstance, callback);
}

export { fbSignOut as signOut };

async function signInWithGoogleIdToken(idToken: string) {
  const authInst = ensureAuth();
  if (!authInst) throw new Error('Firebase Auth not initialized');

  console.log('[Firebase] Signing in with Google ID token...');
  const credential = FbGoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(authInst, credential);
  console.log('[Firebase] Sign-in successful:', result.user?.uid);
  return result;
}

export { auth, firestore, onAuthStateChanged, signInWithGoogleIdToken, FbGoogleAuthProvider as GoogleAuthProvider };
