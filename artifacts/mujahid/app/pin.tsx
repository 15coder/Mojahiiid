import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', '✓'],
];

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
  const shakeX = useSharedValue(0);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 24 : insets.bottom;

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function handleKey(key: string) {
    if (key === '⌫') {
      setEntered((p) => p.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (key === '✓') {
      submitPin(entered);
      return;
    }
    if (entered.length >= 4) return;
    const next = entered + key;
    setEntered(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (next.length === 4) {
      setTimeout(() => submitPin(next), 120);
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
        withTiming(-5, { duration: 55 }),
        withSpring(0, { damping: 22 })
      );
      setTimeout(() => {
        setEntered('');
        setError(false);
      }, 650);
    }
  }

  const appIcon = settings.appIconUri
    ? { uri: settings.appIconUri }
    : require('@/assets/images/icon.png');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={topInset}
      >
        <View style={[styles.topSection]}>
          <Animated.View entering={ZoomIn.duration(500).springify().damping(14)} style={[styles.iconRing, { borderColor: colors.primary + '30', backgroundColor: colors.card }]}>
            <Image source={appIcon} style={styles.appIcon} contentFit="contain" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
            <Text style={[styles.title, { color: colors.foreground }]}>{settings.appName || 'مجاهد للتجارة'}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {error ? 'رمز PIN غير صحيح، حاول مجدداً' : 'أدخل رمز PIN للدخول'}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.dotsRow, shakeStyle]}>
            {[0, 1, 2, 3].map((i) => {
              const filled = i < entered.length;
              return (
                <Animated.View
                  key={i}
                  entering={ZoomIn.delay(i * 40).springify()}
                  style={[
                    styles.dotOuter,
                    {
                      borderColor: error
                        ? colors.destructive
                        : filled
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  {filled && (
                    <Animated.View
                      entering={ZoomIn.springify().damping(12)}
                      style={[
                        styles.dotInner,
                        {
                          backgroundColor: error ? colors.destructive : colors.primary,
                        },
                      ]}
                    />
                  )}
                </Animated.View>
              );
            })}
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(200).duration(450).springify().damping(18)}
          style={[styles.keypadCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.keypad}>
            {KEYS.map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map((k) => (
                  <KeyButton
                    key={k}
                    label={k}
                    onPress={() => handleKey(k)}
                    colors={colors}
                    isConfirm={k === '✓'}
                    isDelete={k === '⌫'}
                    disabled={k === '✓' && entered.length === 0}
                  />
                ))}
              </View>
            ))}
          </View>

          {onRecover && (
            <Animated.View entering={FadeIn.delay(500).duration(400)}>
              <TouchableOpacity onPress={onRecover} style={styles.recoverBtn} activeOpacity={0.7}>
                <Ionicons name="key-outline" size={14} color={colors.primary} />
                <Text style={[styles.recoverText, { color: colors.primary }]}>
                  نسيت PIN؟ استخدم مفتاح الأمان
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        <View style={{ height: bottomInset + 8 }} />
      </KeyboardAvoidingView>
    </View>
  );
}

interface KeyButtonProps {
  label: string;
  onPress: () => void;
  colors: any;
  isConfirm?: boolean;
  isDelete?: boolean;
  disabled?: boolean;
}

function KeyButton({ label, onPress, colors, isConfirm, isDelete, disabled }: KeyButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.88, { damping: 20, stiffness: 500 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn as any}
      onPressOut={handlePressOut as any}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.keyBtn,
          {
            backgroundColor: isConfirm
              ? colors.primary
              : isDelete
              ? colors.secondary
              : colors.background,
            borderColor: isConfirm ? colors.primary : colors.border,
            opacity: disabled ? 0.35 : 1,
          },
          animStyle,
        ]}
      >
        {isDelete ? (
          <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
        ) : isConfirm ? (
          <Ionicons name="checkmark" size={26} color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.keyText, { color: colors.foreground }]}>{label}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  kav: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  topSection: { alignItems: 'center', gap: 18, paddingTop: 32, paddingBottom: 8 },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  appIcon: { width: 72, height: 72, borderRadius: 20 },
  title: { fontSize: 22, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  dotsRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  dotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  keypadCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  keypad: { gap: 10 },
  keyRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  keyBtn: {
    width: 90,
    height: 68,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  keyText: { fontSize: 26, fontFamily: 'Tajawal_700Bold' },
  recoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
  },
  recoverText: {
    fontSize: 13,
    fontFamily: 'Tajawal_500Medium',
    textDecorationLine: 'underline',
  },
});
