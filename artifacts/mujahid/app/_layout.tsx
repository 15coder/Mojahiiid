import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  useFonts,
} from '@expo-google-fonts/tajawal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricLock } from '@/components/BiometricLock';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CategoriesProvider } from '@/context/CategoriesContext';
import { ProductsProvider } from '@/context/ProductsContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { ToastProvider } from '@/context/ToastContext';
import PinScreen from '@/app/pin';
import PinRecoverScreen from '@/app/pin-recover';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { settings, isLocked, unlock, isLoading } = useSettings();
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    }
  }, []);

  if (isLoading) return null;

  if (isLocked) {
    if (showRecovery) {
      return (
        <PinRecoverScreen
          onBack={() => setShowRecovery(false)}
          onSuccess={() => {
            setShowRecovery(false);
            unlock();
          }}
        />
      );
    }

    if (settings.pinEnabled && settings.pinCode) {
      return (
        <PinScreen
          onUnlock={() => unlock()}
          onRecover={() => setShowRecovery(true)}
        />
      );
    }
    return <BiometricLock onUnlock={() => unlock()} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/add" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="product/edit/[id]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="calculator" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="contact" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <SettingsProvider>
                <CategoriesProvider>
                  <ProductsProvider>
                    <ToastProvider>
                      <RootLayoutNav />
                    </ToastProvider>
                  </ProductsProvider>
                </CategoriesProvider>
              </SettingsProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
