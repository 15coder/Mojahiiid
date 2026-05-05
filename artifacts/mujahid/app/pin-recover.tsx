import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

export default function PinRecoverScreen({ onBack, onSuccess }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();

  const [step, setStep] = useState<'key' | 'newPin' | 'confirmPin'>('key');
  const [secKey, setSecKey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [keyError, setKeyError] = useState('');

  const newPinRef = useRef<TextInput>(null);
  const confirmPinRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 24 : insets.bottom;

  const pinBoxShake = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function doShake() {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 55 }),
      withTiming(12, { duration: 55 }),
      withTiming(-9, { duration: 55 }),
      withTiming(9, { duration: 55 }),
      withSpring(0, { damping: 22 })
    );
  }

  function handleKeySubmit() {
    if (!secKey.trim()) {
      setKeyError('يرجى إدخال مفتاح الأمان');
      return;
    }
    if (secKey.trim() !== settings.securityKey) {
      setKeyError('مفتاح الأمان غير صحيح');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      doShake();
      return;
    }
    setKeyError('');
    setStep('newPin');
    setTimeout(() => newPinRef.current?.focus(), 200);
  }

  function handleNewPinChange(text: string) {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    setNewPin(digits);
    if (digits.length === 4) {
      setTimeout(() => {
        setStep('confirmPin');
        setTimeout(() => confirmPinRef.current?.focus(), 200);
      }, 80);
    }
  }

  function handleConfirmPinChange(text: string) {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    setConfirmPin(digits);
    if (digits.length === 4) {
      setTimeout(() => submitNewPin(digits), 80);
    }
  }

  function submitNewPin(confirm: string) {
    if (confirm !== newPin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      doShake();
      setTimeout(() => {
        setConfirmPin('');
        setNewPin('');
        setStep('newPin');
        setTimeout(() => newPinRef.current?.focus(), 200);
      }, 600);
      return;
    }
    updateSettings({ pinCode: newPin, pinEnabled: true });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSuccess();
  }

  const activePinValue = step === 'newPin' ? newPin : confirmPin;
  const activePinRef = step === 'newPin' ? newPinRef : confirmPinRef;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>استعادة رمز PIN</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="shield-checkmark-outline" size={40} color={colors.primary} />
          </View>
        </Animated.View>

        {step === 'key' && (
          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.section}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>أدخل مفتاح الأمان</Text>
            <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
              ستجد مفتاح الأمان في الإعدادات، ضمن قسم الأمان
            </Text>
            <Animated.View style={[styles.keyInputWrap, pinBoxShake]}>
              <TextInput
                style={[styles.keyInput, {
                  backgroundColor: colors.card,
                  borderColor: keyError ? colors.destructive : colors.border,
                  color: colors.foreground,
                }]}
                value={secKey}
                onChangeText={(t) => { setSecKey(t); setKeyError(''); }}
                placeholder="أدخل مفتاح الأمان"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="right"
              />
              {keyError ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{keyError}</Text>
              ) : null}
            </Animated.View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleKeySubmit}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>التالي</Text>
              <Ionicons name="arrow-back" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {(step === 'newPin' || step === 'confirmPin') && (
          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.section}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              {step === 'newPin' ? 'أدخل رمز PIN الجديد' : 'تأكيد رمز PIN'}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
              {step === 'newPin'
                ? 'اختر رمز PIN مكوناً من 4 أرقام'
                : 'أعد إدخال رمز PIN للتأكيد'}
            </Text>

            {/* Hidden inputs */}
            <TextInput
              ref={newPinRef}
              style={styles.hiddenInput}
              value={newPin}
              onChangeText={handleNewPinChange}
              keyboardType="number-pad"
              maxLength={4}
              caretHidden
            />
            <TextInput
              ref={confirmPinRef}
              style={styles.hiddenInput}
              value={confirmPin}
              onChangeText={handleConfirmPinChange}
              keyboardType="number-pad"
              maxLength={4}
              caretHidden
            />

            <Animated.View style={[styles.boxesRow, pinBoxShake]}>
              {[0, 1, 2, 3].map((i) => {
                const filled = i < activePinValue.length;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.85}
                    onPress={() => activePinRef.current?.focus()}
                  >
                    <View
                      style={[styles.box, {
                        backgroundColor: colors.card,
                        borderColor: filled ? colors.primary : colors.border,
                      }]}
                    >
                      {filled && (
                        <View style={[styles.boxDot, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            <TouchableOpacity onPress={() => activePinRef.current?.focus()} style={styles.tapHintBtn}>
              <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
                اضغط هنا لإدخال الرمز
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  iconWrap: { marginTop: 16 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  keyInputWrap: { width: '100%', gap: 6 },
  keyInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Tajawal_500Medium',
    letterSpacing: 1,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },
  boxesRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
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
  tapHintBtn: { paddingVertical: 4 },
  tapHint: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
  },
});
