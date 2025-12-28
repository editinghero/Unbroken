import React from 'react';
import { View, ViewStyle } from 'react-native';

interface BlurViewOptimizedProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  children: React.ReactNode;
  androidFallback?: boolean;
}

export function BlurViewOptimized({
  style,
  children,
}: BlurViewOptimizedProps) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}