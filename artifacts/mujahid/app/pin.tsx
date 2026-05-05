import * as LocalAuthentication from 'expo-local-authentication';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';

interface Props {
  onUnlock: () => void;
  onRecover?: () => void;
}

export default function PinScreen({ onUnlock, onRecover }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, unlock } = useSettings();
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 24 : insets.bottom;

  useEffect(() => {
    if (Platform.OS !== 'web' && settings.biometricEnabled) {
      LocalAuthentication.hasHardwareAsync().then((has) => {
        if (has) setHasBiometric(true);
      });
    }
  }, [settings.biometricEnabled]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function handleTextChange(text: string) {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    setError(false);
    setEntered(digits);
    if (digits.length === 4) {
      setTimeout(() => submitPin(digits), 80);
    }
  }

  function submitPin(pin: string) {
    const ok = unlock(pin);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(true);
      shakeX.value = withSequence(
        withTiming(-12, { duration: 55 }),
        withTiming(12, { duration: 55 }),
        withTiming(-9, { duration: 55 }),
        withTiming(9, { duration: 55 }),
        withSpring(0, { damping: 22 })
      );
      setTimeout(() => {
        setEntered('');
        setError(false);
      }, 600);
    }
  }

  async function handleBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تسجيل الدخول ببصمة الإصبع',
        cancelLabel: 'إلغاء',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    } catch {
      // ignore
    }
  }

  const appIcon = settings.appIconUri
    ? { uri: settings.appIconUri }
    : require('@/assets/images/icon.png');

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Hidden TextInput that captures keyboard input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={entered}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={4}
        caretHidden
        autoFocus={false}
      />

      <View style={[styles.content, { paddingTop: topInset + 20, paddingBottom: bottomInset + 16 }]}>
        {/* Lock Icon */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.lockWrap}>
          <View style={[styles.lockCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="lock-closed" size={44} color={colors.primaryForeground} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {settings.appName || 'مجاهد للتجارة'}
          </Text>
          <Text style={[styles.subtitle, { color: error ? colors.destructive : colors.mutedForeground }]}>
            {error ? 'رمز PIN غير صحيح، حاول مجدداً' : 'قم بإدخال رمز PIN خاصتك'}
          </Text>
        </Animated.View>

        {/* 4 Boxes */}
        <Animated.View style={[styles.boxesRow, shakeStyle]}>
          {[0, 1, 2, 3].map((i) => {
            const filled = i < entered.length;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                onPress={() => inputRef.current?.focus()}
              >
                <Animated.View
                  entering={FadeIn.delay(i * 40).duration(280)}
                  style={[
                    styles.box,
                    {
                      backgroundColor: colors.card,
                      borderColor: error
                        ? colors.destructive
                        : filled
                        ? colors.primary
                        : colors.border,
                      shadowColor: colors.primary,
                    },
                  ]}
                >
                  {filled && (
                    <Animated.View
                      entering={FadeIn.duration(180)}
                      style={[styles.boxDot, { backgroundColor: error ? colors.destructive : colors.primary }]}
                    />
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Tap boxes to open keyboard */}
        <Animated.View entering={FadeIn.delay(400).duration(300)}>
          <TouchableOpacity onPress={() => inputRef.current?.focus()} activeOpacity={0.7}>
            <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
              اضغط هنا لإدخال الرمز
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Forgot PIN */}
        {onRecover && (
          <Animated.View entering={FadeIn.delay(500).duration(400)}>
            <TouchableOpacity onPress={onRecover} style={styles.recoverBtn} activeOpacity={0.7}>
              <Text style={[styles.recoverText, { color: colors.primary }]}>
                نسيت رمزك الخاص؟
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Biometric */}
        {hasBiometric && (
          <Animated.View entering={FadeInDown.delay(600).duration(400).springify()} style={styles.biometricBlock}>
            <TouchableOpacity onPress={handleBiometric} style={styles.biometricBtn} activeOpacity={0.75}>
              <Ionicons name="finger-print" size={52} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.biometricHint, { color: colors.mutedForeground }]}>
              اضغط للدخول بالبصمة
            </Text>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  lockWrap: { alignItems: 'center' },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  titleBlock: { alignItems: 'center', gap: 6 },
  title: {
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
  },
  boxesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  box: {
    width: 68,
    height: 68,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  boxDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  tapHint: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    marginTop: -8,
  },
  recoverBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  recoverText: {
    fontSize: 14,
    fontFamily: 'Tajawal_500Medium',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  biometricBlock: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  biometricBtn: { padding: 8 },
  biometricHint: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
  },
});
