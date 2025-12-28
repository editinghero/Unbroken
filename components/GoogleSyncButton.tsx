import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useGymCheckIns } from '@/contexts/GymCheckInContext';
import HapticManager from '@/services/HapticManager';

interface GoogleSyncButtonProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  onSyncComplete?: (success: boolean) => void;
}

export function GoogleSyncButton({ 
  size = 'medium', 
  showText = true,
  onSyncComplete 
}: GoogleSyncButtonProps) {
  const { isGoogleSignedIn, isSyncing, syncWithGoogle } = useGymCheckIns();
  const hapticManager = HapticManager.getInstance();

  const handleSync = async () => {
    if (!isGoogleSignedIn || isSyncing) return;
    
    hapticManager.triggerButton();
    try {
      const success = await syncWithGoogle();
      if (success) {
        hapticManager.triggerSuccess();
      } else {
        hapticManager.triggerError();
      }
      onSyncComplete?.(success);
    } catch {
      hapticManager.triggerError();
      onSyncComplete?.(false);
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getIcon = () => {
    if (isSyncing) {
      return <RefreshCw size={getIconSize()} color={colors.gold} strokeWidth={2} />;
    }
    if (isGoogleSignedIn) {
      return <Cloud size={getIconSize()} color={colors.gold} strokeWidth={2} />;
    }
    return <CloudOff size={getIconSize()} color={colors.textSecondary} strokeWidth={2} />;
  };

  const getText = () => {
    if (isSyncing) return 'Syncing...';
    if (isGoogleSignedIn) return 'Sync';
    return 'Not Connected';
  };

  const isDisabled = !isGoogleSignedIn || isSyncing;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[size],
        isDisabled && styles.disabled,
        isGoogleSignedIn && styles.connected
      ]}
      onPress={handleSync}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {getIcon()}
      {showText && (
        <Text style={[
          styles.text,
          styles[`${size}Text`],
          isDisabled && styles.disabledText,
          isGoogleSignedIn && styles.connectedText
        ]}>
          {getText()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  connected: {
    backgroundColor: 'rgba(203, 169, 129, 0.1)',
    borderColor: colors.gold,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 13,
  },
  largeText: {
    fontSize: 14,
  },
  connectedText: {
    color: colors.gold,
  },
  disabledText: {
    color: colors.textTertiary,
  },
});