import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurViewOptimized } from '@/components/BlurViewOptimized';
import { colors } from '@/constants/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useGymCheckIns } from '@/contexts/GymCheckInContext';
import { ChevronLeft, Cloud, CloudOff, RefreshCw, Calendar, TrendingUp, User, Shield } from 'lucide-react-native';
import HapticManager from '@/services/HapticManager';

export default function SettingsScreen() {
  const { 
    isGoogleSignedIn, 
    isSyncing, 
    signInToGoogle, 
    signOutFromGoogle, 
    syncWithGoogle 
  } = useGymCheckIns();
  const hapticManager = HapticManager.getInstance();
  const insets = useSafeAreaInsets();

  const handleGoogleSignIn = async () => {
    hapticManager.triggerButton();
    try {
      const success = await signInToGoogle();
      if (success) {
        hapticManager.triggerSuccess();
        if (Platform.OS === 'web') {
          alert('Successfully signed in to Google Drive!');
        } else {
          Alert.alert('Success', 'Successfully signed in to Google Drive!');
        }
      } else {
        hapticManager.triggerError();
        if (Platform.OS === 'web') {
          alert('Failed to sign in to Google Drive. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to sign in to Google Drive. Please try again.');
        }
      }
    } catch (error) {
      hapticManager.triggerError();
      console.error('Google sign-in error:', error);
    }
  };

  const handleGoogleSignOut = async () => {
    hapticManager.triggerButton();
    
    const confirmSignOut = () => {
      signOutFromGoogle();
      hapticManager.triggerSuccess();
      if (Platform.OS === 'web') {
        alert('Signed out from Google Drive');
      } else {
        Alert.alert('Success', 'Signed out from Google Drive');
      }
    };

    if (Platform.OS === 'web') {
      const shouldSignOut = window.confirm('Are you sure you want to sign out from Google Drive? Your data will only be stored locally.');
      if (shouldSignOut) {
        confirmSignOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out from Google Drive? Your data will only be stored locally.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: confirmSignOut }
        ]
      );
    }
  };

  const handleSync = async () => {
    if (!isGoogleSignedIn) return;
    
    hapticManager.triggerButton();
    try {
      const success = await syncWithGoogle();
      if (success) {
        hapticManager.triggerSuccess();
        if (Platform.OS === 'web') {
          alert('Data synced successfully!');
        } else {
          Alert.alert('Success', 'Data synced successfully!');
        }
      } else {
        hapticManager.triggerError();
        if (Platform.OS === 'web') {
          alert('Sync failed. Please try again.');
        } else {
          Alert.alert('Error', 'Sync failed. Please try again.');
        }
      }
    } catch (error) {
      hapticManager.triggerError();
      console.error('Sync error:', error);
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
          headerTitle: 'Settings',
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Google Drive Sync</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingIconContainer}>
                  {isGoogleSignedIn ? (
                    <Cloud size={24} color={colors.gold} strokeWidth={2} />
                  ) : (
                    <CloudOff size={24} color={colors.textSecondary} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>
                    {isGoogleSignedIn ? 'Connected to Google Drive' : 'Not Connected'}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {isGoogleSignedIn 
                      ? 'Your data is automatically synced across all devices'
                      : 'Sign in to sync your data across all devices'
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.settingActions}>
                {isGoogleSignedIn ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.syncButton]}
                      onPress={handleSync}
                      disabled={isSyncing}
                    >
                      <RefreshCw 
                        size={18} 
                        color={colors.text} 
                        strokeWidth={2}
                        style={isSyncing ? styles.spinning : undefined}
                      />
                      <Text style={styles.actionButtonText}>
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.signOutButton]}
                      onPress={handleGoogleSignOut}
                    >
                      <Text style={styles.signOutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.signInButton]}
                    onPress={handleGoogleSignIn}
                  >
                    <User size={18} color="#000" strokeWidth={2} />
                    <Text style={styles.signInButtonText}>Sign In to Google</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Security</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Shield size={20} color={colors.gold} strokeWidth={2} />
                <Text style={styles.infoTitle}>Your Data is Safe</Text>
              </View>
              <Text style={styles.infoText}>
                • Data is stored in your private Google Drive folder
              </Text>
              <Text style={styles.infoText}>
                • Only you can access your fitness data
              </Text>
              <Text style={styles.infoText}>
                • Data is encrypted during transmission
              </Text>
              <Text style={styles.infoText}>
                • No data is shared with third parties
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How Sync Works</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                • Automatic sync when you sign in
              </Text>
              <Text style={styles.infoText}>
                • Manual sync available anytime
              </Text>
              <Text style={styles.infoText}>
                • Merges data from all your devices
              </Text>
              <Text style={styles.infoText}>
                • Works offline - syncs when connected
              </Text>
            </View>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  settingCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 4,
    }),
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  settingIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  settingActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  signInButton: {
    backgroundColor: colors.gold,
  },
  signInButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  syncButton: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
  infoCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'android' && {
      elevation: 2,
    }),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
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