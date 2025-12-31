import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db, isFirebaseInitialized } from './FirebaseConfig';
import type { CheckIn, Holiday } from '@/types/checkin';
import FirebaseAuth from './FirebaseAuth';

class FirestoreSync {
  private static instance: FirestoreSync;
  private auth = FirebaseAuth.getInstance();
  private checkInsUnsubscribe: (() => void) | null = null;
  private holidaysUnsubscribe: (() => void) | null = null;
  private checkInsCallbacks: ((checkIns: CheckIn[]) => void)[] = [];
  private holidaysCallbacks: ((holidays: Holiday[]) => void)[] = [];

  private constructor() {}

  public static getInstance(): FirestoreSync {
    if (!FirestoreSync.instance) {
      FirestoreSync.instance = new FirestoreSync();
    }
    return FirestoreSync.instance;
  }

  private getUserId(): string {
    const user = this.auth.getCurrentUser();
    if (!user) {
      return 'local-user'; // Use local user ID when not authenticated
    }
    return user.uid;
  }

  // Local storage methods
  private async getLocalCheckIns(): Promise<CheckIn[]> {
    try {
      const userId = this.getUserId();
      const stored = await AsyncStorage.getItem(`checkIns_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.log('Error reading local check-ins:', error);
      return [];
    }
  }

  private async saveLocalCheckIns(checkIns: CheckIn[]): Promise<void> {
    try {
      const userId = this.getUserId();
      await AsyncStorage.setItem(`checkIns_${userId}`, JSON.stringify(checkIns));
      // Notify all subscribers
      this.checkInsCallbacks.forEach(callback => callback(checkIns));
    } catch (error) {
      console.log('Error saving local check-ins:', error);
    }
  }

  private async getLocalHolidays(): Promise<Holiday[]> {
    try {
      const userId = this.getUserId();
      const stored = await AsyncStorage.getItem(`holidays_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.log('Error reading local holidays:', error);
      return [];
    }
  }

  private async saveLocalHolidays(holidays: Holiday[]): Promise<void> {
    try {
      const userId = this.getUserId();
      await AsyncStorage.setItem(`holidays_${userId}`, JSON.stringify(holidays));
      // Notify all subscribers
      this.holidaysCallbacks.forEach(callback => callback(holidays));
    } catch (error) {
      console.log('Error saving local holidays:', error);
    }
  }

  // Check-ins methods
  public async addCheckIn(checkIn: CheckIn): Promise<void> {
    if (!isFirebaseInitialized) {
      console.log('Using local storage for addCheckIn');
      const checkIns = await this.getLocalCheckIns();
      const newCheckIn = { ...checkIn, timestamp: Date.now() };
      checkIns.push(newCheckIn);
      await this.saveLocalCheckIns(checkIns.sort((a, b) => b.timestamp - a.timestamp));
      return;
    }

    try {
      const userId = this.getUserId();

      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      await setDoc(
        doc(db, 'users', userId, 'checkIns', checkIn.id),
        {
          ...checkIn,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.log('Firebase addCheckIn failed, falling back to local storage:', error);
      const checkIns = await this.getLocalCheckIns();
      const newCheckIn = { ...checkIn, timestamp: Date.now() };
      checkIns.push(newCheckIn);
      await this.saveLocalCheckIns(checkIns.sort((a, b) => b.timestamp - a.timestamp));
    }
  }

  public async removeCheckIn(checkInId: string): Promise<void> {
    if (!isFirebaseInitialized) {
      console.log('Using local storage for removeCheckIn');
      const checkIns = await this.getLocalCheckIns();
      const filtered = checkIns.filter(c => c.id !== checkInId);
      await this.saveLocalCheckIns(filtered);
      return;
    }

    try {
      const userId = this.getUserId();

      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      await deleteDoc(doc(db, 'users', userId, 'checkIns', checkInId));
    } catch (error) {
      console.log('Firebase removeCheckIn failed, falling back to local storage:', error);
      const checkIns = await this.getLocalCheckIns();
      const filtered = checkIns.filter(c => c.id !== checkInId);
      await this.saveLocalCheckIns(filtered);
    }
  }

  public subscribeToCheckIns(callback: (checkIns: CheckIn[]) => void): () => void {
    if (!isFirebaseInitialized) {
      console.log('Using local storage for checkIns subscription');
      this.checkInsCallbacks.push(callback);

      // Load initial data
      this.getLocalCheckIns().then(checkIns => {
        callback(checkIns);
      });

      // Return unsubscribe function
      return () => {
        const index = this.checkInsCallbacks.indexOf(callback);
        if (index > -1) {
          this.checkInsCallbacks.splice(index, 1);
        }
      };
    }

    try {
      const userId = this.getUserId();

      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      const q = query(
        collection(db, 'users', userId, 'checkIns'),
        orderBy('timestamp', 'desc')
      );

      this.checkInsUnsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const checkIns: CheckIn[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          const data: any = docSnap.data();
          return {
            ...data,
            id: data.id ?? docSnap.id,
            timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
          };
        });
        callback(checkIns);
      });

      return () => {
        if (this.checkInsUnsubscribe) {
          this.checkInsUnsubscribe();
          this.checkInsUnsubscribe = null;
        }
      };
    } catch (error) {
      console.log('Firebase subscription failed, falling back to local storage:', error);
      this.checkInsCallbacks.push(callback);
      this.getLocalCheckIns().then(checkIns => callback(checkIns));
      return () => {
        const index = this.checkInsCallbacks.indexOf(callback);
        if (index > -1) {
          this.checkInsCallbacks.splice(index, 1);
        }
      };
    }
  }

  // Holidays methods
  public async addHoliday(holiday: Holiday): Promise<void> {
    if (!isFirebaseInitialized) {
      console.log('Using local storage for addHoliday');
      const holidays = await this.getLocalHolidays();
      const newHoliday = { ...holiday, timestamp: Date.now() };
      holidays.push(newHoliday);
      await this.saveLocalHolidays(holidays.sort((a, b) => b.timestamp - a.timestamp));
      return;
    }

    try {
      const userId = this.getUserId();

      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      await setDoc(
        doc(db, 'users', userId, 'holidays', holiday.id),
        {
          ...holiday,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.log('Firebase addHoliday failed, falling back to local storage:', error);
      const holidays = await this.getLocalHolidays();
      const newHoliday = { ...holiday, timestamp: Date.now() };
      holidays.push(newHoliday);
      await this.saveLocalHolidays(holidays.sort((a, b) => b.timestamp - a.timestamp));
    }
  }

  public async removeHoliday(holidayId: string): Promise<void> {
    if (!isFirebaseInitialized) {
      console.log('Using local storage for removeHoliday');
      const holidays = await this.getLocalHolidays();
      const filtered = holidays.filter(h => h.id !== holidayId);
      await this.saveLocalHolidays(filtered);
      return;
    }

    try {
      const userId = this.getUserId();

      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      await deleteDoc(doc(db, 'users', userId, 'holidays', holidayId));
    } catch (error) {
      console.log('Firebase removeHoliday failed, falling back to local storage:', error);
      const holidays = await this.getLocalHolidays();
      const filtered = holidays.filter(h => h.id !== holidayId);
      await this.saveLocalHolidays(filtered);
    }
  }

  public subscribeToHolidays(callback: (holidays: Holiday[]) => void): () => void {
    if (!isFirebaseInitialized) {
      console.log('Using local storage for holidays subscription');
      this.holidaysCallbacks.push(callback);

      // Load initial data
      this.getLocalHolidays().then(holidays => {
        callback(holidays);
      });

      // Return unsubscribe function
      return () => {
        const index = this.holidaysCallbacks.indexOf(callback);
        if (index > -1) {
          this.holidaysCallbacks.splice(index, 1);
        }
      };
    }

    try {
      const userId = this.getUserId();

      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      const q = query(
        collection(db, 'users', userId, 'holidays'),
        orderBy('timestamp', 'desc')
      );

      this.holidaysUnsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const holidays: Holiday[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          const data: any = docSnap.data();
          return {
            ...data,
            id: data.id ?? docSnap.id,
            timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
          };
        });
        callback(holidays);
      });

      return () => {
        if (this.holidaysUnsubscribe) {
          this.holidaysUnsubscribe();
          this.holidaysUnsubscribe = null;
        }
      };
    } catch (error) {
      console.log('Firebase subscription failed, falling back to local storage:', error);
      this.holidaysCallbacks.push(callback);
      this.getLocalHolidays().then(holidays => callback(holidays));
      return () => {
        const index = this.holidaysCallbacks.indexOf(callback);
        if (index > -1) {
          this.holidaysCallbacks.splice(index, 1);
        }
      };
    }
  }

  public unsubscribeAll(): void {
    if (this.checkInsUnsubscribe) {
      this.checkInsUnsubscribe();
      this.checkInsUnsubscribe = null;
    }
    if (this.holidaysUnsubscribe) {
      this.holidaysUnsubscribe();
      this.holidaysUnsubscribe = null;
    }
    // Clear local callbacks
    this.checkInsCallbacks = [];
    this.holidaysCallbacks = [];
  }
}

export default FirestoreSync;