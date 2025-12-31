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
  
  // Calculate actual working days (excluding Sundays)
  let workingDays = 0;
  for (let i = 0; i <= 6; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(startDate.getDate() + i);
    if (checkDate.getDay() !== 0) { // Not Sunday
      workingDays++;
    }
  }
  
  return {
    startDate,
    endDate,
    workingDays,
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