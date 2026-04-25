// Firebase Web SDK with @react-native-firebase-compatible API
// Web SDK works in React Native via Metro: auth uses HTTP, Firestore uses WebSocket/HTTP.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
  GoogleAuthProvider as FbGoogleAuthProvider,
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
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

/* ── Firebase Init (lazy — won't crash if import fails) ─────────────────── */

let _app: any = null;
let _auth: any = null;
let _db: any = null;
let _initError: string | null = null;

function getFirebaseApp() {
  if (_app) return _app;
  try {
    _app = initializeApp({
      apiKey: 'AIzaSyBAVWmNA9fo0hg4xRIi_O6ry3kAuuQylck',
      authDomain: 'black94.firebaseapp.com',
      projectId: 'black94',
      storageBucket: 'black94.firebasestorage.app',
      messagingSenderId: '210565807767',
      appId: '1:210565807767:web:7ba097fc1980fce42373d2',
      measurementId: 'G-9SRSQ1S4ME',
    });
  } catch (e: any) {
    _initError = e?.message || 'Firebase init failed';
    console.warn('[Firebase] Init error:', _initError);
  }
  return _app;
}

function getAuthInstance() {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (app) {
    try { _auth = getAuth(app); } catch (e: any) { _initError = e?.message || 'Auth init failed'; }
  }
  return _auth;
}

function getDbInstance() {
  if (_db) return _db;
  const app = getFirebaseApp();
  if (app) {
    try { _db = getFirestore(app); } catch (e: any) { _initError = e?.message || 'Firestore init failed'; }
  }
  return _db;
}

/* ── Compat: Auth ─────────────────────────────────────────────────────── */

function auth() {
  return getAuthInstance();
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

  _ref() {
    return collection(this._db, ...this._path.split('/'));
  }

  doc(docId: string) {
    const docPath = `${this._path}/${docId}`;
    return new CompatDocRef(this._db, docPath);
  }

  where(field: string, op: string, value: any) {
    return new CompatCollectionRef(this._db, this._path, [
      ...this._constraints,
      where(field, op, value),
    ]);
  }

  orderBy(field: string, dir: string = 'asc') {
    return new CompatCollectionRef(this._db, this._path, [
      ...this._constraints,
      orderBy(field, dir),
    ]);
  }

  limit(n: number) {
    return new CompatCollectionRef(this._db, this._path, [
      ...this._constraints,
      limit(n),
    ]);
  }

  async get() {
    const db = getDbInstance();
    if (!db) return { docs: [], empty: true, size: 0 };
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
    const db = getDbInstance();
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

  _ref() {
    return doc(this._db, ...this._path.split('/'));
  }

  collection(subPath: string) {
    return new CompatCollectionRef(this._db, `${this._path}/${subPath}`);
  }

  async get() {
    const db = getDbInstance();
    if (!db) return { id: this.id, exists: false, data: () => null };
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
    const db = getDbInstance();
    if (!db) return;
    await setDoc(doc(db, ...this._path.split('/')), data, options);
  }

  async update(data: any) {
    const db = getDbInstance();
    if (!db) return;
    await updateDoc(doc(db, ...this._path.split('/')), data);
  }

  async delete() {
    const db = getDbInstance();
    if (!db) return;
    await deleteDoc(doc(db, ...this._path.split('/')));
  }
}

/* ── Compat: Firestore ────────────────────────────────────────────────── */

function firestore() {
  return {
    collection: (path: string) => new CompatCollectionRef(getDbInstance(), path),
  };
}

(firestore as any).FieldValue = {
  serverTimestamp,
  increment,
};

/* ── Exports ─────────────────────────────────────────────────────────── */

// Wrap onAuthStateChanged to be safe — auth() might be null if init failed
function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  if (!authInstance) {
    // Firebase not initialized, treat as signed out
    setTimeout(() => callback(null), 0);
    return () => {};
  }
  return fbOnAuthStateChanged(authInstance, callback);
}

// Re-export signOut
export { fbSignOut as signOut };

// signInWithGoogleIdToken: converts a Google ID token to a Firebase user
// Uses signInWithCustomToken via Firebase Auth REST API internally
async function signInWithGoogleIdToken(idToken: string) {
  const authInst = getAuthInstance();
  if (!authInst) throw new Error('Firebase Auth not initialized');

  // Use the web SDK's signInWithCredential with a Google OAuth credential
  const credential = FbGoogleAuthProvider.credential(idToken);
  const result = await (await import('firebase/auth')).signInWithCredential(authInst, credential);
  return result;
}

export { auth, firestore, onAuthStateChanged, signInWithGoogleIdToken, FbGoogleAuthProvider as GoogleAuthProvider };
