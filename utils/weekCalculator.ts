export interface WeekBoundaries {
  startDate: Date;
  endDate: Date;
  workingDays: number;
}

export function getWeekBoundaries(date: Date): WeekBoundaries {
  const currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);
  
  const dayOfWeek = currentDate.getDay();
  const daysToSunday = dayOfWeek;
  
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - daysToSunday);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return {
    startDate,
    endDate,
    workingDays: 6,
  };
}

export function getCurrentWeekBoundaries(): WeekBoundaries {
  return getWeekBoundaries(new Date());
}

export function isDateInCurrentWeek(date: Date): boolean {
  const { startDate, endDate } = getCurrentWeekBoundaries();
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate >= startDate && checkDate <= endDate;
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}