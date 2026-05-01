import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

interface Props {
  onUnlock: () => void;
}

export function BiometricLock({ onUnlock }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authenticate();
  }, []);

  async function authenticate() {
    if (Platform.OS === 'web') {
      onUnlock();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        onUnlock();
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تطبيق مجاهد - التحقق من الهوية',
        fallbackLabel: 'استخدم رمز المرور',
        cancelLabel: 'إلغاء',
      });
      if (result.success) {
        onUnlock();
      } else {
        setError('فشل التحقق. حاول مرة أخرى.');
      }
    } catch {
      setError('خطأ في المصادقة البيومترية.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconBg, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="lock-closed" size={48} color={colors.primary} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>مجاهد</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        نظام إدارة المخزون
      </Text>
      <Text style={[styles.lockText, { color: colors.silver }]}>
        يرجى التحقق من هويتك للمتابعة
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={authenticate}
          activeOpacity={0.8}
        >
          <Ionicons name="finger-print" size={24} color={colors.primaryForeground} />
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
            التحقق البيومتري
          </Text>
        </TouchableOpacity>
      )}

      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
  },
  lockText: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
  },
  loader: {
    marginTop: 24,
  },
  error: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
});
