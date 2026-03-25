// Firebase configuration - v2
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, RecaptchaVerifier, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Get environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "";
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "";

// Check if Firebase is properly configured
export const isFirebaseConfigured = !!(apiKey && authDomain && projectId && appId);



// Firebase config object
const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

// Initialize Firebase only when configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    auth.languageCode = "pt-BR";
    
    // Ensure session persistence
    setPersistence(auth, browserLocalPersistence).catch(console.error);

  } catch (error) {
    console.error("[v0] Firebase initialization error:", error);
  }
}

export { app, auth, db, RecaptchaVerifier };
