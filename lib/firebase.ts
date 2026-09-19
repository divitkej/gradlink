import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True only when the Firebase env vars are present, so the UI can degrade gracefully. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

/**
 * Lazily created singletons. They stay null until the keys are set, which keeps
 * `next build` working on a machine that has no Firebase config yet — every
 * data function null-checks before use, exactly as the Supabase layer did.
 */
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function app(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!_app) _app = getApps().length ? getApp() : initializeApp(config);
  return _app;
}

export function firebaseAuth(): Auth | null {
  const a = app();
  if (!a) return null;
  if (!_auth) _auth = getAuth(a);
  return _auth;
}

export function firestore(): Firestore | null {
  const a = app();
  if (!a) return null;
  if (!_db) _db = getFirestore(a);
  return _db;
}

export function firebaseStorage(): FirebaseStorage | null {
  const a = app();
  if (!a) return null;
  if (!_storage) _storage = getStorage(a);
  return _storage;
}
