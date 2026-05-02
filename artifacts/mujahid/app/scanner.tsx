import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';
import { setScanResult } from '@/utils/scanResult';
import { invoiceStore } from '@/utils/invoiceStore';

const CORNER_COLOR = '#4B7BF5';
const FRAME_W = 320;
const FRAME_H = 170;

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const params = useLocalSearchParams<{ returnTo?: string; mode?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const isNavigating = useRef(false);
  const lineAnim = useRef(new Animated.Value(0)).current;
  const lineLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Unknown barcode modal
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [showUnknownModal, setShowUnknownModal] = useState(false);

  // Calculator mode — last added product name
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);
  // Invoice count badge
  const [invoiceCount, setInvoiceCount] = useState(() => invoiceStore.getItems().reduce((s, i) => s + i.qty, 0));

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const returnTo = params.returnTo;
  const isCalculatorMode = params.mode === 'calculator';

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }).catch(() => {});
    }
    startLineAnimation();

    const unsub = invoiceStore.subscribe(() => {
      setInvoiceCount(invoiceStore.getItems().reduce((s, i) => s + i.qty, 0));
    });

    return () => {
      lineLoop.current?.stop();
      unsub();
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

  async function playBeep() {
    if (Platform.OS === 'web') return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/scanner-beep.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) sound.unloadAsync().catch(() => {});
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

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playBeep();

    // ── CALCULATOR CONTINUOUS MODE ──────────────────────────────────────
    if (isCalculatorMode) {
      setScanned(true);
      setLastCode(data);
      const existing = products.find((p) => p.barcode === data);
      if (existing) {
        invoiceStore.addItem({
          productId: existing.id,
          name: existing.name,
          sellingPriceSYP: existing.sellingPriceSYP,
          sellingPriceUSD: existing.sellingPriceUSD,
        });
        setLastAddedName(existing.name);
        // Reset after 1.5s for next scan — DO NOT navigate away
        setTimeout(() => {
          setScanned(false);
          setLastCode(null);
          setLastAddedName(null);
        }, 1500);
      } else {
        setUnknownBarcode(data);
        setShowUnknownModal(true);
        // Reset scan state so user can scan again after dismissing modal
        setTimeout(() => {
          setScanned(false);
          setLastCode(null);
        }, 300);
      }
      return;
    }

    // ── RETURN-TO-ADD MODE ──────────────────────────────────────────────
    if (returnTo === 'add') {
      isNavigating.current = true;
      setScanned(true);
      setLastCode(data);
      setTimeout(() => {
        setScanResult(data);
        router.back();
      }, 280);
      return;
    }

    // ── DEFAULT MODE ────────────────────────────────────────────────────
    isNavigating.current = true;
    setScanned(true);
    setLastCode(data);

    setTimeout(() => {
      const existing = products.find((p) => p.barcode === data);
      if (existing) {
        router.replace({ pathname: '/product/[id]', params: { id: existing.id } });
      } else {
        // Show "not found" modal — don't navigate away immediately
        setUnknownBarcode(data);
        setShowUnknownModal(true);
        setScanned(false);
        isNavigating.current = false;
      }
    }, 280);
  }

  function handleAddUnknown() {
    setShowUnknownModal(false);
    setUnknownBarcode(null);
    if (isCalculatorMode) {
      // In calculator mode, go to add product but come back
      router.push({ pathname: '/product/add', params: { barcode: unknownBarcode ?? '' } });
    } else {
      router.replace({ pathname: '/product/add', params: { barcode: unknownBarcode ?? '' } });
    }
  }

  function handleDismissUnknown() {
    setShowUnknownModal(false);
    setUnknownBarcode(null);
    setScanned(false);
    isNavigating.current = false;
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
        onBarcodeScanned={scanned && !isCalculatorMode ? undefined : handleBarcodeScanned}
      />

      <View style={[styles.overlay, { paddingTop: topInset + 8 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>
            {isCalculatorMode ? 'مسح الفاتورة' : 'ماسح الباركود'}
          </Text>

          <View style={styles.topRight}>
            {isCalculatorMode && invoiceCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{invoiceCount}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setFlashOn((v) => !v)}
              style={[styles.topBtn, flashOn && styles.topBtnActive]}
            >
              <Ionicons name={flashOn ? 'flash' : 'flash-outline'} size={22} color={flashOn ? '#FFD700' : '#fff'} />
            </TouchableOpacity>
            {isCalculatorMode && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <Text style={styles.doneBtnText}>تم ✓</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Frame area */}
        <View style={styles.scanFrame}>
          <Text style={styles.scanLabel}>
            {isCalculatorMode
              ? lastAddedName
                ? `✓ أُضيف: ${lastAddedName}`
                : 'وجّه الكاميرا نحو باركود المنتج'
              : scanned
              ? 'جاري المعالجة...'
              : 'وجّه الكاميرا نحو الباركود'}
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
                <Ionicons
                  name={lastAddedName ? 'checkmark-circle' : 'checkmark-circle'}
                  size={52}
                  color={lastAddedName ? '#4CAF50' : '#4CAF50'}
                />
              </View>
            )}
          </View>

          {lastCode && (
            <View style={styles.codeTag}>
              <Ionicons name="barcode-outline" size={14} color={CORNER_COLOR} />
              <Text style={styles.codeText} numberOfLines={1}>{lastCode}</Text>
            </View>
          )}

          {/* In normal mode, show rescan button */}
          {!isCalculatorMode && scanned && !showUnknownModal && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => { setScanned(false); setLastCode(null); isNavigating.current = false; }}
            >
              <Ionicons name="scan-outline" size={16} color="#fff" />
              <Text style={styles.rescanText}>مسح مجدداً</Text>
            </TouchableOpacity>
          )}

          {/* Calculator mode hint */}
          {isCalculatorMode && !scanned && (
            <View style={styles.calcHintRow}>
              <Ionicons name="infinite-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.calcHint}>الماسح يعمل باستمرار — أغلق عند الانتهاء</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            {flashOn ? '🔦 الفلاش مُفعَّل' : 'اضغط أيقونة الفلاش للإضاءة'}
          </Text>
        </View>
      </View>

      {/* Unknown barcode modal */}
      <Modal
        visible={showUnknownModal}
        transparent
        animationType="slide"
        onRequestClose={handleDismissUnknown}
      >
        <Pressable style={styles.modalOverlay} onPress={handleDismissUnknown}>
          <View style={styles.unknownSheet}>
            <Pressable onPress={() => {}}>
              <View style={styles.sheetHandle} />

              <View style={styles.unknownIconWrap}>
                <Ionicons name="barcode-outline" size={36} color="#F59E0B" />
              </View>

              <Text style={styles.unknownTitle}>باركود غير موجود</Text>
              <Text style={styles.unknownSub}>
                هذا المنتج غير موجود في قاعدة بياناتك
              </Text>

              {unknownBarcode && (
                <View style={styles.unknownCode}>
                  <Ionicons name="scan-outline" size={14} color={CORNER_COLOR} />
                  <Text style={styles.unknownCodeText}>{unknownBarcode}</Text>
                </View>
              )}

              <Text style={styles.unknownQuestion}>هل تريد إضافته الآن؟</Text>

              <View style={styles.unknownBtns}>
                <TouchableOpacity
                  style={[styles.unknownBtn, styles.unknownBtnCancel]}
                  onPress={handleDismissUnknown}
                  activeOpacity={0.8}
                >
                  <Text style={styles.unknownBtnCancelText}>لا، مسح مجدداً</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unknownBtn, styles.unknownBtnConfirm]}
                  onPress={handleAddUnknown}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.unknownBtnConfirmText}>نعم، إضافة</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    flex: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Tajawal_700Bold',
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CORNER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Tajawal_700Bold',
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
  calcHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  calcHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Tajawal_400Regular' },
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
  // Unknown barcode modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  unknownSheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 42,
    gap: 4,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  unknownIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  unknownTitle: { color: '#fff', fontSize: 22, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  unknownSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22 },
  unknownCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(75,123,245,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginVertical: 8,
    alignSelf: 'center',
  },
  unknownCodeText: { color: CORNER_COLOR, fontSize: 15, fontFamily: 'Tajawal_700Bold', letterSpacing: 1 },
  unknownQuestion: { color: '#fff', fontSize: 16, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  unknownBtns: { flexDirection: 'row', gap: 12 },
  unknownBtn: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  unknownBtnCancel: { backgroundColor: 'rgba(255,255,255,0.1)' },
  unknownBtnConfirm: { backgroundColor: CORNER_COLOR },
  unknownBtnCancelText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  unknownBtnConfirmText: { color: '#fff', fontSize: 15, fontFamily: 'Tajawal_700Bold' },
});
