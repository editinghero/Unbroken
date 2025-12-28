import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Calendar, TrendingUp, Check, Award } from 'lucide-react-native';
import { useGymCheckIns } from '@/contexts/GymCheckInContext';
import { useState, useRef, useEffect } from 'react';
import HapticManager from '@/services/HapticManager';
import { router } from 'expo-router';
import { getCurrentLocalDateString } from '@/utils/dateUtils';
import { GoogleSyncButton } from '@/components/GoogleSyncButton';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { checkIn, hasCheckedInToday, stats, isLoading, removeCheckIn } = useGymCheckIns();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRemovalSuccess, setShowRemovalSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const removalSuccessAnim = useRef(new Animated.Value(0)).current;
  const hapticManager = HapticManager.getInstance();
  const insets = useSafeAreaInsets();

  const weekDenominator = 7 - stats.thisWeekHolidays;
  const thisWeekPercentage = weekDenominator > 0 ? Math.round((stats.thisWeekCheckIns / weekDenominator) * 100) : 0;

  const thisMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthDenominator = thisMonthDays - stats.thisMonthHolidays;
  const thisMonthPercentage = monthDenominator > 0 ? Math.round((stats.thisMonthCheckIns / monthDenominator) * 100) : 0;

  useEffect(() => {
    if (showSuccess) {
      Animated.sequence([
        Animated.spring(successAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSuccess(false));
    }
  }, [showSuccess, successAnim]);

  useEffect(() => {
    if (showRemovalSuccess) {
      Animated.sequence([
        Animated.spring(removalSuccessAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(removalSuccessAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowRemovalSuccess(false));
    }
  }, [showRemovalSuccess, removalSuccessAnim]);

  const handleCheckIn = () => {
    if (hasCheckedInToday) {
      if (Platform.OS === 'web') {
        const shouldRemove = window.confirm('You have already checked in today. Would you like to remove this check-in?');
        if (!shouldRemove) {
          hapticManager.triggerButton();
          return;
        }
      } else {
        const Alert = require('react-native').Alert;
        Alert.alert(
          'Remove Check-In',
          'You have already checked in today. Would you like to remove this check-in?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                hapticManager.triggerButton();
              }
            },
            {
              text: 'Remove Check-In',
              style: 'destructive',
              onPress: () => {
                performRemoval();
              }
            }
          ]
        );
        return;
      }

      performRemoval();
      return;
    }

    hapticManager.triggerCheckIn();

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    const success = checkIn();
    if (success) {
      hapticManager.triggerNotificationFeedback('success');
      setShowSuccess(true);
    }
  };

  const performRemoval = () => {
    const today = getCurrentLocalDateString();

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    removeCheckIn(today);
    hapticManager.triggerRemoval();
    setShowRemovalSuccess(true);
  };

  if (isLoading) {
    return (
      <View style={styles.container} />
    );
  }

  return (
    <LinearGradient
      colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Unbroken</Text>
            <Text style={styles.headerSubtitle}>Stay consistent, stay strong</Text>
          </View>
          <GoogleSyncButton size="small" showText={false} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.streakSection}>
            <View style={styles.streakCard}>
              <View style={styles.streakIconContainer}>
                <Flame size={40} color={colors.gold} strokeWidth={2.5} />
              </View>
              <Text style={styles.streakNumber}>{stats.currentStreak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.longestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totalCheckIns}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
            </View>
          </View>

          <View style={styles.checkInSection}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.checkInButton,
                  hasCheckedInToday && styles.checkInButtonChecked,
                ]}
                onPress={handleCheckIn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={hasCheckedInToday ? [colors.goldLight, colors.gold] : [colors.goldLight, colors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.checkInGradient}
                >
                  {hasCheckedInToday ? (
                    <>
                      <Check size={48} color="#ffffff" strokeWidth={3} />
                      <Text style={[styles.checkInText, { color: '#000000' }]}>Checked In!</Text>
                      <Text style={[styles.checkInSubtext, { color: '#000000' }]}>Tap to remove check-in</Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.checkInIcon}>
                        <View style={styles.checkInIconInner} />
                      </View>
                      <Text style={styles.checkInText}>Check In</Text>
                      <Text style={styles.checkInSubtext}>Tap to log today&apos;s visit</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {showSuccess && (
              <Animated.View
                style={[
                  styles.successBanner,
                  {
                    opacity: successAnim,
                    transform: [
                      {
                        translateY: successAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[colors.goldLight, colors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.successGradient}
                >
                  <Check size={20} color="#000" strokeWidth={3} />
                  <Text style={styles.successText}>Great work! Keep it up! 💪</Text>
                </LinearGradient>
              </Animated.View>
            )}

            {showRemovalSuccess && (
              <Animated.View
                style={[
                  styles.removalSuccessBanner,
                  {
                    opacity: removalSuccessAnim,
                    transform: [
                      {
                        translateY: removalSuccessAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#ff6b6b', '#ee5a52']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.successGradient}
                >
                  <Text style={styles.removalSuccessText}>Check-in removed ✓</Text>
                </LinearGradient>
              </Animated.View>
            )}
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Statistics</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCardMedium}>
                <View style={styles.statIconContainer}>
                  <Flame size={28} color={colors.gold} strokeWidth={2.5} />
                </View>
                <Text style={styles.statNumberMedium}>{stats.currentStreak}</Text>
                <Text style={styles.statLabelMedium}>Current Streak</Text>
                <Text style={styles.statDescription}>Days in a row</Text>
              </View>

              <View style={styles.statCardMedium}>
                <View style={styles.statIconContainer}>
                  <Award size={28} color={colors.gold} strokeWidth={2.5} />
                </View>
                <Text style={styles.statNumberMedium}>{stats.longestStreak}</Text>
                <Text style={styles.statLabelMedium}>Best Streak</Text>
                <Text style={styles.statDescription}>Personal record</Text>
              </View>

              <View style={styles.statCardMedium}>
                <View style={styles.statIconContainer}>
                  <Calendar size={28} color={colors.gold} strokeWidth={2.5} />
                </View>
                <Text style={styles.statNumberMedium}>{stats.totalCheckIns}</Text>
                <Text style={styles.statLabelMedium}>Total Check-Ins</Text>
                <Text style={styles.statDescription}>All time visits</Text>
              </View>
            </View>

            <View style={styles.performanceSection}>
              <View style={styles.performanceCard}>
                <View style={styles.performanceHeader}>
                  <TrendingUp size={18} color={colors.gold} strokeWidth={2} />
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
                {stats.thisWeekHolidays > 0 && (
                  <Text style={styles.holidayNote}>{stats.thisWeekHolidays} holidays excluded</Text>
                )}
              </View>

              <View style={styles.performanceCard}>
                <View style={styles.performanceHeader}>
                  <Calendar size={18} color={colors.gold} strokeWidth={2} />
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
                {stats.thisMonthHolidays > 0 && (
                  <Text style={styles.holidayNote}>{stats.thisMonthHolidays} holidays excluded</Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.bottomNavContent}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                hapticManager.triggerNavigation();
                router.push('/calendar');
              }}
            >
              <Calendar size={20} color={colors.gold} strokeWidth={2} />
              <Text style={styles.navButtonText}>Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                hapticManager.triggerNavigation();
                router.push('/stats');
              }}
            >
              <TrendingUp size={20} color={colors.gold} strokeWidth={2} />
              <Text style={styles.navButtonText}>Stats</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.goldLight,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '400' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
  },
  streakSection: {
    marginBottom: 24,
    marginTop: 16,
  },
  streakCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 8,
    }),
  },
  streakIconContainer: {
    marginBottom: 8,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 4,
  },
  streakLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 6,
    }),
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  checkInSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  checkInButton: {
    width: width - 40,
    aspectRatio: 1,
    maxWidth: 260,
    maxHeight: 260,
    borderRadius: 1000,
    overflow: 'hidden',
    ...(Platform.OS === 'android' && {
      elevation: 8,
    }),
  },
  checkInButtonChecked: {
  },
  checkInGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  checkInIconInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
  },
  checkInText: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#000000',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  checkInSubtext: {
    fontSize: 14,
    color: '#000000',
    marginTop: 4,
    fontWeight: '600' as const,
    opacity: 0.75,
  },
  successBanner: {
    borderRadius: 16,
    marginTop: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'android' && {
      elevation: 4,
    }),
  },
  successGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  successText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  removalSuccessBanner: {
    borderRadius: 16,
    marginTop: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'android' && {
      elevation: 4,
    }),
  },
  removalSuccessText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  statsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statCardMedium: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 4,
    }),
  },
  statNumberMedium: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 4,
  },
  statLabelMedium: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  statDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '400' as const,
  },
  performanceSection: {
    gap: 12,
  },
  performanceCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  performanceTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  performanceContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  performanceNumber: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: colors.text,
  },
  performanceSeparator: {
    fontSize: 20,
    fontWeight: '500' as const,
    color: colors.textTertiary,
    marginHorizontal: 6,
  },
  performanceTotal: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  holidayNote: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500' as const,
    marginTop: 4,
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 3,
  },
});
