import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase web config for Google sign-in. Paste your values from
// Firebase Console → Project settings → Your apps (Web </>),
// or set VITE_FIREBASE_* env vars / a .env file. Until filled in, the
// login page shows a setup hint instead of calling Google.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD-CS-coIO9tQrcRg7DmtokBZ_mMk27MyE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fashionflow-d506e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fashionflow-d506e',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:216960539178:web:f1322671e117f0cd688153'
};

export const isFirebaseConfigured =
  !Object.values(firebaseConfig).some((v) => typeof v === 'string' && v.startsWith('PASTE-'));

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
