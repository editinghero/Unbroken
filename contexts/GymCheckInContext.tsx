import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { getCurrentLocalDateString, getLocalDateString, createLocalDate } from '@/utils/dateUtils';
import FirebaseAuth, { AuthUser } from '@/services/FirebaseAuth';
import FirestoreSync from '@/services/FirestoreSync';

const STORAGE_KEY = 'gym_checkins';
const HOLIDAYS_KEY = 'gym_holidays';

export interface CheckIn {
  id: string;
  date: string;
  timestamp: number;
}

export interface Holiday {
  id: string;
  date: string;
  timestamp: number;
}

export interface CheckInStats {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  thisWeekCheckIns: number;
  thisWeekHolidays: number;
  thisMonthCheckIns: number;
  thisMonthHolidays: number;
}

function getCurrentWeekBoundaries() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.

  // Get Monday of the current week
  const monday = new Date(now);
  const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  // Get Sunday of the current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { startDate: monday, endDate: sunday };
}

function calculateStats(checkIns: CheckIn[], holidays: Holiday[]): CheckInStats {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = new Date();

  const checkInDates = new Set(checkIns.map(c => c.date));
  const holidayDates = new Set(holidays.map(h => h.date));

  const effectiveHolidayDates = new Set(
    Array.from(holidayDates).filter(date => !checkInDates.has(date))
  );

  let currentDate = new Date(today);
  const todayStr = getCurrentLocalDateString();
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  if (checkInDates.has(todayStr) || effectiveHolidayDates.has(todayStr)) {
    currentStreak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  } else if (checkInDates.has(yesterdayStr) || effectiveHolidayDates.has(yesterdayStr)) {
    currentStreak = 1;
    currentDate = yesterdayDate;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (currentStreak > 0) {
    const dateStr = getLocalDateString(currentDate);
    if (checkInDates.has(dateStr) || effectiveHolidayDates.has(dateStr)) {
      currentStreak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  const allDates = Array.from(new Set([...Array.from(checkInDates), ...Array.from(effectiveHolidayDates)])).sort((a, b) =>
    createLocalDate(b).getTime() - createLocalDate(a).getTime()
  );

  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = createLocalDate(allDates[i - 1]);
      const currDate = createLocalDate(allDates[i]);
      const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  const { startDate: weekStart, endDate: weekEnd } = getCurrentWeekBoundaries();

  const thisWeekCheckIns = Array.from(checkInDates).filter(date => {
    const checkInDate = createLocalDate(date);
    return checkInDate >= weekStart && checkInDate <= weekEnd;
  }).length;

  const thisWeekHolidays = Array.from(effectiveHolidayDates).filter(date => {
    const holidayDate = createLocalDate(date);
    return holidayDate >= weekStart && holidayDate <= weekEnd;
  }).length;

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  const thisMonthCheckIns = Array.from(checkInDates).filter(date => {
    const d = createLocalDate(date);
    return d >= monthStart && d <= monthEnd;
  }).length;

  const thisMonthHolidays = Array.from(effectiveHolidayDates).filter(date => {
    const d = createLocalDate(date);
    return d >= monthStart && d <= monthEnd;
  }).length;

  return {
    currentStreak,
    longestStreak,
    totalCheckIns: checkIns.length,
    thisWeekCheckIns,
    thisWeekHolidays,
    thisMonthCheckIns,
    thisMonthHolidays,
  };
}

interface GymCheckInContextType {
  checkIns: CheckIn[];
  holidays: Holiday[];
  stats: CheckInStats;
  hasCheckedInToday: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasSkippedAuth: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  isEmailVerified: () => boolean;
  reloadUser: () => Promise<void>;
  skipAuth: () => void;
  checkIn: () => Promise<boolean>;
  addCheckIn: (date: string) => Promise<boolean>;
  removeCheckIn: (date: string) => Promise<void>;
  addHoliday: (date: string) => Promise<boolean>;
  removeHoliday: (date: string) => Promise<void>;
}

const GymCheckInContext = createContext<GymCheckInContextType | undefined>(undefined);

export function GymCheckInProvider({ children }: { children: ReactNode }) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [hasSkippedAuth, setHasSkippedAuth] = useState(false);

  const firebaseAuth = FirebaseAuth.getInstance();
  const firestoreSync = FirestoreSync.getInstance();

  const checkInsQuery = useQuery({
    queryKey: ['gym-checkins'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !user,
  });

  const holidaysQuery = useQuery({
    queryKey: ['gym-holidays'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(HOLIDAYS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !user,
  });

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      if (checkInsQuery.data) setCheckIns(checkInsQuery.data);
      if (holidaysQuery.data) setHolidays(holidaysQuery.data);
      return;
    }

    const unsubscribeCheckIns = firestoreSync.subscribeToCheckIns(setCheckIns);
    const unsubscribeHolidays = firestoreSync.subscribeToHolidays(setHolidays);

    return () => {
      unsubscribeCheckIns();
      unsubscribeHolidays();
    };
  }, [user, checkInsQuery.data, holidaysQuery.data]);

  useEffect(() => {
    if (isLoading) return;

    const initSundays = async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const storageKey = `sundays_initialized_v3_${currentYear}_${currentMonth}`;

      try {
        const isInitialized = await AsyncStorage.getItem(storageKey);
        if (isInitialized === 'true') return;

        const sundays: string[] = [];
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Add all Sundays of the current month
        for (let day = 1; day <= lastDay; day++) {
          const date = new Date(currentYear, currentMonth, day);
          if (date.getDay() === 0) {
            sundays.push(getLocalDateString(date));
          }
        }

        // Also check the next 7 days to cover week rollover
        for (let i = 1; i <= 7; i++) {
          const nextDate = new Date(currentYear, currentMonth, lastDay + i);
          if (nextDate.getDay() === 0) {
            const dateStr = getLocalDateString(nextDate);
            if (!sundays.includes(dateStr)) {
              sundays.push(dateStr);
            }
          }
        }

        const existingHolidayDates = new Set(holidays.map(h => h.date));
        const existingCheckInDates = new Set(checkIns.map(c => c.date));

        const newSundayHolidays = sundays.filter(sunday =>
          !existingHolidayDates.has(sunday) && !existingCheckInDates.has(sunday)
        );

        if (newSundayHolidays.length > 0) {
          for (const date of newSundayHolidays) {
            await addHoliday(date);
          }
        }

        await AsyncStorage.setItem(storageKey, 'true');
      } catch (error) {
        console.error('Failed to initialize Sunday holidays:', error);
      }
    };

    initSundays();
  }, [isLoading, user]);

  const signUp = async (email: string, password: string): Promise<void> => {
    setAuthLoading(true);
    try {
      await firebaseAuth.signUp(email, password);
      await migrateLocalDataToFirestore();
    } finally {
      setAuthLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setAuthLoading(true);
    try {
      await firebaseAuth.signIn(email, password);
      await migrateLocalDataToFirestore();
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setAuthLoading(true);
    try {
      await firebaseAuth.signOut();
      firestoreSync.unsubscribeAll();
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await firebaseAuth.resetPassword(email);
  };

  const sendEmailVerification = async (): Promise<void> => {
    await firebaseAuth.sendEmailVerification();
  };

  const isEmailVerified = (): boolean => {
    return firebaseAuth.isEmailVerified();
  };

  const reloadUser = async (): Promise<void> => {
    await firebaseAuth.reloadUser();
    setUser(firebaseAuth.getCurrentUser());
  };

  const skipAuth = (): void => {
    setHasSkippedAuth(true);
  };

  const migrateLocalDataToFirestore = async (): Promise<void> => {
    try {
      const localCheckIns = await AsyncStorage.getItem(STORAGE_KEY);
      const localHolidays = await AsyncStorage.getItem(HOLIDAYS_KEY);

      if (localCheckIns) {
        const checkInsData: CheckIn[] = JSON.parse(localCheckIns);
        for (const checkIn of checkInsData) {
          await firestoreSync.addCheckIn(checkIn);
        }
      }

      if (localHolidays) {
        const holidaysData: Holiday[] = JSON.parse(localHolidays);
        for (const holiday of holidaysData) {
          await firestoreSync.addHoliday(holiday);
        }
      }
    } catch (error) {
      console.error('Failed to migrate local data:', error);
    }
  };

  const checkIn = async (): Promise<boolean> => {
    const dateStr = getCurrentLocalDateString();

    if (checkIns.some(c => c.date === dateStr)) return false;

    const newCheckIn: CheckIn = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      timestamp: Date.now(),
    };

    if (user) {
      await firestoreSync.addCheckIn(newCheckIn);
    } else {
      const updated = [...checkIns, newCheckIn];
      setCheckIns(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    return true;
  };

  const addCheckIn = async (date: string): Promise<boolean> => {
    if (checkIns.some(c => c.date === date)) return false;

    const newCheckIn: CheckIn = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      timestamp: Date.now(),
    };

    if (user) {
      await firestoreSync.addCheckIn(newCheckIn);
    } else {
      const updated = [...checkIns, newCheckIn];
      setCheckIns(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    return true;
  };

  const removeCheckIn = async (date: string): Promise<void> => {
    const checkInToRemove = checkIns.find(c => c.date === date);
    if (!checkInToRemove) return;

    if (user) {
      await firestoreSync.removeCheckIn(checkInToRemove.id);
    } else {
      const updated = checkIns.filter(c => c.date !== date);
      setCheckIns(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const addHoliday = async (date: string): Promise<boolean> => {
    if (holidays.some(h => h.date === date)) return false;

    const newHoliday: Holiday = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      timestamp: Date.now(),
    };

    if (user) {
      await firestoreSync.addHoliday(newHoliday);
    } else {
      const updated = [...holidays, newHoliday];
      setHolidays(updated);
      await AsyncStorage.setItem(HOLIDAYS_KEY, JSON.stringify(updated));
    }

    return true;
  };

  const removeHoliday = async (date: string): Promise<void> => {
    const holidayToRemove = holidays.find(h => h.date === date);
    if (!holidayToRemove) return;

    if (user) {
      await firestoreSync.removeHoliday(holidayToRemove.id);
    } else {
      const updated = holidays.filter(h => h.date !== date);
      setHolidays(updated);
      await AsyncStorage.setItem(HOLIDAYS_KEY, JSON.stringify(updated));
    }
  };

  const hasCheckedInToday = useMemo(() => {
    const today = getCurrentLocalDateString();
    return checkIns.some(c => c.date === today);
  }, [checkIns]);

  const stats = useMemo(() => calculateStats(checkIns, holidays), [checkIns, holidays]);

  const value = {
    checkIns,
    holidays,
    stats,
    hasCheckedInToday,
    user,
    isAuthenticated: !!user,
    hasSkippedAuth,
    isLoading: isLoading || authLoading,
    isEmailVerified,
    reloadUser,
    signUp,
    signIn,
    signOut,
    resetPassword,
    sendEmailVerification,
    skipAuth,
    checkIn,
    addCheckIn,
    removeCheckIn,
    addHoliday,
    removeHoliday,
  };

  return (
    <GymCheckInContext.Provider value={value}>
      {children}
    </GymCheckInContext.Provider>
  );
}

export function useGymCheckIns() {
  const context = useContext(GymCheckInContext);
  if (context === undefined) {
    throw new Error('useGymCheckIns must be used within a GymCheckInProvider');
  }
  return context;
}
