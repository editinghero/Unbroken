import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import type { CheckIn, CheckInStats, Holiday } from '@/types/checkin';
import { getCurrentWeekBoundaries } from '@/utils/weekCalculator';
import { getCurrentLocalDateString, getLocalDateString, createLocalDate } from '@/utils/dateUtils';
import GoogleDriveSync from '@/services/GoogleDriveSync';

const STORAGE_KEY = 'gym_checkins';
const HOLIDAYS_KEY = 'gym_holidays';

function calculateStats(checkIns: CheckIn[], holidays: Holiday[]): CheckInStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const checkInDates = new Set(checkIns.map(c => c.date));
  const holidayDates = new Set(holidays.map(h => h.date));
  
  let currentDate = new Date(today);
  const todayStr = getCurrentLocalDateString();
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);
  
  if (checkInDates.has(todayStr) || holidayDates.has(todayStr)) {
    currentStreak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  } else if (checkInDates.has(yesterdayStr) || holidayDates.has(yesterdayStr)) {
    currentStreak = 1;
    currentDate = yesterdayDate;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  while (currentStreak > 0) {
    const dateStr = getLocalDateString(currentDate);
    if (checkInDates.has(dateStr) || holidayDates.has(dateStr)) {
      currentStreak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  const allDates = Array.from(new Set([...Array.from(checkInDates), ...Array.from(holidayDates)])).sort((a, b) => 
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
  const thisWeekCheckIns = checkIns.filter(c => {
    const checkInDate = createLocalDate(c.date);
    return checkInDate >= weekStart && checkInDate <= weekEnd;
  }).length;
  const thisWeekHolidays = holidays.filter(h => {
    const holidayDate = createLocalDate(h.date);
    return holidayDate >= weekStart && holidayDate <= weekEnd;
  }).length;

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthCheckIns = checkIns.filter(c => 
    createLocalDate(c.date) >= monthStart
  ).length;
  const thisMonthHolidays = holidays.filter(h => 
    createLocalDate(h.date) >= monthStart
  ).length;

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

export const [GymCheckInProvider, useGymCheckIns] = createContextHook(() => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const googleSync = GoogleDriveSync.getInstance();

  const checkInsQuery = useQuery({
    queryKey: ['gym-checkins'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const holidaysQuery = useQuery({
    queryKey: ['gym-holidays'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(HOLIDAYS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newCheckIns: CheckIn[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCheckIns));
      return newCheckIns;
    },
    onSuccess: () => {
      checkInsQuery.refetch();
    },
  });

  const saveHolidaysMutation = useMutation({
    mutationFn: async (newHolidays: Holiday[]) => {
      await AsyncStorage.setItem(HOLIDAYS_KEY, JSON.stringify(newHolidays));
      return newHolidays;
    },
  });

  useEffect(() => {
    if (checkInsQuery.data) {
      setCheckIns(checkInsQuery.data);
    }
  }, [checkInsQuery.data]);

  useEffect(() => {
    if (holidaysQuery.data) {
      setHolidays(holidaysQuery.data);
    }
  }, [holidaysQuery.data]);

  useEffect(() => {
    googleSync.initialize().then(() => {
      setIsGoogleSignedIn(googleSync.isSignedIn());
    });
  }, []);

  useEffect(() => {
    if (checkInsQuery.data && holidaysQuery.data && !checkInsQuery.isLoading && !holidaysQuery.isLoading) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      
      const sundays: string[] = [];
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date.getDay() === 0) {
          sundays.push(getLocalDateString(date));
        }
      }
      
      const existingHolidayDates = new Set(holidays.map(h => h.date));
      const existingCheckInDates = new Set(checkIns.map(c => c.date));
      
      const newSundayHolidays = sundays.filter(sunday => 
        !existingHolidayDates.has(sunday) && !existingCheckInDates.has(sunday)
      );
      
      if (newSundayHolidays.length > 0) {
        const newHolidays = newSundayHolidays.map(date => ({
          id: `sunday-${date}`,
          date,
          timestamp: Date.now(),
        }));
        
        const updatedHolidays = [...holidays, ...newHolidays];
        setHolidays(updatedHolidays);
        saveHolidaysMutation.mutate(updatedHolidays);
      }
    }
  }, [checkInsQuery.data, holidaysQuery.data, checkInsQuery.isLoading, holidaysQuery.isLoading]);

  const checkIn = () => {
    const dateStr = getCurrentLocalDateString();
    
    const existingCheckIn = checkIns.find(c => c.date === dateStr);
    if (existingCheckIn) {
      return false;
    }

    const newCheckIn: CheckIn = {
      id: Date.now().toString(),
      date: dateStr,
      timestamp: Date.now(),
    };

    const updated = [...checkIns, newCheckIn];
    setCheckIns(updated);
    saveMutation.mutate(updated);
    return true;
  };

  const addHoliday = (date: string) => {
    const existingHoliday = holidays.find(h => h.date === date);
    if (existingHoliday) {
      return false;
    }

    const newHoliday: Holiday = {
      id: Date.now().toString(),
      date,
      timestamp: Date.now(),
    };

    const updated = [...holidays, newHoliday];
    setHolidays(updated);
    saveHolidaysMutation.mutate(updated);
    return true;
  };

  const removeHoliday = (date: string) => {
    const updated = holidays.filter(h => h.date !== date);
    setHolidays(updated);
    saveHolidaysMutation.mutate(updated);
  };

  const addCheckIn = (date: string) => {
    const existingCheckIn = checkIns.find(c => c.date === date);
    if (existingCheckIn) {
      return false;
    }

    const newCheckIn: CheckIn = {
      id: Date.now().toString(),
      date,
      timestamp: Date.now(),
    };

    const updated = [...checkIns, newCheckIn];
    setCheckIns(updated);
    saveMutation.mutate(updated);
    return true;
  };

  const removeCheckIn = (date: string) => {
    const updated = checkIns.filter(c => c.date !== date);
    setCheckIns(updated);
    saveMutation.mutate(updated);
  };

  const hasCheckedInToday = useMemo(() => {
    const today = getCurrentLocalDateString();
    return checkIns.some(c => c.date === today);
  }, [checkIns]);

  const signInToGoogle = async (): Promise<boolean> => {
    try {
      const success = await googleSync.signIn();
      setIsGoogleSignedIn(success);
      if (success) {
        await syncWithGoogle();
      }
      return success;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return false;
    }
  };

  const signOutFromGoogle = async (): Promise<void> => {
    try {
      await googleSync.signOut();
      setIsGoogleSignedIn(false);
    } catch (error) {
      console.error('Google sign-out failed:', error);
    }
  };

  const syncWithGoogle = async (): Promise<boolean> => {
    if (!isGoogleSignedIn) return false;

    try {
      setIsSyncing(true);
      const result = await googleSync.syncData(checkIns, holidays);
      
      if (result.synced) {
        setCheckIns(result.checkIns);
        setHolidays(result.holidays);
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result.checkIns));
        await AsyncStorage.setItem(HOLIDAYS_KEY, JSON.stringify(result.holidays));
        
        checkInsQuery.refetch();
        holidaysQuery.refetch();
      }
      
      return result.synced;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const stats = useMemo(() => calculateStats(checkIns, holidays), [checkIns, holidays]);

  return {
    checkIns,
    holidays,
    checkIn,
    addCheckIn,
    addHoliday,
    removeHoliday,
    removeCheckIn,
    hasCheckedInToday,
    stats,
    isLoading: checkInsQuery.isLoading || holidaysQuery.isLoading,
    signInToGoogle,
    signOutFromGoogle,
    syncWithGoogle,
    isGoogleSignedIn,
    isSyncing,
  };
});
