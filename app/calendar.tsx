import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurViewOptimized } from '@/components/BlurViewOptimized';
import { colors } from '@/constants/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useGymCheckIns } from '@/contexts/GymCheckInContext';
import { ChevronLeft, Check, Moon, Calendar, TrendingUp, ChevronRight } from 'lucide-react-native';
import HapticManager from '@/services/HapticManager';
import { useState } from 'react';
import { getCurrentLocalDateString, getLocalDateString, createLocalDate } from '@/utils/dateUtils';

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: { date: string; day: number; isCurrentMonth: boolean; dayOfWeek: number }[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
    days.push({
      date: getLocalDateString(prevMonthDay),
      day: prevMonthDay.getDate(),
      isCurrentMonth: false,
      dayOfWeek: prevMonthDay.getDay(),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      date: getLocalDateString(date),
      day,
      isCurrentMonth: true,
      dayOfWeek: date.getDay(),
    });
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonthDay = new Date(year, month + 1, i);
    days.push({
      date: getLocalDateString(nextMonthDay),
      day: nextMonthDay.getDate(),
      isCurrentMonth: false,
      dayOfWeek: nextMonthDay.getDay(),
    });
  }

  return days;
}

export default function CalendarScreen() {
  const { checkIns, holidays, addHoliday, removeHoliday, removeCheckIn, addCheckIn } = useGymCheckIns();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const hapticManager = HapticManager.getInstance();
  const insets = useSafeAreaInsets();

  const checkInDates = new Set(checkIns.map(c => c.date));
  const holidayDates = new Set(holidays.map(h => h.date));
  
  const todayStr = getCurrentLocalDateString();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateToPreviousMonth = () => {
    hapticManager.triggerButton();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const navigateToNextMonth = () => {
    hapticManager.triggerButton();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const navigateToCurrentMonth = () => {
    hapticManager.triggerButton();
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const calendarDays = getCalendarDays(currentYear, currentMonth);

  const handleDayPress = (dayInfo: { date: string; isCurrentMonth: boolean }) => {
    if (!dayInfo.isCurrentMonth) return;

    const hasCheckIn = checkInDates.has(dayInfo.date);
    const isHoliday = holidayDates.has(dayInfo.date);
    const selectedDate = createLocalDate(dayInfo.date);
    const todayDate = createLocalDate(todayStr);
    
    const isPastOrToday = selectedDate <= todayDate;
    const isFuture = selectedDate > todayDate;

    hapticManager.triggerCalendar();

    if (hasCheckIn) {
      if (Platform.OS === 'web') {
        const shouldRemove = window.confirm('What would you like to do with this check-in?\n\nClick OK to remove check-in, Cancel to keep it.');
        if (shouldRemove) {
          removeCheckIn(dayInfo.date);
          hapticManager.triggerRemoval();
        }
      } else {
        const Alert = require('react-native').Alert;
        Alert.alert(
          'Edit Check-In',
          'What would you like to do with this check-in?',
          [
            {
              text: 'Remove Check-In',
              style: 'destructive',
              onPress: () => {
                removeCheckIn(dayInfo.date);
                hapticManager.triggerRemoval();
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
    } else if (isHoliday) {
      removeHoliday(dayInfo.date);
      hapticManager.triggerSelection();
    } else {
      if (isFuture) {
        addHoliday(dayInfo.date);
        hapticManager.triggerSelection();
      } else if (isPastOrToday) {
        if (Platform.OS === 'web') {
          const choice = window.confirm('Add activity for this day?\n\nClick OK to add Check-In, Cancel to add Holiday.');
          if (choice) {
            addCheckIn(dayInfo.date);
            hapticManager.triggerSuccess();
          } else {
            addHoliday(dayInfo.date);
            hapticManager.triggerSelection();
          }
        } else {
          const Alert = require('react-native').Alert;
          Alert.alert(
            'Add Activity',
            'What would you like to add for this day?',
            [
              {
                text: 'Add Check-In',
                onPress: () => {
                  addCheckIn(dayInfo.date);
                  hapticManager.triggerSuccess();
                }
              },
              {
                text: 'Add Holiday',
                onPress: () => {
                  addHoliday(dayInfo.date);
                  hapticManager.triggerSelection();
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }
      }
    }
  };

  return (
    <LinearGradient
      colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: 'Calendar',
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => {
              hapticManager.triggerNavigation();
              router.push('/');
            }} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          ),
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.calendarCard}>
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={navigateToPreviousMonth} style={styles.monthNavButton}>
                <ChevronLeft size={20} color={colors.gold} strokeWidth={2} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={navigateToCurrentMonth} style={styles.monthTitleContainer}>
                <Text style={styles.monthTitle}>{monthNames[currentMonth]} {currentYear}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={navigateToNextMonth} style={styles.monthNavButton}>
                <ChevronRight size={20} color={colors.gold} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              <View style={styles.weekDaysRow}>
                {weekDays.map((day, index) => (
                  <View key={day} style={styles.weekDayCell}>
                    <Text style={[styles.weekDayText, index === 0 && styles.weekDaySunday]}>{day}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {Array.from({ length: 6 }, (_, weekIndex) => (
                  <View key={weekIndex} style={styles.weekRow}>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const dayInfoIndex = weekIndex * 7 + dayIndex;
                      if (dayInfoIndex >= calendarDays.length) return null;
                      
                      const dayInfo = calendarDays[dayInfoIndex];
                      const hasCheckIn = checkInDates.has(dayInfo.date);
                      const isHoliday = holidayDates.has(dayInfo.date);
                      const isToday = dayInfo.date === todayStr;
                      const isSunday = dayInfo.dayOfWeek === 0;

                      return (
                        <TouchableOpacity
                          key={dayInfoIndex}
                          style={[
                            styles.dayCell,
                            !dayInfo.isCurrentMonth && styles.dayCellInactive,
                            hasCheckIn && styles.dayCellChecked,
                            isHoliday && !hasCheckIn && styles.dayCellHoliday,
                            isToday && !hasCheckIn && !isHoliday && styles.dayCellToday,
                            isToday && hasCheckIn && styles.dayCellTodayChecked,
                          ]}
                          onPress={() => handleDayPress(dayInfo)}
                          disabled={!dayInfo.isCurrentMonth}
                          activeOpacity={0.7}
                        >
                          {hasCheckIn && (
                            <View style={styles.checkIcon}>
                              <Check size={16} color="#000" strokeWidth={3} />
                            </View>
                          )}
                          {isHoliday && (
                            <View style={styles.holidayIcon}>
                              <Moon size={14} color={colors.textSecondary} strokeWidth={2.5} />
                            </View>
                          )}
                          <Text
                            style={[
                              styles.dayText,
                              !dayInfo.isCurrentMonth && styles.dayTextInactive,
                              isHoliday && styles.dayTextHoliday,
                              isToday && !hasCheckIn && styles.dayTextToday,
                              isSunday && dayInfo.isCurrentMonth && !hasCheckIn && !isHoliday && styles.dayTextSunday,
                              hasCheckIn && styles.dayTextChecked,
                            ]}
                          >
                            {dayInfo.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotChecked]}>
                <Check size={10} color="#000" strokeWidth={3} />
              </View>
              <Text style={styles.legendText}>Check-In</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotHoliday]}>
                <Moon size={9} color={colors.textSecondary} strokeWidth={2.5} />
              </View>
              <Text style={styles.legendText}>Holiday</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotToday]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotSunday]}>
                <Text style={styles.sundayText}>S</Text>
              </View>
              <Text style={styles.legendText}>Sunday</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Past/Today: Tap empty days for options. Future: Tap to add holiday. Tap existing items to remove.
            </Text>
            <Text style={styles.infoSubtext}>
              Sundays auto-added as holidays (removable). Holidays reduce target days in stats.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom + 16 }]}>
          <BlurViewOptimized 
            intensity={80} 
            tint="dark" 
            style={styles.bottomNavContent}
          >
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                hapticManager.triggerNavigation();
                router.push('/calendar');
              }}
            >
              <Calendar size={24} color={colors.gold} strokeWidth={2} />
              <Text style={styles.navButtonText}>Calendar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                hapticManager.triggerNavigation();
                router.push('/stats');
              }}
            >
              <TrendingUp size={24} color={colors.gold} strokeWidth={2} />
              <Text style={styles.navButtonText}>Stats</Text>
            </TouchableOpacity>
          </BlurViewOptimized>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 140,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 6,
    }),
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  calendarContainer: {
    width: '100%',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  weekDaySunday: {
    color: colors.sunday,
    fontWeight: '700' as const,
  },
  calendarGrid: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'relative',
    minHeight: 48,
  },
  dayCellInactive: {
    opacity: 0.3,
  },
  dayCellChecked: {
    backgroundColor: colors.gold,
  },
  dayCellHoliday: {
    backgroundColor: colors.surfaceSecondary,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  dayCellTodayChecked: {
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.goldLight,
  },
  checkIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  holidayIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  dayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dayTextInactive: {
    color: colors.textTertiary,
  },
  dayTextChecked: {
    color: '#000',
    fontWeight: '700' as const,
  },
  dayTextHoliday: {
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
  dayTextToday: {
    color: '#ffffff',
    fontWeight: '700' as const,
  },
  dayTextSunday: {
    color: colors.sunday,
    fontWeight: '700' as const,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDotChecked: {
    backgroundColor: colors.gold,
  },
  legendDotHoliday: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendDotToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  legendDotSunday: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.sunday,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sundayText: {
    color: colors.sunday,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  infoCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 2,
    }),
  },
  infoText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
    textAlign: 'center',
  },
  infoSubtext: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400' as const,
    textAlign: 'center',
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 169, 129, 0.3)',
  },
  bottomNavContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 4,
  },
});
