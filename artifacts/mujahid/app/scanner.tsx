import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    }
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  async function playBeep() {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
      }
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/beep.wav'),
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch {
      // fallback: haptics only
    }
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={styles.center}>
          <Ionicons name="barcode-outline" size={64} color={colors.muted} />
          <Text style={[styles.noSupportText, { color: colors.mutedForeground }]}>
            الماسح غير متاح على الويب
          </Text>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.closeBtnText, { color: colors.primaryForeground }]}>رجوع</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.permText, { color: colors.mutedForeground }]}>جاري طلب الصلاحية...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={60} color={colors.muted} />
          <Text style={[styles.permText, { color: colors.foreground }]}>
            يلزم الوصول إلى الكاميرا لمسح الباركود
          </Text>
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permBtnText, { color: colors.primaryForeground }]}>السماح</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
            <Text style={[styles.cancelText, { color: colors.silver }]}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setLastCode(data);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playBeep();

    const existing = products.find((p) => p.barcode === data);
    if (existing) {
      Alert.alert(
        'منتج موجود',
        `تم العثور على: ${existing.name}`,
        [
          { text: 'عرض المنتج', onPress: () => router.replace({ pathname: '/product/[id]', params: { id: existing.id } }) },
          { text: 'مسح مجدداً', onPress: () => setScanned(false) },
        ]
      );
    } else {
      Alert.alert(
        'باركود جديد',
        `الرمز: ${data}\nهل تريد إضافة منتج جديد؟`,
        [
          { text: 'إضافة منتج', onPress: () => router.replace('/product/add') },
          { text: 'مسح مجدداً', onPress: () => setScanned(false) },
          { text: 'إلغاء', onPress: () => router.back(), style: 'cancel' },
        ]
      );
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={[styles.overlay, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeOverlayBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.scanFrame}>
          <View style={styles.scanAreaContainer}>
            <View style={styles.scanCornerTL} />
            <View style={styles.scanCornerTR} />
            <View style={styles.scanCornerBL} />
            <View style={styles.scanCornerBR} />
          </View>
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            {scanned ? 'جاري المعالجة...' : 'وجّه الكاميرا نحو الباركود'}
          </Text>
          {lastCode && (
            <Text style={styles.lastCodeText}>{lastCode}</Text>
          )}
          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanText}>مسح مجدداً</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#4B7BF5';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  closeOverlayBtn: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAreaContainer: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  scanCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  scanCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  scanCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  bottomHint: {
    paddingBottom: 60,
    alignItems: 'center',
    gap: 10,
  },
  hintText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  lastCodeText: {
    color: CORNER_COLOR,
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
  },
  rescanBtn: {
    backgroundColor: CORNER_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  rescanText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Tajawal_700Bold',
  },
  noSupportText: {
    fontSize: 16,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
  },
  closeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeBtnText: {
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
  },
  permText: {
    fontSize: 16,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
  },
  permBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permBtnText: {
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
  },
  cancelLink: { marginTop: 4 },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Tajawal_400Regular',
  },
});
