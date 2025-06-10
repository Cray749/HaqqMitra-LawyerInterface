
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  const errorMessage = 'CRITICAL: Firebase projectId is not configured. Check your NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable. Application cannot start.';
  console.error(errorMessage);
  throw new Error(errorMessage);
} else {
  console.log('[Firebase] Attempting to initialize Firebase app with Project ID:', firebaseConfig.projectId);
}

let app: FirebaseApp;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] App initialized successfully.');
  } catch (e: any) {
    const errorMessage = `[Firebase] CRITICAL: Error initializing Firebase app: ${e.message || 'Unknown error'}`;
    console.error(errorMessage, e.stack);
    throw new Error(errorMessage);
  }
} else {
  app = getApp();
  console.log('[Firebase] Existing Firebase app retrieved.');
}

let db: Firestore;
try {
  db = getFirestore(app);
  console.log('[Firebase] Firestore instance obtained successfully.');
} catch (e: any) {
  const errorMessage = `[Firebase] CRITICAL: Error getting Firestore instance: ${e.message || 'Unknown error'}`;
  console.error(errorMessage, e.stack);
  throw new Error(errorMessage);
}

let storage: FirebaseStorage;
try {
  storage = getStorage(app);
  console.log('[Firebase] Storage instance obtained successfully.');
} catch (e: any) {
  const errorMessage = `[Firebase] CRITICAL: Error getting Storage instance: ${e.message || 'Unknown error'}`;
  console.error(errorMessage, e.stack);
  throw new Error(errorMessage);
}

export { app, db, storage };
