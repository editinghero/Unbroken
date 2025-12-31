import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';

// Ensure crypto polyfill is loaded for non-web platforms
if (Platform.OS !== 'web') {
  try {
    require('react-native-get-random-values');
  } catch (error) {
    // ignore - module may not be present
  }
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebaseConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId;

const enableFirebaseDiagnostics = process.env.EXPO_PUBLIC_FIREBASE_DIAGNOSTICS === '1';

let isFirebaseInitialized = false;

// Initialize Firebase app (singleton pattern)
let app: FirebaseApp | null = null;
if (hasFirebaseConfig) {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
  }
}

// Initialize Firestore
const db = app ? getFirestore(app) : null;

// Cache for auth instance to prevent multiple initializations
let _authInstance: Auth | null = null;

/**
 * Get the Firebase Auth instance.
 * On native platforms, this uses AsyncStorage for persistence.
 * On web, this uses the default browser persistence.
 */
function getFirebaseAuth(): Auth | null {
  if (!app) return null;

  // Return cached instance if available
  if (_authInstance) return _authInstance;

  if (Platform.OS === 'web') {
    // For web, use the standard getAuth which uses browser persistence
    _authInstance = getAuth(app);
  } else {
    // For native platforms (Android/iOS), use initializeAuth with AsyncStorage persistence
    try {
      _authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (error: any) {
      // If auth is already initialized, get the existing instance
      // This can happen during hot module replacement
      if (error.code === 'auth/already-initialized' || error.message?.includes('already been called')) {
        _authInstance = getAuth(app);
      } else {
        console.warn('[FirebaseConfig] Auth initialization error:', error.message);
        _authInstance = getAuth(app);
      }
    }
  }

  return _authInstance;
}

// Initialize auth
const auth = getFirebaseAuth();

isFirebaseInitialized = !!(app && auth && db);

if (enableFirebaseDiagnostics && process.env.NODE_ENV !== 'production') {
  console.log('[FirebaseConfig]', {
    platform: Platform.OS,
    hasFirebaseConfig,
    isFirebaseInitialized,
    configKeys: Object.keys(firebaseConfig).filter(k => firebaseConfig[k as keyof typeof firebaseConfig]),
  });
}

export { auth, db, isFirebaseInitialized };
export default app;