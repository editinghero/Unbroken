export function getWorkingDaysInMonth(year: number, month: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() !== 0) { // Not Sunday
      workingDays++;
    }
  }
  
  return workingDays;
}

export function getCurrentMonthWorkingDays(): number {
  const now = new Date();
  return getWorkingDaysInMonth(now.getFullYear(), now.getMonth());
}