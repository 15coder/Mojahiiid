import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
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
  const lineAnim = useRef(new Animated.Value(0)).current;
  const lineLoop = useRef<Animated.CompositeAnimation | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    }
    startLineAnimation();
    return () => {
      lineLoop.current?.stop();
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  function startLineAnimation() {
    lineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    lineLoop.current.start();
  }

  async function playDoubleBeep() {
    try {
      async function playOnce() {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/beep.wav'),
          { shouldPlay: true, volume: 1.0 }
        );
        return sound;
      }
      const s1 = await playOnce();
      s1.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          s1.unloadAsync().catch(() => {});
          setTimeout(async () => {
            try {
              const s2 = await playOnce();
              s2.setOnPlaybackStatusUpdate((st) => {
                if (st.isLoaded && st.didJustFinish) {
                  s2.unloadAsync().catch(() => {});
                }
              });
            } catch {}
          }, 120);
        }
      });
    } catch {
      // haptics fallback
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
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={[styles.center, { paddingTop: topInset }]}>
          <View style={styles.permIconWrap}>
            <Ionicons name="camera-outline" size={56} color="#fff" />
          </View>
          <Text style={styles.permTitle}>صلاحية الكاميرا</Text>
          <Text style={styles.permSubtext}>
            يلزم الوصول إلى الكاميرا لمسح الباركود
          </Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={requestPermission}
          >
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
    if (scanned) return;
    setScanned(true);
    setLastCode(data);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playDoubleBeep();

    const existing = products.find((p) => p.barcode === data);
    if (existing) {
      // Navigate directly without alert
      setTimeout(() => {
        router.replace({ pathname: '/product/[id]', params: { id: existing.id } });
      }, 300);
    } else {
      // Navigate to add product with barcode pre-filled
      setTimeout(() => {
        router.replace({ pathname: '/product/add', params: { barcode: data } });
      }, 300);
    }
  }

  const FRAME_W = 320;
  const FRAME_H = 160;

  const lineTranslateY = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_H - 4],
  });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code93', 'itf14', 'codabar'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Dark overlay with cutout */}
      <View style={[styles.overlay, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeOverlayBtn}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.scanFrame}>
          <Text style={styles.scanLabel}>
            {scanned ? 'جاري المعالجة...' : 'وجّه الكاميرا نحو الباركود'}
          </Text>

          <View style={[styles.scanAreaContainer, { width: FRAME_W, height: FRAME_H }]}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scanning line */}
            {!scanned && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { width: FRAME_W - 8, transform: [{ translateY: lineTranslateY }] },
                ]}
              />
            )}

            {scanned && (
              <View style={styles.scannedOverlay}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
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
              onPress={() => { setScanned(false); setLastCode(null); }}
            >
              <Ionicons name="scan-outline" size={16} color="#fff" />
              <Text style={styles.rescanText}>مسح مجدداً</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomHint}>
          <View style={styles.hintRow}>
            <Ionicons name="flash-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.hintText}>
              إن لم يُقرأ الكود، صوّر باتجاه أفضل أو أدخله يدوياً
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  scanLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scanAreaContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderBottomRightRadius: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 4,
    height: 2,
    backgroundColor: CORNER_COLOR,
    opacity: 0.85,
    shadowColor: CORNER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  codeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: 300,
  },
  codeText: {
    color: CORNER_COLOR,
    fontSize: 13,
    fontFamily: 'Tajawal_400Regular',
    flex: 1,
    textAlign: 'center',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CORNER_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  rescanText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Tajawal_700Bold',
  },
  bottomHint: {
    paddingBottom: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  hintText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    flex: 1,
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
  permIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  permSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  permText: {
    fontSize: 16,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: CORNER_COLOR,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
  },
  cancelLink: { marginTop: 4 },
  cancelText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontFamily: 'Tajawal_400Regular',
  },
});
