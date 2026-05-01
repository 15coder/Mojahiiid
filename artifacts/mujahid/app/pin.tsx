import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
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

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function handleKey(key: string) {
    if (key === '⌫') {
      setEntered((p) => p.slice(0, -1));
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
      setTimeout(() => submitPin(next), 100);
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
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withSpring(0, { damping: 20 })
      );
      setTimeout(() => {
        setEntered('');
        setError(false);
      }, 600);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.content}>
        <Image source={require('@/assets/images/icon.png')} style={styles.appIcon} contentFit="contain" />

        <Text style={[styles.title, { color: colors.foreground }]}>{settings.appName || 'مجاهد للتجارة'}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>أدخل رمز PIN للدخول</Text>

        <Animated.View style={[styles.dotsRow, shakeStyle]}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < entered.length
                      ? error
                        ? colors.destructive
                        : colors.primary
                      : colors.muted,
                  borderColor: error ? colors.destructive : colors.border,
                  transform: [{ scale: i < entered.length ? 1.15 : 1 }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {error && (
          <Animated.Text entering={FadeIn.duration(200)} style={[styles.errorText, { color: colors.destructive }]}>
            PIN غير صحيح
          </Animated.Text>
        )}

        <View style={styles.keypad}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.keyBtn,
                    {
                      backgroundColor: k === '✓' ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleKey(k)}
                  activeOpacity={0.7}
                >
                  {k === '⌫' ? (
                    <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
                  ) : k === '✓' ? (
                    <Ionicons name="checkmark" size={24} color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.keyText, { color: colors.foreground }]}>{k}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {onRecover && (
          <TouchableOpacity onPress={onRecover} style={styles.recoverBtn}>
            <Text style={[styles.recoverText, { color: colors.primary }]}>نسيت PIN؟ استخدم مفتاح الأمان</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 20, paddingHorizontal: 24, width: '100%' },
  appIcon: { width: 80, height: 80, borderRadius: 20 },
  title: { fontSize: 22, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', marginTop: -10 },
  dotsRow: { flexDirection: 'row', gap: 18, marginVertical: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  errorText: { fontSize: 13, fontFamily: 'Tajawal_500Medium', marginTop: -12 },
  keypad: { width: '100%', gap: 12, maxWidth: 320 },
  keyRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  keyBtn: {
    width: 88,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  keyText: { fontSize: 24, fontFamily: 'Tajawal_700Bold' },
  recoverBtn: { marginTop: 8 },
  recoverText: { fontSize: 13, fontFamily: 'Tajawal_500Medium', textDecorationLine: 'underline' },
});
