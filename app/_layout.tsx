import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { GymCheckInProvider } from "@/contexts/GymCheckInContext";
import { colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{
      headerBackTitle: "Back",
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTintColor: colors.text,
      animation: 'none',
    }}>
      <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="calendar" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="stats" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="+not-found" options={{ title: "Not Found", animation: 'none' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GymCheckInProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" backgroundColor={colors.background} />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </GymCheckInProvider>
    </QueryClientProvider>
  );
}