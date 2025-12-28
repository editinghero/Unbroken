import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurViewOptimized } from '@/components/BlurViewOptimized';
import { colors } from '@/constants/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useGymCheckIns } from '@/contexts/GymCheckInContext';
import { ChevronLeft, Flame, TrendingUp, Calendar as CalendarIcon, Award } from 'lucide-react-native';
import HapticManager from '@/services/HapticManager';

export default function StatsScreen() {
  const { stats, checkIns, holidays } = useGymCheckIns();
  const hapticManager = HapticManager.getInstance();
  const insets = useSafeAreaInsets();
  
  const weekDenominator = 7 - stats.thisWeekHolidays;
  const thisWeekPercentage = weekDenominator > 0 ? Math.round((stats.thisWeekCheckIns / weekDenominator) * 100) : 0;
  
  const thisMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthDenominator = thisMonthDays - stats.thisMonthHolidays;
  const thisMonthPercentage = monthDenominator > 0 ? Math.round((stats.thisMonthCheckIns / monthDenominator) * 100) : 0;

  return (
    <LinearGradient
      colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
      style={styles.container}
    >
      
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: 'Statistics',
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.statsGrid}>
            <View style={styles.statCardLarge}>
              <View style={styles.statIconContainer}>
                <Flame size={32} color={colors.gold} strokeWidth={2.5} />
              </View>
              <Text style={styles.statNumberLarge}>{stats.currentStreak}</Text>
              <Text style={styles.statLabelLarge}>Current Streak</Text>
              <Text style={styles.statDescription}>Days in a row</Text>
            </View>

            <View style={styles.statCardLarge}>
              <View style={styles.statIconContainer}>
                <Award size={32} color={colors.gold} strokeWidth={2.5} />
              </View>
              <Text style={styles.statNumberLarge}>{stats.longestStreak}</Text>
              <Text style={styles.statLabelLarge}>Best Streak</Text>
              <Text style={styles.statDescription}>Personal record</Text>
            </View>

            <View style={styles.statCardLarge}>
              <View style={styles.statIconContainer}>
                <CalendarIcon size={32} color={colors.gold} strokeWidth={2.5} />
              </View>
              <Text style={styles.statNumberLarge}>{stats.totalCheckIns}</Text>
              <Text style={styles.statLabelLarge}>Total Check-Ins</Text>
              <Text style={styles.statDescription}>All time visits</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Performance</Text>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <TrendingUp size={20} color={colors.gold} strokeWidth={2} />
                <Text style={styles.performanceTitle}>This Week</Text>
              </View>
              <View style={styles.performanceContent}>
                <Text style={styles.performanceNumber}>{stats.thisWeekCheckIns}</Text>
                <Text style={styles.performanceSeparator}>/</Text>
                <Text style={styles.performanceTotal}>{weekDenominator} days</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${thisWeekPercentage}%` }]} />
              </View>
              <View style={styles.performanceBreakdown}>
                <Text style={styles.performancePercentage}>{thisWeekPercentage}% completed</Text>
                {stats.thisWeekHolidays > 0 && (
                  <Text style={styles.performanceBreakdownText}>
                    {stats.thisWeekCheckIns} check-ins • {stats.thisWeekHolidays} holidays excluded
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <CalendarIcon size={20} color={colors.gold} strokeWidth={2} />
                <Text style={styles.performanceTitle}>This Month</Text>
              </View>
              <View style={styles.performanceContent}>
                <Text style={styles.performanceNumber}>{stats.thisMonthCheckIns}</Text>
                <Text style={styles.performanceSeparator}>/</Text>
                <Text style={styles.performanceTotal}>{monthDenominator} days</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${thisMonthPercentage}%` }]} />
              </View>
              <View style={styles.performanceBreakdown}>
                <Text style={styles.performancePercentage}>{thisMonthPercentage}% completed</Text>
                {stats.thisMonthHolidays > 0 && (
                  <Text style={styles.performanceBreakdownText}>
                    {stats.thisMonthCheckIns} check-ins • {stats.thisMonthHolidays} holidays excluded
                  </Text>
                )}
              </View>
            </View>
          </View>

          {checkIns.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Check-Ins</Text>
              {checkIns
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((checkIn) => {
                  const date = new Date(checkIn.date);
                  const dateStr = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                  
                  return (
                    <View key={checkIn.id} style={styles.historyItem}>
                      <View style={styles.historyDot} />
                      <View style={styles.historyContent}>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                        <Text style={styles.historyDay}>{dayName}</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}

          {holidays.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Holidays</Text>
              {holidays
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((holiday) => {
                  const date = new Date(holiday.date);
                  const dateStr = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                  
                  return (
                    <View key={holiday.id} style={styles.historyItem}>
                      <View style={styles.holidayDot} />
                      <View style={styles.historyContent}>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                        <Text style={styles.historyDay}>{dayName}</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom + 16 }]}>
          <BlurViewOptimized 
            intensity={40} 
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
              <CalendarIcon size={24} color={colors.gold} strokeWidth={2} />
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
    paddingBottom: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 32,
  },
  statCardLarge: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 6,
    }),
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statNumberLarge: {
    fontSize: 48,
    fontWeight: '900' as const,
    color: colors.text,
    marginTop: 4,
  },
  statLabelLarge: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  statDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.text,
    marginBottom: 16,
  },
  performanceCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 4,
    }),
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  performanceContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  performanceNumber: {
    fontSize: 36,
    fontWeight: '900' as const,
    color: colors.text,
  },
  performanceSeparator: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.textTertiary,
    marginHorizontal: 8,
  },
  performanceTotal: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 4,
  },
  performanceBreakdown: {
    gap: 4,
  },
  performancePercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
  performanceBreakdownText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500' as const,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
    marginRight: 16,
  },
  holidayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  historyDay: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
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
