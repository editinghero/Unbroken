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
  