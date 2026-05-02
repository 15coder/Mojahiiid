import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
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
import { usdToSyp, sypToUsd } from '@/utils/priceUtils';
import { consumeScanResult } from '@/utils/scanResult';

async function saveImageLocally(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dir = `${FileSystem.documentDirectory}mujahid-images/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const ext = uri.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const dest = dir + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export default function AddProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addProduct, products } = useProducts();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { visibleCategories } = useCategories();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(params.barcode ?? '');

  useFocusEffect(
    useCallback(() => {
      const result = consumeScanResult();
      if (result) {
        setBarcode(result);
      }
    }, [])
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [costSYP, setCostSYP] = useState('');
  const [costUSD, setCostUSD] = useState('');
  const [sellSYP, setSellSYP] = useState('');
  const [sellUSD, setSellUSD] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showImageSource, setShowImageSource] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const selectedCategory = visibleCategories.find((c) => c.id === categoryId);

  function handleCostSYPChange(val: string) {
    setCostSYP(val);
    const n = parseFloat(val);
    if (!isNaN(n) && settings.exchangeRate > 0) {
      setCostUSD(sypToUsd(n, settings.exchangeRate).toString());
    }
  }

  function handleCostUSDChange(val: string) {
    setCostUSD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setCostSYP(usdToSyp(n, settings.exchangeRate).toString());
    }
  }

  function handleSellSYPChange(val: string) {
    setSellSYP(val);
    const n = parseFloat(val);
    if (!isNaN(n) && settings.exchangeRate > 0) {
      setSellUSD(sypToUsd(n, settings.exchangeRate).toString());
    }
  }

  function handleSellUSDChange(val: string) {
    setSellUSD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setSellSYP(usdToSyp(n, settings.exchangeRate).toString());
    }
  }

  async function pickFromCamera() {
    setShowImageSource(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast({ message: 'يرجى السماح للتطبيق بالوصول إلى الكاميرا', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  }

  async function pickFromGallery() {
    setShowImageSource(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({ message: 'يرجى السماح للتطبيق بالوصول إلى الصور', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) {
      showToast({ message: 'اسم المنتج مطلوب', type: 'error' });
      return;
    }
    const trimmedBarcode = barcode.trim();
    if (trimmedBarcode) {
      const duplicate = products.find((p) => p.barcode === trimmedBarcode);
      if (duplicate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast({ message: `الباركود مستخدم مسبقاً في: "${duplicate.name}"`, type: 'error' });
        return;
      }
    }
    try {
      setIsSaving(true);
      const savedPaths = await Promise.all(images.map(saveImageLocally));
      await addProduct({
        name: name.trim(),
        barcode: trimmedBarcode || undefined,
        categoryId: categoryId,
        imagePaths: savedPaths,
        costSYP: parseFloat(costSYP) || 0,
        costUSD: parseFloat(costUSD) || 0,
        sellingPriceSYP: parseFloat(sellSYP) || 0,
        sellingPriceUSD: parseFloat(sellUSD) || 0,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ message: 'تم إضافة المنتج بنجاح', type: 'success' });
      router.back();
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل حفظ المنتج', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إضافة منتج</Text>
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Section title="معلومات المنتج" icon="information-circle-outline" colors={colors}>
          <FieldLabel label="اسم المنتج *" colors={colors} />
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={name}
            onChangeText={setName}
            placeholder="أدخل اسم المنتج"
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />

          <FieldLabel label="القسم" colors={colors} />
          <TouchableOpacity
            style={[styles.categorySelector, { borderColor: colors.border, backgroundColor: colors.input }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            {selectedCategory ? (
              <View style={styles.selectedCategoryRow}>
                <Ionicons name={selectedCategory.icon as any} size={18} color={selectedCategory.color} />
                <Text style={[styles.selectedCategoryText, { color: colors.foreground }]}>
                  {selectedCategory.name}
                </Text>
              </View>
            ) : (
              <Text style={[styles.categoryPlaceholder, { color: colors.mutedForeground }]}>
                اختر قسم المنتج
              </Text>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.silver} />
          </TouchableOpacity>

          <FieldLabel label="الباركود (اختياري)" colors={colors} />
          <View style={styles.barcodeRow}>
            <TouchableOpacity
              style={[styles.scanBtn, { backgroundColor: colors.secondary }]}
              onPress={() => router.push('/scanner?returnTo=add')}
            >
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.flex, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              value={barcode}
              onChangeText={setBarcode}
              placeholder="أدخل أو امسح الباركود"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              keyboardType="default"
            />
          </View>
        </Section>

        <Section title="الصور" icon="images-outline" colors={colors}>
          <View style={styles.imagesRow}>
            {images.map((uri, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri }} style={[styles.imageThumb, { borderRadius: 12 }]} contentFit="cover" />
                <TouchableOpacity style={[styles.removeImgBtn, { backgroundColor: colors.destructive }]} onPress={() => removeImage(idx)}>
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                style={[styles.addImageBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                onPress={() => setShowImageSource(true)}
              >
                <Ionicons name="camera-outline" size={26} color={colors.primary} />
                <Text style={[styles.addImageText, { color: colors.silver }]}>إضافة</Text>
              </TouchableOpacity>
            )}
          </View>
        </Section>

        <Section title="أسعار التكلفة" icon="trending-down-outline" colors={colors}>
          <View style={styles.priceRow}>
            <View style={styles.flex}>
              <FieldLabel label="بالدولار USD" colors={colors} />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={costUSD}
                onChangeText={handleCostUSDChange}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
            <View style={styles.flex}>
              <FieldLabel label="بالليرة ل.س" colors={colors} />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={costSYP}
                onChangeText={handleCostSYPChange}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
          </View>
        </Section>

        <Section title="أسعار البيع" icon="trending-up-outline" colors={colors}>
          <View style={styles.priceRow}>
            <View style={styles.flex}>
              <FieldLabel label="بالدولار USD" colors={colors} />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={sellUSD}
                onChangeText={handleSellUSDChange}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
            <View style={styles.flex}>
              <FieldLabel label="بالليرة ل.س" colors={colors} />
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={sellSYP}
                onChangeText={handleSellSYPChange}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
          </View>
          <Text style={[styles.rateNote, { color: colors.silver }]}>
            سعر الصرف: 1$ = {settings.exchangeRate.toLocaleString('ar-SY')} ل.س
          </Text>
        </Section>

        <Section title="ملاحظات" icon="document-text-outline" colors={colors}>
          <TextInput
            style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="أضف ملاحظات عن المنتج..."
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            multiline
            numberOfLines={4}
          />
        </Section>
      </KeyboardAwareScrollView>

      <Modal visible={showImageSource} transparent animationType="slide" onRequestClose={() => setShowImageSource(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowImageSource(false)}>
          <View style={[styles.sourceSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>إضافة صورة</Text>
            <TouchableOpacity style={[styles.sourceOption, { borderColor: colors.border }]} onPress={pickFromCamera} activeOpacity={0.8}>
              <View style={[styles.sourceIconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="camera" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.sourceLabel, { color: colors.foreground }]}>التصوير بالكاميرا</Text>
                <Text style={[styles.sourceSub, { color: colors.mutedForeground }]}>التقاط صورة جديدة الآن</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sourceOption, { borderColor: colors.border }]} onPress={pickFromGallery} activeOpacity={0.8}>
              <View style={[styles.sourceIconWrap, { backgroundColor: colors.secondary }]}>
                <Ionicons name="images" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.sourceLabel, { color: colors.foreground }]}>الاختيار من المعرض</Text>
                <Text style={[styles.sourceSub, { color: colors.mutedForeground }]}>اختيار صور موجودة</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.muted }]} onPress={() => setShowImageSource(false)} activeOpacity={0.8}>
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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
    </View>
  );
}

function Section({ title, icon, colors, children }: { title: string; icon: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={14} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>;
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
  headerTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', textAlign: 'center', flex: 1 },
  headerBtn: { padding: 4, width: 36 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 4 },
  section: { marginBottom: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: 'Tajawal_700Bold', textAlign: 'right', letterSpacing: 0.3 },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Tajawal_500Medium' },
  categorySelector: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  selectedCategoryText: { fontSize: 15, fontFamily: 'Tajawal_500Medium', flex: 1, textAlign: 'right' },
  categoryPlaceholder: { fontSize: 14, fontFamily: 'Tajawal_400Regular', flex: 1, textAlign: 'right' },
  flex: { flex: 1 },
  barcodeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', gap: 10 },
  rateNote: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  textarea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 15, fontFamily: 'Tajawal_500Medium', minHeight: 96, textAlignVertical: 'top' },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: { position: 'relative' },
  imageThumb: { width: 76, height: 76 },
  removeImgBtn: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addImageBtn: { width: 76, height: 76, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addImageText: { fontSize: 10, fontFamily: 'Tajawal_400Regular' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sourceSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, padding: 20, paddingBottom: 32, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 4 },
  sourceOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1 },
  sourceIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sourceLabel: { fontSize: 16, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  sourceSub: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, padding: 20, paddingBottom: 32, maxHeight: '70%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 12 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
  catOptionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catOptionText: { flex: 1, fontSize: 15, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
});
