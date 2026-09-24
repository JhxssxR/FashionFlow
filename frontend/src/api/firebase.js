import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase web config comes from VITE_FIREBASE_* env vars (see .env.example
// and keep real values in the local .env, which is gitignored). These keys
// are public by design — Google locks them down via authorized domains in
// Firebase Console, not by secrecy — but they don't belong in git history.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured =
  Object.values(firebaseConfig).every((v) => typeof v === 'string' && v.length > 0);

let app = null;
export function firebaseApp() {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

// Opens the Google account chooser and resolves with a Firebase ID token
// for the backend (/api/auth/google) to verify.
export async function signInWithGoogle() {
  if (!isFirebaseConfigured) {
    throw new Error('Google sign-in is not set up yet — add your Firebase web config first.');
  }
  const result = await signInWithPopup(getAuth(firebaseApp()), new GoogleAuthProvider());
  return result.user.getIdToken();
}
