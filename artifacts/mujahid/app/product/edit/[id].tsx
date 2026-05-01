import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
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

  const product = getProductById(id);

  const [name, setName] = useState(product?.name ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [costSYP, setCostSYP] = useState(String(product?.costSYP ?? ''));
  const [costUSD, setCostUSD] = useState(String(product?.costUSD ?? ''));
  const [sellSYP, setSellSYP] = useState(String(product?.sellingPriceSYP ?? ''));
  const [sellUSD, setSellUSD] = useState(String(product?.sellingPriceUSD ?? ''));
  const [notes, setNotes] = useState(product?.notes ?? '');
  const [images, setImages] = useState<string[]>(product?.imagePaths ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[{ color: colors.mutedForeground, fontSize: 16, fontFamily: 'Tajawal_500Medium' }]}>المنتج غير موجود</Text>
      </View>
    );
  }

  function handleCostSYPChange(val: string) {
    setCostSYP(val);
    const n = parseFloat(val);
    if (!isNaN(n) && settings.exchangeRate > 0) {
      setCostUSD(String(sypToUsd(n, settings.exchangeRate)));
    }
  }

  function handleCostUSDChange(val: string) {
    setCostUSD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setCostSYP(String(usdToSyp(n, settings.exchangeRate)));
    }
  }

  function handleSellSYPChange(val: string) {
    setSellSYP(val);
    const n = parseFloat(val);
    if (!isNaN(n) && settings.exchangeRate > 0) {
      setSellUSD(String(sypToUsd(n, settings.exchangeRate)));
    }
  }

  function handleSellUSDChange(val: string) {
    setSellUSD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) {
      setSellSYP(String(usdToSyp(n, settings.exchangeRate)));
    }
  }

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('صلاحية مرفوضة', 'يرجى السماح للتطبيق بالوصول إلى الصور');
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
      Alert.alert('خطأ', 'اسم المنتج مطلوب');
      return;
    }
    try {
      setIsSaving(true);
      const savedPaths = await Promise.all(images.map(saveImageLocally));
      await updateProduct(product!.id, {
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        imagePaths: savedPaths,
        costSYP: parseFloat(costSYP) || 0,
        costUSD: parseFloat(costUSD) || 0,
        sellingPriceSYP: parseFloat(sellSYP) || 0,
        sellingPriceUSD: parseFloat(sellUSD) || 0,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>تعديل المنتج</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
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
                <Ionicons name="add" size={28} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </FieldSection>

        <View style={styles.twoCol}>
          <View style={styles.flex}>
            <FieldSection title="تكلفة ل.س" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={costSYP}
                onChangeText={handleCostSYPChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </FieldSection>
          </View>
          <View style={styles.flex}>
            <FieldSection title="تكلفة USD" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={costUSD}
                onChangeText={handleCostUSDChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
              />
            </FieldSection>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.flex}>
            <FieldSection title="بيع ل.س" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={sellSYP}
                onChangeText={handleSellSYPChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </FieldSection>
          </View>
          <View style={styles.flex}>
            <FieldSection title="بيع USD" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={sellUSD}
                onChangeText={handleSellUSDChange}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
              />
            </FieldSection>
          </View>
        </View>

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
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
    flex: 1,
  },
  headerBtn: { padding: 4 },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Tajawal_700Bold',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  fieldSection: { gap: 4 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Tajawal_500Medium',
  },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 15,
    fontFamily: 'Tajawal_500Medium',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: { flex: 1 },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: { position: 'relative' },
  imageThumb: { width: 80, height: 80 },
  removeImgBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
