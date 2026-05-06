import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/context/CategoriesContext';
import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { sypToUsd, usdToSyp } from '@/utils/priceUtils';

async function saveImageLocally(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  if (uri.startsWith(`${FileSystem.documentDirectory}`)) return uri;
  const dir = `${FileSystem.documentDirectory}mujahid-images/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const ext = uri.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const dest = dir + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export default function EditProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProductById, updateProduct } = useProducts();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { visibleCategories } = useCategories();

  const product = getProductById(id);

  const [name, setName] = useState(product?.name ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(product?.categoryId);
  const [costSYP, setCostSYP] = useState(String(product?.costSYP ?? ''));
  const [costSYPNew, setCostSYPNew] = useState(product?.costSYP ? String(Math.floor(product.costSYP / 100)) : '');
  const [costUSD, setCostUSD] = useState(String(product?.costUSD ?? ''));
  const [sellSYP, setSellSYP] = useState(String(product?.sellingPriceSYP ?? ''));
  const [sellSYPNew, setSellSYPNew] = useState(product?.sellingPriceSYP ? String(Math.floor(product.sellingPriceSYP / 100)) : '');
  const [sellUSD, setSellUSD] = useState(String(product?.sellingPriceUSD ?? ''));
  const [notes, setNotes] = useState(product?.notes ?? '');
  const [images, setImages] = useState<string[]>(product?.imagePaths ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const selectedCategory = visibleCategories.find((c) => c.id === categoryId);

  const isDirty = useMemo(() => {
    if (!product) return false;
    return (
      name !== (product.name ?? '') ||
      barcode !== (product.barcode ?? '') ||
      costSYP !== String(product.costSYP ?? '') ||
      costUSD !== String(product.costUSD ?? '') ||
      sellSYP !== String(product.sellingPriceSYP ?? '') ||
      sellUSD !== String(product.sellingPriceUSD ?? '') ||
      notes !== (product.notes ?? '') ||
      categoryId !== product.categoryId
    );
  }, [name, barcode, costSYP, costUSD, sellSYP, sellUSD, notes, categoryId, product]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isDirty) {
        setShowDiscardModal(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isDirty]);

  const costSYPNum = parseFloat(costSYP) || 0;
  const sellSYPNum = parseFloat(sellSYP) || 0;
  const profitSYP = sellSYPNum - costSYPNum;
  const marginPct = costSYPNum > 0 ? (profitSYP / costSYPNum) * 100 : 0;
  const showMargin = costSYPNum > 0 || sellSYPNum > 0;

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: 'Tajawal_500Medium' }}>المنتج غير موجود</Text>
      </View>
    );
  }

  function handleCostSYPChange(val: string) {
    setCostSYP(val);
    if (!val.trim() || val === '.') { setCostSYPNew(''); setCostUSD(''); return; }
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setCostSYPNew(String(Math.floor(n / 100)));
      if (settings.exchangeRate > 0) setCostUSD(String(sypToUsd(n, settings.exchangeRate)));
    }
  }

  function handleCostSYPNewChange(val: string) {
    setCostSYPNew(val);
    if (!val.trim() || val === '.') { setCostSYP(''); setCostUSD(''); return; }
    const n = parseFloat(val);
    if (!isNaN(n)) {
      const oldVal = Math.round(n * 100);
      setCostSYP(String(oldVal));
      if (settings.exchangeRate > 0) setCostUSD(String(sypToUsd(oldVal, settings.exchangeRate)));
    }
  }

  function handleCostUSDChange(val: string) {
    setCostUSD(val);
    if (!val.trim() || val === '.') { setCostSYP(''); setCostSYPNew(''); return; }
    const n = parseFloat(val);
    if (!isNaN(n)) {
      const oldVal = usdToSyp(n, settings.exchangeRate);
      setCostSYP(String(oldVal));
      setCostSYPNew(String(Math.floor(oldVal / 100)));
    }
  }

  function handleSellSYPChange(val: string) {
    setSellSYP(val);
    if (!val.trim() || val === '.') { setSellSYPNew(''); setSellUSD(''); return; }
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setSellSYPNew(String(Math.floor(n / 100)));
      if (settings.exchangeRate > 0) setSellUSD(String(sypToUsd(n, settings.exchangeRate)));
    }
  }

  function handleSellSYPNewChange(val: string) {
    setSellSYPNew(val);
    if (!val.trim() || val === '.') { setSellSYP(''); setSellUSD(''); return; }
    const n = parseFloat(val);
    if (!isNaN(n)) {
      const oldVal = Math.round(n * 100);
      setSellSYP(String(oldVal));
      if (settings.exchangeRate > 0) setSellUSD(String(sypToUsd(oldVal, settings.exchangeRate)));
    }
  }

  function handleSellUSDChange(val: string) {
    setSellUSD(val);
    if (!val.trim() || val === '.') { setSellSYP(''); setSellSYPNew(''); return; }
    const n = parseFloat(val);
    if (!isNaN(n)) {
      const oldVal = usdToSyp(n, settings.exchangeRate);
      setSellSYP(String(oldVal));
      setSellSYPNew(String(Math.floor(oldVal / 100)));
    }
  }

  function handleClose() {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      router.back();
    }
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast({ message: 'يرجى السماح للتطبيق بالوصول إلى الكاميرا', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({ message: 'يرجى السماح للتطبيق بالوصول إلى الصور', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  }

  function pickImages() {
    Alert.alert(
      'إضافة صورة',
      'اختر مصدر الصورة',
      [
        { text: 'الكاميرا', onPress: pickFromCamera },
        { text: 'معرض الصور', onPress: pickFromGallery },
        { text: 'إلغاء', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) {
      showToast({ message: 'اسم المنتج مطلوب', type: 'error' });
      return;
    }
    try {
      setIsSaving(true);
      const savedPaths = await Promise.all(images.map(saveImageLocally));
      await updateProduct(product!.id, {
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        categoryId: categoryId,
        imagePaths: savedPaths,
        costSYP: parseFloat(costSYP) || 0,
        costUSD: parseFloat(costUSD) || 0,
        sellingPriceSYP: parseFloat(sellSYP) || 0,
        sellingPriceUSD: parseFloat(sellUSD) || 0,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ message: 'تم حفظ التعديلات', type: 'success' });
      router.back();
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل حفظ التعديلات', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>تعديل المنتج</Text>
          {isDirty && (
            <Text style={[styles.unsavedBadge, { color: colors.destructive }]}>• تغييرات غير محفوظة</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            {isSaving ? 'جاري...' : 'حفظ'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FieldSection title="اسم المنتج *" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={name}
            onChangeText={setName}
            placeholder="اسم المنتج"
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />
        </FieldSection>

        <FieldSection title="القسم" colors={colors}>
          <TouchableOpacity
            style={[styles.categorySelector, { borderColor: colors.border, backgroundColor: colors.input }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            {selectedCategory ? (
              <View style={styles.selectedCategoryRow}>
                <Ionicons name={selectedCategory.icon as any} size={18} color={selectedCategory.color} />
                <Text style={[styles.selectedCategoryText, { color: colors.foreground }]}>{selectedCategory.name}</Text>
              </View>
            ) : (
              <Text style={[styles.categoryPlaceholder, { color: colors.mutedForeground }]}>اختر قسم المنتج</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.silver} />
          </TouchableOpacity>
        </FieldSection>

        <FieldSection title="الباركود" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="اختياري"
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />
        </FieldSection>

        <FieldSection title="الصور" colors={colors}>
          <View style={styles.imagesRow}>
            {images.map((uri, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri }} style={[styles.imageThumb, { borderRadius: 10 }]} contentFit="cover" />
                <TouchableOpacity
                  style={[styles.removeImgBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => removeImage(idx)}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                style={[styles.addImageBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                onPress={pickImages}
              >
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </FieldSection>

        {/* Cost prices */}
        <View style={[styles.fieldSection, { gap: 4 }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>أسعار التكلفة</Text>
          <View style={styles.threeCol}>
            <View style={styles.flex}>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>USD</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={costUSD}
                onChangeText={handleCostUSDChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>ل.س.ق</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={costSYP}
                onChangeText={handleCostSYPChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>ل.س.ج</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.primary + '60', backgroundColor: colors.input }]}
                value={costSYPNew}
                onChangeText={handleCostSYPNewChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        {/* Selling prices */}
        <View style={[styles.fieldSection, { gap: 4 }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>أسعار البيع</Text>
          <View style={styles.threeCol}>
            <View style={styles.flex}>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>USD</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={sellUSD}
                onChangeText={handleSellUSDChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>ل.س.ق</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={sellSYP}
                onChangeText={handleSellSYPChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>ل.س.ج</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.primary + '60', backgroundColor: colors.input }]}
                value={sellSYPNew}
                onChangeText={handleSellSYPNewChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        {/* Live profit margin */}
        {showMargin && (
          <View
            style={[
              styles.profitRow,
              { backgroundColor: profitSYP >= 0 ? '#22C55E18' : '#EF444418', borderColor: profitSYP >= 0 ? '#22C55E33' : '#EF444433' },
            ]}
          >
            <Ionicons
              name={profitSYP >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
              size={18}
              color={profitSYP >= 0 ? '#22C55E' : '#EF4444'}
            />
            <Text style={[styles.profitText, { color: profitSYP >= 0 ? '#22C55E' : '#EF4444' }]}>
              {profitSYP >= 0 ? 'ربح' : 'خسارة'}: {(Math.abs(profitSYP) / 100).toLocaleString('ar-SY')} ل.س.ج
              {costSYPNum > 0 && ` (${Math.abs(marginPct).toFixed(1)}%)`}
            </Text>
          </View>
        )}

        <FieldSection title="ملاحظات" colors={colors}>
          <TextInput
            style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="ملاحظات اختيارية..."
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            multiline
            numberOfLines={3}
          />
        </FieldSection>
      </KeyboardAwareScrollView>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCategoryPicker(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر القسم</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.categoryOption, categoryId === undefined && { backgroundColor: colors.secondary }]}
                onPress={() => { setCategoryId(undefined); setShowCategoryPicker(false); }}
              >
                <View style={[styles.catOptionIcon, { backgroundColor: colors.muted }]}>
                  <Ionicons name="apps-outline" size={20} color={colors.silver} />
                </View>
                <Text style={[styles.catOptionText, { color: colors.foreground }]}>بدون قسم</Text>
                {categoryId === undefined && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {visibleCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryOption, categoryId === cat.id && { backgroundColor: colors.secondary }]}
                  onPress={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                >
                  <View style={[styles.catOptionIcon, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <Text style={[styles.catOptionText, { color: colors.foreground }]}>{cat.name}</Text>
                  {categoryId === cat.id && <Ionicons name="checkmark-circle" size={20} color={cat.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Discard Changes Modal */}
      <Modal visible={showDiscardModal} transparent animationType="fade" onRequestClose={() => setShowDiscardModal(false)}>
        <Pressable style={styles.discardOverlay} onPress={() => setShowDiscardModal(false)}>
          <View style={[styles.discardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => {}}>
              <View style={[styles.discardIcon, { backgroundColor: colors.destructive + '15' }]}>
                <Ionicons name="warning-outline" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.discardTitle, { color: colors.foreground }]}>تجاهل التعديلات؟</Text>
              <Text style={[styles.discardMsg, { color: colors.mutedForeground }]}>
                لديك تغييرات غير محفوظة. هل تريد تجاهلها والخروج؟
              </Text>
              <View style={styles.discardBtns}>
                <TouchableOpacity
                  style={[styles.discardBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => setShowDiscardModal(false)}
                >
                  <Text style={[styles.discardBtnText, { color: colors.foreground }]}>تراجع</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.discardBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => { setShowDiscardModal(false); router.back(); }}
                >
                  <Text style={[styles.discardBtnText, { color: '#fff' }]}>تجاهل</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function FieldSection({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.fieldSection}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  unsavedBadge: { fontSize: 10, fontFamily: 'Tajawal_500Medium' },
  headerBtn: { padding: 4, width: 36 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  fieldSection: { gap: 4 },
  fieldLabel: { fontSize: 12, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  subLabel: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right', marginBottom: 2 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  categorySelector: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  selectedCategoryText: { fontSize: 15, fontFamily: 'Tajawal_500Medium', flex: 1, textAlign: 'right' },
  categoryPlaceholder: { fontSize: 14, fontFamily: 'Tajawal_400Regular', flex: 1, textAlign: 'right' },
  textarea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 15, fontFamily: 'Tajawal_500Medium', minHeight: 90, textAlignVertical: 'top' },
  threeCol: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: { position: 'relative' },
  imageThumb: { width: 78, height: 78 },
  removeImgBtn: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addImageBtn: { width: 78, height: 78, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  profitText: { fontSize: 14, fontFamily: 'Tajawal_700Bold', flex: 1, textAlign: 'right' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 20, maxHeight: '70%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 16 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  catOptionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catOptionText: { flex: 1, fontSize: 15, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  discardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  discardBox: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 24 },
  discardIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  discardTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 8 },
  discardMsg: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  discardBtns: { flexDirection: 'row', gap: 10 },
  discardBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  discardBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
});
