import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseInitialized } from './FirebaseConfig';

export interface AuthUser {
  uid: string;
  email: string | null;
}

class FirebaseAuth {
  private static instance: FirebaseAuth;
  private currentUser: AuthUser | null = null;
  private authStateListeners: ((user: AuthUser | null) => void)[] = [];
  private isFirebaseInitialized: boolean = false;
  private hasReceivedInitialAuthState: boolean = false;

  private constructor() {
    // Use the Firebase initialization status from config
    this.isFirebaseInitialized = isFirebaseInitialized;

    if (this.isFirebaseInitialized && auth) {
      onAuthStateChanged(auth, (user: User | null) => {
        this.currentUser = user
          ? {
            uid: user.uid,
            email: user.email,
          }
          : null;

        this.hasReceivedInitialAuthState = true;

        this.authStateListeners.forEach(listener => listener(this.currentUser));
      });
    }
  }

  public static getInstance(): FirebaseAuth {
    if (!FirebaseAuth.instance) {
      FirebaseAuth.instance = new FirebaseAuth();
    }
    return FirebaseAuth.instance;
  }

  private getAuthOrThrow(): Auth {
    if (!this.isFirebaseInitialized || !auth) {
      throw new Error('Firebase is not configured. Please set EXPO_PUBLIC_FIREBASE_* environment variables.');
    }
    return auth;
  }

  public async signUp(email: string, password: string): Promise<AuthUser> {
    const firebaseAuth = this.getAuthOrThrow();

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await firebaseSendEmailVerification(userCredential.user);

      const result: AuthUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      };

      this.currentUser = result;
      this.authStateListeners.forEach(listener => listener(result));

      return result;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  public async sendEmailVerification(): Promise<void> {
    const firebaseAuth = this.getAuthOrThrow();

    try {
      if (!firebaseAuth.currentUser) {
        throw new Error('No user is currently signed in');
      }

      await firebaseSendEmailVerification(firebaseAuth.currentUser);
    } catch (error: any) {
      throw new Error('Failed to send verification email');
    }
  }

  public async signIn(email: string, password: string): Promise<AuthUser> {
    const firebaseAuth = this.getAuthOrThrow();

    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);

      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
      }

      const result: AuthUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      };

      this.currentUser = result;
      this.authStateListeners.forEach(listener => listener(result));

      return result;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  public async signOut(): Promise<void> {
    if (!this.isFirebaseInitialized || !auth) {
      this.currentUser = null;
      this.authStateListeners.forEach(listener => listener(null));
      return;
    }

    try {
      await firebaseSignOut(auth);

      this.currentUser = null;
      this.authStateListeners.forEach(listener => listener(null));
    } catch (error: any) {
      throw new Error('Failed to sign out');
    }
  }

  public async resetPassword(email: string): Promise<void> {
    const firebaseAuth = this.getAuthOrThrow();

    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public async reloadUser(): Promise<void> {
    const firebaseAuth = this.getAuthOrThrow();
    if (firebaseAuth.currentUser) {
      await firebaseAuth.currentUser.reload();
      this.currentUser = {
        uid: firebaseAuth.currentUser.uid,
        email: firebaseAuth.currentUser.email,
      };
      this.authStateListeners.forEach(listener => listener(this.currentUser));
    }
  }

  public isEmailVerified(): boolean {
    if (!this.isFirebaseInitialized || !auth) return false;
    return auth.currentUser?.emailVerified || false;
  }

  public isSignedIn(): boolean {
    return this.currentUser !== null;
  }

  public onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.authStateListeners.push(callback);

    if (!this.isFirebaseInitialized || this.hasReceivedInitialAuthState) {
      setTimeout(() => callback(this.currentUser), 0);
    }

    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      default:
        return 'Authentication failed. Please try again';
    }
  }
}

export default FirebaseAuth;