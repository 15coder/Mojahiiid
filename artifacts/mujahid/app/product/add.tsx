import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
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
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { usdToSyp, sypToUsd } from '@/utils/priceUtils';

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
  const { addProduct } = useProducts();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(params.barcode ?? '');
  const [costSYP, setCostSYP] = useState('');
  const [costUSD, setCostUSD] = useState('');
  const [sellSYP, setSellSYP] = useState('');
  const [sellUSD, setSellUSD] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

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
    try {
      setIsSaving(true);
      const savedPaths = await Promise.all(images.map(saveImageLocally));
      await addProduct({
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
      showToast({ message: e?.message || 'فشل حفظ المنتج', type: 'error' });
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إضافة منتج</Text>
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

          <FieldLabel label="الباركود (اختياري)" colors={colors} />
          <View style={styles.barcodeRow}>
            <TouchableOpacity
              style={[styles.scanBtn, { backgroundColor: colors.secondary }]}
              onPress={() => router.push({ pathname: '/scanner', params: { returnTo: 'add' } })}
            >
              <Ionicons name="barcode-outline" size={20} color={colors.primary} />
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
                <Image source={{ uri }} style={[styles.imageThumb, { borderRadius: colors.radius * 0.8 }]} contentFit="cover" />
                <TouchableOpacity style={[styles.removeImgBtn, { backgroundColor: colors.destructive }]} onPress={() => removeImage(idx)}>
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
        </Section>

        <Section title="أسعار التكلفة" icon="trending-down-outline" colors={colors}>
          <View style={styles.priceRow}>
            <View style={styles.flex}>
              <FieldLabel label="USD" colors={colors} />
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
              <FieldLabel label="ل.س SYP" colors={colors} />
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
              <FieldLabel label="USD" colors={colors} />
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
              <FieldLabel label="ل.س SYP" colors={colors} />
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
            سعر الصرف: 1 USD = {settings.exchangeRate.toLocaleString('ar-SY')} ل.س
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
    </View>
  );
}

function Section({ title, icon, colors, children }: { title: string; icon: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
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
  scrollContent: { padding: 16, gap: 4 },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
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
  flex: { flex: 1 },
  barcodeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rateNote: {
    fontSize: 11,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
  },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 15,
    fontFamily: 'Tajawal_500Medium',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    position: 'relative',
  },
  imageThumb: {
    width: 80,
    height: 80,
  },
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
