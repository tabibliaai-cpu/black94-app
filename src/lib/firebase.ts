// Firebase Web SDK with @react-native-firebase-compatible API
// Web SDK works in React Native via Metro: auth uses HTTP, Firestore uses WebSocket/HTTP.
// This wraps the web SDK so screens can use: auth(), firestore(), firestore.FieldValue, etc.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithCredential,
  GoogleAuthProvider,
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

/* ── Firebase Init ────────────────────────────────────────────────────────── */

const firebaseConfig = {
  apiKey: 'AIzaSyBAVWmNA9fo0hg4xRIi_O6ry3kAuuQylck',
  authDomain: 'black94.firebaseapp.com',
  projectId: 'black94',
  storageBucket: 'black94.firebasestorage.app',
  messagingSenderId: '210565807767',
  appId: '1:210565807767:web:7ba097fc1980fce42373d2',
  measurementId: 'G-9SRSQ1S4ME',
};

const firebaseApp = initializeApp(firebaseConfig);
const authInstance = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

/* ── Compat: Auth ─────────────────────────────────────────────────────────── */
// auth() returns the web SDK Auth instance so auth().currentUser works.

function auth() {
  return authInstance;
}

/* ── Compat: Collection Reference ────────────────────────────────────────── */

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
    const ref = this._ref();
    const q = this._constraints.length > 0 ? query(ref, ...this._constraints) : ref;
    const snapshot = await getDocs(q);
    return {
      docs: snapshot.docs,
      empty: snapshot.empty,
      size: snapshot.size,
    };
  }

  async add(data: any) {
    return await addDoc(this._ref(), data);
  }
}

/* ── Compat: Document Reference ──────────────────────────────────────────── */

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
    const snapshot = await getDoc(this._ref());
    return {
      id: snapshot.id,
      exists: snapshot.exists(),
      data: () => snapshot.data(),
    };
  }

  async set(data: any, options?: any) {
    await setDoc(this._ref(), data, options);
  }

  async update(data: any) {
    await updateDoc(this._ref(), data);
  }

  async delete() {
    await deleteDoc(this._ref());
  }
}

/* ── Compat: Firestore ───────────────────────────────────────────────────── */
// firestore() returns an object with .collection(path) for chaining queries.
// firestore.FieldValue.serverTimestamp() and .increment() are static helpers.

function firestore() {
  return {
    collection: (path: string) => new CompatCollectionRef(db, path),
  };
}

// Static FieldValue helpers — screens use: firestore.FieldValue.serverTimestamp()
(firestore as any).FieldValue = {
  serverTimestamp,
  increment,
};

/* ── Exports ─────────────────────────────────────────────────────────────── */

export { auth, firestore, onAuthStateChanged, fbSignOut, signInWithCredential, GoogleAuthProvider };
