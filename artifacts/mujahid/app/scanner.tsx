import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';
import { setScanResult } from '@/utils/scanResult';

const CORNER_COLOR = '#4B7BF5';
const FRAME_W = 320;
const FRAME_H = 170;

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const isNavigating = useRef(false);
  const lineAnim = useRef(new Animated.Value(0)).current;
  const lineLoop = useRef<Animated.CompositeAnimation | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const returnTo = params.returnTo;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }).catch(() => {});
    }
    startLineAnimation();
    return () => {
      lineLoop.current?.stop();
    };
  }, []);

  function startLineAnimation() {
    lineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    lineLoop.current.start();
  }

  async function playStrongBeep() {
    if (Platform.OS === 'web') return;
    try {
      const { sound: s1 } = await Audio.Sound.createAsync(
        require('@/assets/beep.wav'),
        { shouldPlay: true, volume: 1.0 }
      );
      s1.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) {
          s1.unloadAsync().catch(() => {});
          setTimeout(async () => {
            try {
              const { sound: s2 } = await Audio.Sound.createAsync(
                require('@/assets/beep.wav'),
                { shouldPlay: true, volume: 1.0 }
              );
              s2.setOnPlaybackStatusUpdate((st2) => {
                if (st2.isLoaded && st2.didJustFinish) s2.unloadAsync().catch(() => {});
              });
            } catch {}
          }, 100);
        }
      });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={styles.center}>
          <Ionicons name="barcode-outline" size={64} color={colors.muted} />
          <Text style={[styles.noSupportText, { color: colors.mutedForeground }]}>الماسح غير متاح على الويب</Text>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
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
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={[styles.center, { paddingTop: topInset }]}>
          <View style={styles.permIconWrap}>
            <Ionicons name="camera-outline" size={56} color="#fff" />
          </View>
          <Text style={styles.permTitle}>صلاحية الكاميرا</Text>
          <Text style={styles.permSubtext}>يلزم الوصول إلى الكاميرا لمسح الباركود</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>السماح بالوصول</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
            <Text style={styles.cancelText}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned || isNavigating.current) return;
    isNavigating.current = true;
    setScanned(true);
    setLastCode(data);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playStrongBeep();

    setTimeout(() => {
      if (returnTo === 'add') {
        setScanResult(data);
        router.back();
      } else {
        const existing = products.find((p) => p.barcode === data);
        if (existing) {
          router.replace({ pathname: '/product/[id]', params: { id: existing.id } });
        } else {
          router.replace({ pathname: '/product/add', params: { barcode: data } });
        }
      }
    }, 280);
  }

  const lineTranslateY = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_H - 4],
  });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93', 'itf14', 'codabar'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={[styles.overlay, { paddingTop: topInset + 8 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>ماسح الباركود</Text>

          <TouchableOpacity
            onPress={() => setFlashOn((v) => !v)}
            style={[styles.topBtn, flashOn && styles.topBtnActive]}
          >
            <Ionicons name={flashOn ? 'flash' : 'flash-outline'} size={22} color={flashOn ? '#FFD700' : '#fff'} />
          </TouchableOpacity>
        </View>

        {/* Frame area */}
        <View style={styles.scanFrame}>
          <Text style={styles.scanLabel}>
            {scanned ? 'جاري المعالجة...' : 'وجّه الكاميرا نحو الباركود'}
          </Text>

          <View style={[styles.scanAreaContainer, { width: FRAME_W, height: FRAME_H }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {!scanned && (
              <Animated.View
                style={[styles.scanLine, { width: FRAME_W - 8, transform: [{ translateY: lineTranslateY }] }]}
              />
            )}

            {scanned && (
              <View style={styles.scannedOverlay}>
                <Ionicons name="checkmark-circle" size={52} color="#4CAF50" />
              </View>
            )}
          </View>

          {lastCode && (
            <View style={styles.codeTag}>
              <Ionicons name="barcode-outline" size={14} color={CORNER_COLOR} />
              <Text style={styles.codeText} numberOfLines={1}>{lastCode}</Text>
            </View>
          )}

          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => { setScanned(false); setLastCode(null); isNavigating.current = false; }}
            >
              <Ionicons name="scan-outline" size={16} color="#fff" />
              <Text style={styles.rescanText}>مسح مجدداً</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            {flashOn ? '🔦 الفلاش مُفعَّل' : 'اضغط أيقونة الفلاش للإضاءة'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 30;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topBtnActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  topTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  scanFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 20,
  },
  scanLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scanAreaContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderBottomRightRadius: 4 },
  scanLine: {
    position: 'absolute',
    left: 4,
    height: 3,
    backgroundColor: CORNER_COLOR,
    opacity: 0.9,
    shadowColor: CORNER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  scannedOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  codeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 300,
  },
  codeText: { color: CORNER_COLOR, fontSize: 13, fontFamily: 'Tajawal_400Regular', flex: 1, textAlign: 'center' },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CORNER_COLOR,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 26,
  },
  rescanText: { color: '#fff', fontSize: 15, fontFamily: 'Tajawal_700Bold' },
  bottomHint: { paddingBottom: 50, paddingHorizontal: 24, alignItems: 'center' },
  hintText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
  noSupportText: { fontSize: 16, fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
  closeBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  closeBtnText: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  permIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  permTitle: { color: '#fff', fontSize: 20, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  permSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22 },
  permText: { fontSize: 16, fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
  permBtn: { backgroundColor: CORNER_COLOR, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  permBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  cancelLink: { marginTop: 4 },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: 'Tajawal_400Regular' },
});
