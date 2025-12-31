import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, ScrollView, Platform, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Calendar, TrendingUp, Check, Award, LogOut, Menu, Mail, RefreshCw } from 'lucide-react-native';
import { useGymCheckIns } from '@/contexts/GymCheckInContext';
import { useState, useRef, useEffect } from 'react';
import HapticManager from '@/services/HapticManager';
import { router } from 'expo-router';
import { getCurrentLocalDateString } from '@/utils/dateUtils';
import { AuthForm } from '@/components/AuthForm';
import { ScreenWrapper } from '@/components/ScreenWrapper';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const {
    checkIn,
    hasCheckedInToday,
    stats,
    isLoading,
    removeCheckIn,
    isAuthenticated,
    hasSkippedAuth,
    signUp,
    signIn,
    signOut,
    resetPassword,
    sendEmailVerification,
    isEmailVerified,
    reloadUser,
    skipAuth
  } = useGymCheckIns();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRemovalSuccess, setShowRemovalSuccess] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const removalSuccessAnim = useRef(new Animated.Value(0)).current;
  const hapticManager = HapticManager.getInstance();
  const insets = useSafeAreaInsets();

  const weekDenominator = 7 - stats.thisWeekHolidays;
  const thisWeekPercentage = weekDenominator > 0 ? Math.round((stats.thisWeekCheckIns / weekDenominator) * 100) : 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthDenominator = daysInMonth - stats.thisMonthHolidays;
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

  const handleCheckIn = async () => {
    if (hasCheckedInToday) {
      if (Platform.OS === 'web') {
        const shouldRemove = window.confirm('You have already checked in today. Would you like to remove this check-in?');
        if (!shouldRemove) {
          hapticManager.triggerButton();
          return;
        }
      } else {
        Alert.alert(
          'Already Checked In',
          'You have already checked in today. Would you like to remove this check-in?',
          [
            {
              text: 'Keep It',
              style: 'cancel',
              onPress: () => hapticManager.triggerButton(),
            },
            {
              text: 'Remove Check-In',
              style: 'destructive',
              onPress: async () => {
                hapticManager.triggerRemoval();
                await removeCheckIn(getCurrentLocalDateString());
                setShowRemovalSuccess(true);
              },
            },
          ]
        );
        return;
      }

      hapticManager.triggerRemoval();
      await removeCheckIn(getCurrentLocalDateString());
      setShowRemovalSuccess(true);
      return;
    }

    hapticManager.triggerSuccess();

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    await checkIn();
    setShowSuccess(true);
  };

  const handleCheckVerification = async () => {
    hapticManager.triggerButton();
    try {
      await reloadUser();
      if (isEmailVerified()) {
        if (Platform.OS === 'web') {
          window.alert('Success! Your email is verified.');
        } else {
          Alert.alert('Success', 'Your email is verified.');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert('Email not verified yet. Please check your inbox.');
        } else {
          Alert.alert('Not Verified', 'Email not verified yet. Please check your inbox.');
        }
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handleResendVerification = async () => {
    hapticManager.triggerButton();
    try {
      await sendEmailVerification();
      if (Platform.OS === 'web') {
        window.alert('Verification Email Sent. Please check your inbox.');
      } else {
        Alert.alert('Verification Email Sent', 'Please check your inbox.');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  if ((!isAuthenticated && !hasSkippedAuth) || showAuthForm) {
    return (
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.authHeader}>
            <Text style={styles.headerTitle}>Unbroken</Text>
            <Text style={styles.headerSubtitle}>Stay consistent, stay strong</Text>
          </View>
          <AuthForm
            onSignUp={signUp}
            onSignIn={signIn}
            onResetPassword={resetPassword}
            onSkip={() => {
              skipAuth();
              setShowAuthForm(false);
            }}
            isLoading={isLoading}
            onSendEmailVerification={sendEmailVerification}
            showEmailVerificationPrompt={isAuthenticated && !isEmailVerified()}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 90 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.streakSection}>
              <View style={styles.glowWrapper}>
                <BlurView
                  intensity={40}
                  tint="dark"
                  experimentalBlurMethod="dimezisBlurView"
                  style={[
                    styles.streakCard,
                    Platform.OS === 'web' && {
                      backdropFilter: 'blur(12px)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)'
                    } as any
                  ]}
                >
                  <View style={styles.streakIconContainer}>
                    <Flame size={40} color={colors.gold} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.streakNumber}>{stats.currentStreak}</Text>
                  <Text style={styles.streakLabel}>Day Streak</Text>
                </BlurView>
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
                        <Text style={[styles.checkInText, { color: '#ffffff' }]}>Checked In!</Text>
                        <Text style={[styles.checkInSubtext, { color: '#ffffff' }]}>Tap to remove check-in</Text>
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
                <View style={[styles.glowWrapper, { flex: 1 }]}>
                  <BlurView
                    intensity={30}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={[
                      styles.statCardMedium,
                      Platform.OS === 'web' && {
                        backdropFilter: 'blur(8px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                      } as any
                    ]}
                  >
                    <View style={styles.statIconContainer}>
                      <Flame size={28} color={colors.gold} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.statNumberMedium}>{stats.currentStreak}</Text>
                    <Text style={styles.statLabelMedium}>Current Streak</Text>
                    <Text style={styles.statDescription}>Days in a row</Text>
                  </BlurView>
                </View>

                <View style={[styles.glowWrapper, { flex: 1 }]}>
                  <BlurView
                    intensity={30}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={[
                      styles.statCardMedium,
                      Platform.OS === 'web' && {
                        backdropFilter: 'blur(8px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                      } as any
                    ]}
                  >
                    <View style={styles.statIconContainer}>
                      <Award size={28} color={colors.gold} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.statNumberMedium}>{stats.longestStreak}</Text>
                    <Text style={styles.statLabelMedium}>Best Streak</Text>
                    <Text style={styles.statDescription}>Personal record</Text>
                  </BlurView>
                </View>

                <View style={[styles.glowWrapper, { flex: 1 }]}>
                  <BlurView
                    intensity={30}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={[
                      styles.statCardMedium,
                      Platform.OS === 'web' && {
                        backdropFilter: 'blur(8px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                      } as any
                    ]}
                  >
                    <View style={styles.statIconContainer}>
                      <Calendar size={28} color={colors.gold} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.statNumberMedium}>{stats.totalCheckIns}</Text>
                    <Text style={styles.statLabelMedium}>Total Check-Ins</Text>
                    <Text style={styles.statDescription}>All time visits</Text>
                  </BlurView>
                </View>
              </View>

              <View style={styles.performanceSection}>
                <View style={styles.glowWrapper}>
                  <BlurView
                    intensity={30}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={[
                      styles.performanceCard,
                      Platform.OS === 'web' && {
                        backdropFilter: 'blur(8px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                      } as any
                    ]}
                  >
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
                  </BlurView>
                </View>

                <View style={[styles.glowWrapper, { marginTop: 16 }]}>
                  <BlurView
                    intensity={30}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={[
                      styles.performanceCard,
                      Platform.OS === 'web' && {
                        backdropFilter: 'blur(8px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                      } as any
                    ]}
                  >
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
                  </BlurView>
                </View>
              </View>
            </View>
          </ScrollView>

          <BlurView
            intensity={80}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={[
              styles.headerBlur,
              { paddingTop: insets.top + 10 },
              Platform.OS === 'web' && {
                backdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
              } as any
            ]}
          >
            <View style={styles.headerContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Unbroken</Text>
                <Text style={styles.headerSubtitle}>Stay consistent, stay strong</Text>
                {isAuthenticated && !isEmailVerified() && (
                  <View style={styles.emailVerificationBanner}>
                    <Mail size={14} color={colors.gold} />
                    <Text style={styles.emailVerificationText} numberOfLines={1}>Verify Email</Text>
                    <View style={styles.verificationActionRow}>
                      <TouchableOpacity
                        onPress={handleCheckVerification}
                        style={styles.verifyButton}
                      >
                        <RefreshCw size={12} color="#000" />
                        <Text style={styles.verifyButtonText}>Check</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleResendVerification}
                        style={[styles.verifyButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gold }]}
                      >
                        <Text style={[styles.verifyButtonText, { color: colors.gold }]}>Resend</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
              {isAuthenticated ? (
                <TouchableOpacity
                  style={styles.signOutButton}
                  onPress={async () => {
                    hapticManager.triggerButton();
                    try {
                      await signOut();
                      hapticManager.triggerSuccess();
                    } catch (error) {
                      hapticManager.triggerError();
                    }
                  }}
                >
                  <LogOut size={20} color={colors.gold} strokeWidth={2} />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => {
                    hapticManager.triggerButton();
                    setShowAuthForm(true);
                  }}
                >
                  <Menu size={20} color={colors.gold} strokeWidth={2} />
                  <Text style={styles.loginText}>Login</Text>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>

          <BlurView
            intensity={80}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={[
              styles.bottomNavBar,
              { paddingBottom: insets.bottom + 12 },
              Platform.OS === 'web' && {
                backdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
              } as any
            ]}
          >
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
          </BlurView>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
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
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(203, 169, 129, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
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
  authHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(203, 169, 129, 0.1)',
    borderWidth: 1,
    borderColor: colors.gold,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 13,
    color: colors.gold,
    fontWeight: '600' as const,
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
  glowWrapper: {
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
        backgroundColor: 'rgba(0,0,0,0.01)',
      },
      web: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
    }),
  },
  streakCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
  checkInSection: {
    alignItems: 'center',
    marginBottom: 60,
    marginTop: 8,
  },
  checkInButton: {
    width: width - 40,
    aspectRatio: 1,
    maxWidth: 260,
    maxHeight: 260,
    borderRadius: 1000,
    overflow: 'hidden',
    backgroundColor: '#000',
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
  },
  removalSuccessText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCardMedium: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statNumberMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginVertical: 4,
  },
  statLabelMedium: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDescription: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  performanceSection: {
  },
  performanceCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 4,
  },
  holidayNote: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
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
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(203, 169, 129, 0.1)',
    borderWidth: 1,
    borderColor: colors.gold,
    marginTop: 4,
  },
  loginText: {
    fontSize: 13,
    color: colors.gold,
    fontWeight: '600' as const,
  },
  emailVerificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(203, 169, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(203, 169, 129, 0.3)',
  },
  emailVerificationText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    flex: 1,
  },
  verificationActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  verifyButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifyButtonText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700' as const,
  },
});