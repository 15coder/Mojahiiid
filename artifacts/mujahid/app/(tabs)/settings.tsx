import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/context/CategoriesContext';
import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { Category } from '@/types/category';

const ICON_OPTIONS = [
  'nutrition-outline', 'leaf-outline', 'cafe-outline', 'flame-outline',
  'water-outline', 'happy-outline', 'cart-outline', 'bag-outline',
  'star-outline', 'heart-outline', 'gift-outline', 'cube-outline',
  'shirt-outline', 'home-outline', 'construct-outline', 'flower-outline',
  'fish-outline', 'pizza-outline', 'beer-outline', 'ice-cream-outline',
];

const COLOR_OPTIONS = [
  '#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#06B6D4', '#EC4899',
  '#8B5CF6', '#F97316', '#14B8A6', '#6366F1', '#84CC16', '#E11D48',
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { products, exportData, importData } = useProducts();
  const { categories, addCategory, updateCategory, deleteCategory, toggleCategoryVisibility } = useCategories();
  const { showToast } = useToast();
  const [rateInput, setRateInput] = useState(String(settings.exchangeRate));
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Category editor state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState(ICON_OPTIONS[0]);
  const [catColor, setCatColor] = useState(COLOR_OPTIONS[0]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  async function handleRateSubmit() {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      showToast({ message: 'يرجى إدخال سعر صرف صحيح', type: 'error' });
      return;
    }
    await updateSettings({ exchangeRate: val });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({ message: 'تم تحديث سعر الصرف', type: 'success' });
  }

  async function handleToggleBiometric(value: boolean) {
    if (Platform.OS === 'web') {
      showToast({ message: 'المصادقة البيومترية غير متاحة على الويب', type: 'warning' });
      return;
    }
    await updateSettings({ biometricEnabled: value });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleExport() {
    if (Platform.OS === 'web') {
      showToast({ message: 'التصدير غير متاح على الويب حالياً', type: 'warning' });
      return;
    }
    try {
      setIsExporting(true);
      const json = await exportData();
      const path = `${FileSystem.cacheDirectory}mujahid-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'مشاركة نسخة احتياطية' });
      } else {
        showToast({ message: 'تم حفظ الملف بنجاح', type: 'success' });
      }
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل التصدير', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport() {
    if (Platform.OS === 'web') {
      showToast({ message: 'الاستيراد غير متاح على الويب حالياً', type: 'warning' });
      return;
    }
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      const json = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      Alert.alert(
        'تأكيد الاستيراد',
        'سيتم استبدال جميع المنتجات الحالية بالبيانات المستوردة. هل أنت متأكد؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'استيراد',
            style: 'destructive',
            onPress: async () => {
              try {
                const count = await importData(json);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast({ message: `تم استيراد ${count} منتج بنجاح`, type: 'success' });
              } catch (e: any) {
                showToast({ message: e?.message || 'فشل الاستيراد', type: 'error' });
              }
            },
          },
        ]
      );
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل فتح الملف', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  }

  function openAddCategory() {
    setEditingCat(null);
    setCatName('');
    setCatIcon(ICON_OPTIONS[0]);
    setCatColor(COLOR_OPTIONS[0]);
    setShowCatModal(true);
  }

  function openEditCategory(cat: Category) {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setShowCatModal(true);
  }

  async function handleSaveCategory() {
    if (!catName.trim()) {
      showToast({ message: 'اسم القسم مطلوب', type: 'error' });
      return;
    }
    if (editingCat) {
      await updateCategory(editingCat.id, { name: catName.trim(), icon: catIcon, color: catColor });
      showToast({ message: 'تم تعديل القسم', type: 'success' });
    } else {
      await addCategory(catName.trim(), catIcon, catColor);
      showToast({ message: 'تم إضافة القسم', type: 'success' });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCatModal(false);
  }

  async function handleDeleteCategory(cat: Category) {
    Alert.alert(
      'حذف القسم',
      `هل تريد حذف قسم "${cat.name}"؟ لن تُحذف المنتجات المرتبطة به.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast({ message: `تم حذف قسم "${cat.name}"`, type: 'info' });
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.fixedHeader, { paddingTop: topInset, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTexts}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>الإعدادات</Text>
          <Text style={[styles.pageSubtitle, { color: colors.silver }]}>مجاهد للتجارة</Text>
        </View>
        <Image source={require('@/assets/images/icon.png')} style={styles.headerIcon} contentFit="contain" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 56 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Exchange Rate */}
        <SectionHeader title="معدل الصرف" colors={colors} icon="cash-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>سعر الدولار بالليرة السورية</Text>
          <View style={styles.rateRow}>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleRateSubmit} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
            <TextInput
              style={[styles.rateInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              value={rateInput}
              onChangeText={setRateInput}
              keyboardType="numeric"
              textAlign="right"
              onSubmitEditing={handleRateSubmit}
              placeholder="مثال: 13500"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={[styles.rateBadge, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.rateNote, { color: colors.primary }]}>
              1 USD = {Number(settings.exchangeRate).toLocaleString('ar-SY')} ل.س
            </Text>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.primary} />
          </View>
        </View>

        {/* Categories */}
        <SectionHeader title="الأقسام" colors={colors} icon="grid-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
          {categories.map((cat, idx) => (
            <View key={cat.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.catRow}>
                <View style={styles.catRowLeft}>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleDeleteCategory(cat); }}
                    style={[styles.catAction, { backgroundColor: colors.destructive + '18' }]}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openEditCategory(cat); }}
                    style={[styles.catAction, { backgroundColor: colors.primary + '18' }]}
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleCategoryVisibility(cat.id); }}
                    style={[styles.catAction, { backgroundColor: cat.hidden ? colors.muted : colors.success + '18' }]}
                  >
                    <Ionicons
                      name={cat.hidden ? 'eye-off-outline' : 'eye-outline'}
                      size={15}
                      color={cat.hidden ? colors.silver : colors.success}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.catRowCenter}>
                  <Text style={[
                    styles.catName,
                    { color: cat.hidden ? colors.silver : colors.foreground },
                  ]}>
                    {cat.name}
                  </Text>
                  {cat.hidden && (
                    <Text style={[styles.catHiddenBadge, { color: colors.silver }]}>مخفي</Text>
                  )}
                </View>

                <View style={[styles.catIconWrap, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                </View>
              </View>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.addCatBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openAddCategory(); }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.addCatText, { color: colors.primary }]}>إضافة قسم جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Security */}
        <SectionHeader title="الأمان" colors={colors} icon="shield-checkmark-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
            <View style={styles.switchTexts}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>قفل بصمة الإصبع</Text>
              <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>يتطلب إعادة تشغيل التطبيق</Text>
            </View>
            <Ionicons name="finger-print" size={24} color={colors.primary} />
          </View>
        </View>

        {/* Backup */}
        <SectionHeader title="النسخ الاحتياطي" colors={colors} icon="cloud-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 12 }]}>
          <Text style={[styles.backupNote, { color: colors.mutedForeground }]}>
            تصدير بيانات {products.length} منتج أو استيراد نسخة احتياطية.
          </Text>
          <View style={styles.backupBtns}>
            <TouchableOpacity style={[styles.backupBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleExport} disabled={isExporting} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={16} color={colors.primaryForeground} />
              <Text style={[styles.backupBtnText, { color: colors.primaryForeground }]}>{isExporting ? 'جاري...' : 'تصدير'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.backupBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={handleImport} disabled={isImporting} activeOpacity={0.8}>
              <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
              <Text style={[styles.backupBtnText, { color: colors.primary }]}>{isImporting ? 'جاري...' : 'استيراد'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info */}
        <SectionHeader title="معلومات التطبيق" colors={colors} icon="information-circle-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow label="اسم التطبيق" value="مجاهد للتجارة" colors={colors} />
          <InfoRow label="الإصدار" value="1.1.0" colors={colors} />
          <InfoRow label="عدد المنتجات" value={String(products.length)} colors={colors} />
          <InfoRow label="عدد الأقسام" value={String(categories.length)} colors={colors} last />
        </View>

        {/* Contact */}
        <SectionHeader title="الدعم والتواصل" colors={colors} icon="headset-outline" />
        <TouchableOpacity
          style={[styles.card, styles.contactCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/contact'); }}
          activeOpacity={0.8}
        >
          <View style={[styles.contactIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="person-outline" size={18} color={colors.primaryForeground} />
          </View>
          <View style={styles.contactTexts}>
            <Text style={[styles.contactTitle, { color: colors.foreground }]}>تواصل مع المُبرمج</Text>
            <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>نداء الرحمن عبّود</Text>
          </View>
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>

      {/* Category Editor Modal */}
      <Modal visible={showCatModal} transparent animationType="slide" onRequestClose={() => setShowCatModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCatModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingCat ? 'تعديل القسم' : 'قسم جديد'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Preview */}
              <View style={styles.previewRow}>
                <View style={[styles.previewIcon, { backgroundColor: catColor + '22' }]}>
                  <Ionicons name={catIcon as any} size={28} color={catColor} />
                </View>
                <Text style={[styles.previewName, { color: colors.foreground }]}>
                  {catName || 'اسم القسم'}
                </Text>
              </View>

              {/* Name */}
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>اسم القسم</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                value={catName}
                onChangeText={setCatName}
                placeholder="أدخل اسم القسم"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />

              {/* Color */}
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>اللون</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
                {COLOR_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: catColor === c ? 3 : 0, borderColor: colors.foreground }]}
                    onPress={() => setCatColor(c)}
                  />
                ))}
              </ScrollView>

              {/* Icon */}
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>الأيقونة</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((ico) => (
                  <TouchableOpacity
                    key={ico}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: catIcon === ico ? catColor + '22' : colors.secondary,
                        borderColor: catIcon === ico ? catColor : 'transparent',
                        borderWidth: 1.5,
                      }
                    ]}
                    onPress={() => setCatIcon(ico)}
                  >
                    <Ionicons name={ico as any} size={22} color={catIcon === ico ? catColor : colors.silver} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveCategory}
              >
                <Text style={[styles.saveModalBtnText, { color: colors.primaryForeground }]}>
                  {editingCat ? 'حفظ التعديلات' : 'إضافة القسم'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function SectionHeader({ title, colors, icon }: { title: string; colors: any; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={13} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

function InfoRow({ label, value, colors, last }: { label: string; value: string; colors: any; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { width: 38, height: 38, borderRadius: 11 },
  headerTexts: { alignItems: 'center', flex: 1 },
  pageTitle: { fontSize: 20, fontFamily: 'Tajawal_700Bold' },
  pageSubtitle: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 10, gap: 6 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 11, fontFamily: 'Tajawal_700Bold', textAlign: 'right', letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 2,
    gap: 10,
  },
  label: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateInput: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    fontFamily: 'Tajawal_500Medium',
  },
  saveBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  rateNote: { fontSize: 13, fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
  // Category rows
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  catRowLeft: { flexDirection: 'row', gap: 6 },
  catAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRowCenter: { flex: 1, alignItems: 'flex-end', gap: 2 },
  catName: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  catHiddenBadge: { fontSize: 10, fontFamily: 'Tajawal_400Regular' },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, marginVertical: 0 },
  addCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addCatText: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  // Switch
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTexts: { flex: 1, alignItems: 'flex-end' },
  switchLabel: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  switchNote: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  // Backup
  backupNote: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 20 },
  backupBtns: { flexDirection: 'row', gap: 10 },
  backupBtn: {
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  backupBtnText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  // Info
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoValue: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'left' },
  infoLabel: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  // Contact
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  contactIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactTexts: { flex: 1, alignItems: 'flex-end' },
  contactTitle: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  contactSub: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 16 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'center' },
  previewIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 18, fontFamily: 'Tajawal_700Bold' },
  modalLabel: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right', marginBottom: 6 },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Tajawal_500Medium',
    marginBottom: 14,
  },
  colorRow: { flexDirection: 'row', gap: 10, paddingVertical: 4, marginBottom: 14 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  saveModalBtnText: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
});
