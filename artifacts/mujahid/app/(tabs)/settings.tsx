import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/context/CategoriesContext';
import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { THEMES, getThemeById } from '@/constants/themes';
import { Category, DEFAULT_CATEGORIES } from '@/types/category';
import { formatArabicDateShort, getBackupFileName } from '@/utils/dateFormatter';
import { invoiceStore, useInvoiceStore } from '@/utils/invoiceStore';

const CAT_ICON_OPTIONS = [
  'nutrition-outline', 'leaf-outline', 'cafe-outline', 'flame-outline',
  'water-outline', 'happy-outline', 'cart-outline', 'bag-outline',
  'star-outline', 'heart-outline', 'gift-outline', 'cube-outline',
  'shirt-outline', 'home-outline', 'construct-outline', 'flower-outline',
  'fish-outline', 'pizza-outline', 'beer-outline', 'ice-cream-outline',
  'fast-food-outline', 'wine-outline', 'storefront-outline', 'pricetag-outline',
  'basket-outline', 'briefcase-outline', 'car-outline', 'phone-portrait-outline',
  'desktop-outline', 'headset-outline', 'camera-outline', 'book-outline',
  'medkit-outline', 'fitness-outline', 'color-palette-outline', 'hardware-chip-outline',
  'diamond-outline', 'watch-outline', 'glasses-outline', 'ribbon-outline',
  'sparkles-outline', 'snow-outline', 'footsteps-outline', 'barbell-outline',
  'toy-outline', 'paw-outline', 'earth-outline', 'airplane-outline',
];

const CAT_COLOR_OPTIONS = [
  '#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#06B6D4', '#EC4899',
  '#8B5CF6', '#F97316', '#14B8A6', '#6366F1', '#84CC16', '#E11D48',
];

const NIDAA_DIR = `${FileSystem.documentDirectory}Nidaa/`;
const BACKUP_DIR = `${FileSystem.documentDirectory}Nidaa/Backups/`;

async function ensureBackupDir() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    }
  } catch {}
}

type ActiveModal =
  | 'none'
  | 'addCategory'
  | 'editCategory'
  | 'theme'
  | 'pinSetup'
  | 'disablePinVerify'
  | 'verifyPinForRegen'
  | 'verifyPinForKeyView'
  | 'deleteCatStep1'
  | 'deleteCatStep2'
  | 'restoreDefaultCats'
  | 'confirmImport'
  | 'backupChoice';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { products, exportData, importData, updateAllProductsExchangeRate, moveCategoryProducts } = useProducts();
  const { categories, addCategory, updateCategory, deleteCategory, toggleCategoryVisibility, resetCategories } = useCategories();
  const { showToast } = useToast();
  const { savedInvoices } = useInvoiceStore();
  const [rateInput, setRateInput] = useState(String(settings.exchangeRate));
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportJson, setPendingImportJson] = useState('');

  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [deleteCatAction, setDeleteCatAction] = useState<'delete' | 'move'>('delete');
  const [moveToCatId, setMoveToCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState(CAT_ICON_OPTIONS[0]);
  const [catColor, setCatColor] = useState(CAT_COLOR_OPTIONS[0]);

  const [showSecKey, setShowSecKey] = useState(false);

  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const currentTheme = getThemeById(settings.themeId || 'ocean');

  async function handleRateSubmit() {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      showToast({ message: 'يرجى إدخال سعر صرف صحيح', type: 'error' });
      return;
    }
    const oldRate = settings.exchangeRate;
    await updateSettings({ exchangeRate: val });
    if (val !== oldRate && products.length > 0) {
      await updateAllProductsExchangeRate(val);
      showToast({ message: 'تم تحديث سعر الصرف وأسعار جميع المنتجات', type: 'success' });
    } else {
      showToast({ message: 'تم تحديث سعر الصرف', type: 'success' });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleToggleBiometric(value: boolean) {
    if (Platform.OS === 'web') {
      showToast({ message: 'غير متاح على الويب', type: 'warning' });
      return;
    }
    await updateSettings({ biometricEnabled: value });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openBackupChoice() {
    if (Platform.OS === 'web') {
      showToast({ message: 'التصدير غير متاح على الويب', type: 'warning' });
      return;
    }
    setActiveModal('backupChoice');
  }

  async function handleExport(includeInvoices = false) {
    setActiveModal('none');
    try {
      setIsExporting(true);
      const productsJson = await exportData();
      const productsData = JSON.parse(productsJson);
      const now = new Date().toISOString();
      const fullBackup: Record<string, any> = {
        ...productsData,
        version: 2,
        categories,
        exportDate: now,
        appName: settings.appName,
      };
      if (includeInvoices) {
        fullBackup.invoices = savedInvoices;
        fullBackup.invoicesCount = savedInvoices.length;
      }
      const json = JSON.stringify(fullBackup, null, 2);

      await ensureBackupDir();
      const fileName = getBackupFileName();
      const localPath = `${BACKUP_DIR}${fileName}`;
      await FileSystem.writeAsStringAsync(localPath, json, { encoding: FileSystem.EncodingType.UTF8 });

      const savedToDownloads = await (async () => {
        if (Platform.OS !== 'android') return false;
        try {
          const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (!perm.granted) return false;
          const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
            perm.directoryUri, fileName, 'application/json'
          );
          const content = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.UTF8 });
          await FileSystem.StorageAccessFramework.writeAsStringAsync(destUri, content, { encoding: FileSystem.EncodingType.UTF8 });
          return true;
        } catch { return false; }
      })();

      if (!savedToDownloads) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localPath, { mimeType: 'application/json', dialogTitle: 'حفظ النسخة الاحتياطية' });
        } else {
          showToast({ message: `تم حفظ النسخة في: Nidaa/Backups/${fileName}`, type: 'success' });
        }
      }

      await updateSettings({ lastBackupDate: now });
      const invoicesPart = includeInvoices ? ` و${savedInvoices.length} فاتورة` : '';
      showToast({
        message: savedToDownloads
          ? `✓ تم الحفظ في المجلد المحدد — ${products.length} منتج${invoicesPart}`
          : `تم تصدير ${products.length} منتج${invoicesPart}`,
        type: 'success'
      });
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل التصدير', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport() {
    if (Platform.OS === 'web') {
      showToast({ message: 'الاستيراد غير متاح على الويب', type: 'warning' });
      return;
    }
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const json = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      setPendingImportJson(json);
      setActiveModal('confirmImport');
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل فتح الملف', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  }

  async function confirmImportData() {
    try {
      const count = await importData(pendingImportJson);
      let msg = `تم استيراد ${count} منتج`;
      try {
        const parsed = JSON.parse(pendingImportJson);
        if (parsed.categories && Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          await resetCategories(parsed.categories);
          msg += ` و${parsed.categories.length} قسم`;
        }
        if (parsed.invoices && Array.isArray(parsed.invoices) && parsed.invoices.length > 0) {
          await invoiceStore.restoreInvoices(parsed.invoices);
          msg += ` و${parsed.invoices.length} فاتورة`;
        }
      } catch {}
      showToast({ message: msg, type: 'success' });
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل الاستيراد', type: 'error' });
    }
    setActiveModal('none');
  }

  function openAddCat() {
    setEditingCat(null);
    setCatName('');
    setCatIcon(CAT_ICON_OPTIONS[0]);
    setCatColor(CAT_COLOR_OPTIONS[0]);
    setActiveModal('addCategory');
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setActiveModal('editCategory');
  }

  async function handleSaveCat() {
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
    setActiveModal('none');
  }

  function openDeleteCatStep1(cat: Category) {
    setDeletingCat(cat);
    setDeleteCatAction('delete');
    setMoveToCatId(null);
    setActiveModal('deleteCatStep1');
  }

  async function confirmDeleteCat() {
    if (!deletingCat) return;
    if (deleteCatAction === 'move' && moveToCatId) {
      await moveCategoryProducts(deletingCat.id, moveToCatId);
    }
    await deleteCategory(deletingCat.id);
    const msg = deleteCatAction === 'move'
      ? `تم نقل منتجات "${deletingCat.name}" وحذف القسم`
      : `تم حذف "${deletingCat.name}"`;
    showToast({ message: msg, type: 'info' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveModal('none');
    setDeletingCat(null);
    setMoveToCatId(null);
  }

  async function handleRestoreDefaults() {
    await resetCategories(DEFAULT_CATEGORIES);
    showToast({ message: 'تم استعادة الأقسام الافتراضية', type: 'success' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveModal('none');
  }

  function openPinSetup() {
    setCurrentPinInput('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setActiveModal('pinSetup');
  }

  function openDisablePinVerify() {
    setCurrentPinInput('');
    setPinError('');
    setActiveModal('disablePinVerify');
  }

  async function handleSavePin() {
    if (settings.pinEnabled && currentPinInput !== settings.pinCode) {
      setPinError('رمز PIN الحالي غير صحيح');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('PIN يجب أن يتكون من 4 أرقام');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('رمزا PIN غير متطابقَين');
      return;
    }
    await updateSettings({ pinEnabled: true, pinCode: newPin });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({ message: 'تم تفعيل قفل PIN', type: 'success' });
    setActiveModal('none');
  }

  async function handleDisablePin() {
    if (currentPinInput !== settings.pinCode) {
      setPinError('رمز PIN غير صحيح');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await updateSettings({ pinEnabled: false, pinCode: '' });
    showToast({ message: 'تم تعطيل قفل PIN', type: 'info' });
    setActiveModal('none');
  }

  function openVerifyPinForRegen() {
    setCurrentPinInput('');
    setPinError('');
    setActiveModal('verifyPinForRegen');
  }

  function handleToggleSecKey() {
    if (!showSecKey && settings.pinEnabled) {
      setCurrentPinInput('');
      setPinError('');
      setActiveModal('verifyPinForKeyView');
    } else {
      setShowSecKey((v) => !v);
    }
  }

  async function confirmVerifyPinForKeyView() {
    if (currentPinInput !== settings.pinCode) {
      setPinError('رمز PIN غير صحيح');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setShowSecKey(true);
    setActiveModal('none');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function confirmRegenerateKey() {
    if (settings.pinEnabled) {
      if (currentPinInput !== settings.pinCode) {
        setPinError('رمز PIN غير صحيح');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let key = '';
    for (let i = 0; i < 10; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    await updateSettings({ securityKey: key });
    setShowSecKey(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({ message: 'تم توليد مفتاح أمان جديد', type: 'success' });
    setActiveModal('none');
  }

  async function copySecurityKey() {
    if (!showSecKey) {
      showToast({ message: 'اضغط 👁 لعرض المفتاح أولاً', type: 'warning' });
      return;
    }
    if (Platform.OS !== 'web') {
      await Clipboard.setStringAsync(settings.securityKey);
    }
    showToast({ message: 'تم نسخ المفتاح', type: 'success' });
  }

  const otherCategories = categories.filter((c) => c.id !== deletingCat?.id);
  const appIcon = settings.appIconUri
    ? { uri: settings.appIconUri }
    : require('@/assets/images/icon.png');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.fixedHeader, { paddingTop: topInset, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTexts}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>الإعدادات</Text>
          <Text style={[styles.pageSubtitle, { color: colors.silver }]}>{settings.appName || 'مجاهد للتجارة'}</Text>
        </View>
        <Image source={appIcon} style={styles.headerIcon} contentFit="contain" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Add Product CTA ─── */}
        <TouchableOpacity
          style={[styles.addProductCTA, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/product/add'); }}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <Text style={[styles.addProductTitle, { color: colors.primaryForeground }]}>إضافة منتج جديد</Text>
            <Text style={[styles.addProductSub, { color: colors.primaryForeground + 'BB' }]}>أضف منتجاً إلى قاعدة البيانات</Text>
          </View>
          <View style={[styles.addProductIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name="add-circle" size={30} color={colors.primaryForeground} />
          </View>
        </TouchableOpacity>

        {/* Theme */}
        <SectionHeader title="ثيم الألوان" colors={colors} icon="color-palette-outline" />
        <TouchableOpacity
          style={[styles.card, styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setActiveModal('theme')}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.silver} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{currentTheme.emoji} {currentTheme.name}</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>اختر من 10 ثيمات</Text>
          </View>
          <View style={[styles.themePreviewDot, { backgroundColor: colors.primary }]} />
        </TouchableOpacity>

        {/* Dark Mode */}
        <SectionHeader title="المظهر" colors={colors} icon="contrast-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
          {(['system', 'light', 'dark'] as const).map((mode, idx) => {
            const label = mode === 'system' ? 'تلقائي (حسب الجهاز)' : mode === 'light' ? 'فاتح' : 'داكن';
            const icon = mode === 'system' ? 'phone-portrait-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline';
            const isActive = settings.darkMode === mode;
            return (
              <React.Fragment key={mode}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  style={styles.modeRow}
                  onPress={() => { updateSettings({ darkMode: mode }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  {isActive
                    ? <Ionicons name="radio-button-on" size={22} color={colors.primary} />
                    : <Ionicons name="radio-button-off" size={22} color={colors.silver} />}
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[styles.modeLabel, { color: isActive ? colors.primary : colors.foreground }]}>{label}</Text>
                  </View>
                  <Ionicons name={icon as any} size={20} color={isActive ? colors.primary : colors.silver} />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>


        {/* ─── Display Preferences ─── */}
        <SectionHeader title="تفضيلات العرض" colors={colors} icon="eye-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
          <View style={[styles.secRow, { paddingVertical: 14 }]}>
            <Switch
              value={settings.customerViewMode ?? false}
              onValueChange={(v) => { updateSettings({ customerViewMode: v }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>وضع عرض الزبائن</Text>
              <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>
                {settings.customerViewMode ? 'الأسعار الإجمالية فقط — موصى به للعملاء' : 'عرض كامل مع سعر الشراء والمخزون'}
              </Text>
            </View>
            <View style={[styles.secIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Exchange Rate */}
        <SectionHeader title="معدل الصرف" colors={colors} icon="swap-horizontal-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>سعر الدولار بالليرة السورية القديمة (ل.س.ق) — سيتم تحديث أسعار جميع المنتجات</Text>
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
              placeholder="مثال: 1400000"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={[styles.rateBadge, { backgroundColor: colors.primary + '15', marginTop: 6 }]}>
            <Text style={[styles.rateNote, { color: colors.primary }]}>
              1$ = {Number(settings.exchangeRate).toLocaleString('ar-SY')} ل.س.ق = {Math.floor(Number(settings.exchangeRate) / 100).toLocaleString('ar-SY')} ل.س.ج
            </Text>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.primary} />
          </View>
        </View>

        {/* Categories */}
        <SectionHeader title="الأقسام" colors={colors} icon="grid-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0, padding: 0, overflow: 'hidden' }]}>
          {categories.map((cat, idx) => (
            <View key={cat.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.catRow}>
                <View style={styles.catActions}>
                  <TouchableOpacity onPress={() => openDeleteCatStep1(cat)} style={[styles.catAction, { backgroundColor: colors.destructive + '15' }]}>
                    <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEditCat(cat)} style={[styles.catAction, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleCategoryVisibility(cat.id)} style={[styles.catAction, { backgroundColor: cat.hidden ? colors.muted : colors.success + '15' }]}>
                    <Ionicons name={cat.hidden ? 'eye-off-outline' : 'eye-outline'} size={14} color={cat.hidden ? colors.silver : colors.success} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.catName, { color: cat.hidden ? colors.silver : colors.foreground }]}>{cat.name}</Text>
                  {cat.hidden && <Text style={[styles.catHidden, { color: colors.silver }]}>مخفي</Text>}
                </View>
                <View style={[styles.catIconWrap, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                </View>
              </View>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.addCatBtn} onPress={openAddCat} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.addCatText, { color: colors.primary }]}>إضافة قسم جديد</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[styles.addCatBtn, { gap: 6 }]}
            onPress={() => setActiveModal('restoreDefaultCats')}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.silver} />
            <Text style={[styles.addCatText, { color: colors.silver }]}>استعادة الأقسام الافتراضية</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Security Section ─── */}
        <SectionHeader title="الأمان" colors={colors} icon="shield-checkmark-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>

          {/* PIN Lock toggle */}
          <View style={[styles.secRow, { paddingVertical: 14 }]}>
            <Switch
              value={settings.pinEnabled}
              onValueChange={(v) => {
                if (v) openPinSetup();
                else openDisablePinVerify();
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>قفل PIN</Text>
              <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>
                {settings.pinEnabled ? 'القفل مفعّل' : '4 أرقام عند فتح التطبيق'}
              </Text>
            </View>
            <View style={[styles.secIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="keypad-outline" size={20} color={colors.primary} />
            </View>
          </View>

          {settings.pinEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[styles.secRow, { paddingVertical: 12 }]}
                onPress={openPinSetup}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color={colors.silver} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.secActionLabel, { color: colors.foreground }]}>تغيير رمز PIN</Text>
                  <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>يتطلب رمز PIN الحالي</Text>
                </View>
                <View style={[styles.secIconWrap, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Security Key */}
          <View style={{ paddingVertical: 12, paddingHorizontal: 2, gap: 10 }}>
            <View style={styles.secRow}>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>مفتاح الأمان</Text>
                <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>
                  {settings.pinEnabled ? 'اضغط 👁 للعرض (يتطلب PIN)' : 'احفظه لاستعادة PIN'}
                </Text>
              </View>
              <View style={[styles.secIconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="key-outline" size={20} color={colors.primary} />
              </View>
            </View>
            <View style={[styles.keyDisplay, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TouchableOpacity onPress={handleToggleSecKey} style={styles.eyeBtn}>
                <Ionicons name={showSecKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.primary} />
              </TouchableOpacity>
              <Pressable style={{ flex: 1 }} onPress={showSecKey ? copySecurityKey : undefined}>
                <Text style={[styles.keyText, { color: showSecKey ? colors.foreground : colors.mutedForeground }]} selectable={showSecKey}>
                  {showSecKey ? settings.securityKey : '●●●●●●●●●●'}
                </Text>
              </Pressable>
              {showSecKey && (
                <TouchableOpacity onPress={copySecurityKey}>
                  <Ionicons name="copy-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.regenBtn, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '30' }]}
              onPress={openVerifyPinForRegen}
              activeOpacity={0.8}
            >
              <Ionicons name="reload-outline" size={16} color={colors.destructive} />
              <Text style={[styles.regenBtnText, { color: colors.destructive }]}>توليد مفتاح جديد</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Biometric */}
          <View style={[styles.secRow, { paddingVertical: 14 }]}>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>بصمة الإصبع</Text>
              <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>الدخول بالبصمة</Text>
            </View>
            <View style={[styles.secIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="finger-print" size={20} color={colors.primary} />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Auto-Lock Timer */}
          <View style={{ paddingVertical: 12, paddingHorizontal: 2, gap: 8 }}>
            <View style={styles.secRow}>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>قفل تلقائي</Text>
                <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>
                  {(settings.autoLockMinutes ?? 0) === 0
                    ? 'معطّل'
                    : `بعد ${settings.autoLockMinutes} دقيقة من عدم النشاط`}
                </Text>
              </View>
              <View style={[styles.secIconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="timer-outline" size={20} color={colors.primary} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {[0, 1, 5, 15, 30].map((mins) => {
                const isActive = (settings.autoLockMinutes ?? 0) === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.autoLockPill,
                      {
                        backgroundColor: isActive ? colors.primary : colors.secondary,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      updateSettings({ autoLockMinutes: mins });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.autoLockPillText, { color: isActive ? colors.primaryForeground : colors.foreground }]}>
                      {mins === 0 ? 'معطّل' : `${mins} د`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Backup */}
        <SectionHeader title="النسخ الاحتياطي" colors={colors} icon="archive-outline" />

        {/* Status Banner */}
        {settings.lastBackupDate ? (
          <View style={[styles.backupBanner, { backgroundColor: (colors.success ?? '#22c55e') + '14', borderColor: (colors.success ?? '#22c55e') + '40' }]}>
            <View style={[styles.backupBannerIcon, { backgroundColor: (colors.success ?? '#22c55e') + '22' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success ?? '#22c55e'} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.backupBannerTitle, { color: colors.success ?? '#22c55e' }]}>بياناتك محمية</Text>
              <Text style={[styles.backupBannerSub, { color: colors.mutedForeground }]}>
                آخر نسخة: {formatArabicDateShort(settings.lastBackupDate)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.backupBanner, { backgroundColor: colors.warning + '14', borderColor: colors.warning + '40' }]}>
            <View style={[styles.backupBannerIcon, { backgroundColor: colors.warning + '22' }]}>
              <Ionicons name="warning-outline" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.backupBannerTitle, { color: colors.warning }]}>لا توجد نسخة احتياطية</Text>
              <Text style={[styles.backupBannerSub, { color: colors.mutedForeground }]}>صدّر نسخة الآن لحماية بياناتك</Text>
            </View>
          </View>
        )}

        {/* Data Summary */}
        <View style={[styles.backupSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.backupSummaryItem}>
            <Text style={[styles.backupSummaryNum, { color: colors.foreground }]}>{products.length}</Text>
            <Text style={[styles.backupSummaryLabel, { color: colors.mutedForeground }]}>منتج</Text>
          </View>
          <View style={[styles.backupSummaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.backupSummaryItem}>
            <Text style={[styles.backupSummaryNum, { color: colors.foreground }]}>{categories.length}</Text>
            <Text style={[styles.backupSummaryLabel, { color: colors.mutedForeground }]}>قسم</Text>
          </View>
          <View style={[styles.backupSummaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.backupSummaryItem}>
            <Text style={[styles.backupSummaryNum, { color: colors.primary }]}>{savedInvoices.length}</Text>
            <Text style={[styles.backupSummaryLabel, { color: colors.mutedForeground }]}>فاتورة</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0, padding: 0, overflow: 'hidden' }]}>

          {/* Export */}
          <TouchableOpacity
            style={[styles.backupRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={openBackupChoice}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            <View style={[styles.backupRowIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="arrow-down-circle-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.backupRowTitle, { color: colors.foreground }]}>
                {isExporting ? 'جاري الحفظ...' : 'حفظ نسخة في الجهاز'}
              </Text>
              <Text style={[styles.backupRowSub, { color: colors.mutedForeground }]}>
                احفظ ملف النسخة الاحتياطية في جهازك
              </Text>
            </View>
            <Ionicons name="chevron-back" size={16} color={colors.silver} />
          </TouchableOpacity>

          {/* Import */}
          <TouchableOpacity
            style={styles.backupRow}
            onPress={handleImport}
            disabled={isImporting}
            activeOpacity={0.8}
          >
            <View style={[styles.backupRowIcon, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="arrow-up-circle-outline" size={22} color={colors.warning} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.backupRowTitle, { color: colors.foreground }]}>
                {isImporting ? 'جاري الاستيراد...' : 'استيراد نسخة من الجهاز'}
              </Text>
              <Text style={[styles.backupRowSub, { color: colors.mutedForeground }]}>
                استيراد ملف نسخة احتياطية من جهازك
              </Text>
            </View>
            <Ionicons name="chevron-back" size={16} color={colors.silver} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <SectionHeader title="معلومات التطبيق" colors={colors} icon="information-circle-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow label="اسم التطبيق" value={settings.appName || 'مجاهد للتجارة'} colors={colors} />
          <InfoRow label="الإصدار" value="1.3.0" colors={colors} />
          <InfoRow label="عدد المنتجات" value={String(products.length)} colors={colors} />
          <InfoRow label="عدد الأقسام" value={String(categories.length)} colors={colors} last />
        </View>

        {/* Contact & Terms */}
        <SectionHeader title="الدعم والمعلومات" colors={colors} icon="headset-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
          <TouchableOpacity
            style={[styles.secRow, { paddingVertical: 14 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/contact'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.silver} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>تواصل مع المُبرمج</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>نداء الرحمن عبّود</Text>
            </View>
            <View style={[styles.secIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={[styles.secRow, { paddingVertical: 14 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/terms'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.silver} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>شروط الاستخدام</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>الملكية الفكرية والاستخدام</Text>
            </View>
            <View style={[styles.secIconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="document-lock-outline" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── Category Modal (Add/Edit) ─── */}
      <BottomSheetModal
        visible={activeModal === 'addCategory' || activeModal === 'editCategory'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title={activeModal === 'editCategory' ? 'تعديل القسم' : 'قسم جديد'}
      >
        <View style={styles.previewRow}>
          <View style={[styles.previewIcon, { backgroundColor: catColor + '22' }]}>
            <Ionicons name={catIcon as any} size={28} color={catColor} />
          </View>
          <Text style={[styles.previewName, { color: colors.foreground }]}>{catName || 'اسم القسم'}</Text>
        </View>

        <ModalLabel text="اسم القسم" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
          value={catName}
          onChangeText={setCatName}
          placeholder="أدخل اسم القسم"
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
        />

        <ModalLabel text="اللون" colors={colors} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
          {CAT_COLOR_OPTIONS.map((c) => (
            <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c, borderWidth: catColor === c ? 3 : 0, borderColor: '#fff' }]} onPress={() => setCatColor(c)} />
          ))}
        </ScrollView>

        <ModalLabel text="الأيقونة" colors={colors} />
        <View style={styles.iconGrid}>
          {CAT_ICON_OPTIONS.map((ico) => (
            <TouchableOpacity
              key={ico}
              style={[styles.iconOption, { backgroundColor: catIcon === ico ? catColor + '22' : colors.secondary, borderColor: catIcon === ico ? catColor : 'transparent', borderWidth: 1.5 }]}
              onPress={() => setCatIcon(ico)}
            >
              <Ionicons name={ico as any} size={22} color={catIcon === ico ? catColor : colors.silver} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveCat}>
          <Text style={[styles.modalSaveBtnText, { color: colors.primaryForeground }]}>
            {activeModal === 'editCategory' ? 'حفظ التعديلات' : 'إضافة القسم'}
          </Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ─── Delete Category Step 1 ─── */}
      <Modal
        visible={activeModal === 'deleteCatStep1'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setActiveModal('none')}>
          <Animated.View
            entering={FadeIn.duration(220)}
            style={[styles.confirmBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Pressable onPress={() => {}}>
              <View style={[styles.confirmIconWrap, { backgroundColor: colors.destructive + '15' }]}>
                <Ionicons name="trash-outline" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.foreground }]}>حذف "{deletingCat?.name}"</Text>
              <Text style={[styles.confirmMsg, { color: colors.mutedForeground }]}>
                ماذا تريد أن تفعل بمنتجات هذا القسم؟
              </Text>

              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.deleteCatOption,
                    { borderColor: deleteCatAction === 'move' ? colors.primary : colors.border, backgroundColor: deleteCatAction === 'move' ? colors.primary + '10' : colors.secondary },
                  ]}
                  onPress={() => setDeleteCatAction('move')}
                  activeOpacity={0.8}
                >
                  <Ionicons name={deleteCatAction === 'move' ? 'radio-button-on' : 'radio-button-off'} size={20} color={deleteCatAction === 'move' ? colors.primary : colors.silver} />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[styles.deleteCatOptionTitle, { color: colors.foreground }]}>نقل المنتجات إلى قسم آخر</Text>
                    <Text style={[styles.deleteCatOptionSub, { color: colors.mutedForeground }]}>اختر القسم في الخطوة التالية</Text>
                  </View>
                  <Ionicons name="git-merge-outline" size={20} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteCatOption,
                    { borderColor: deleteCatAction === 'delete' ? colors.destructive : colors.border, backgroundColor: deleteCatAction === 'delete' ? colors.destructive + '10' : colors.secondary },
                  ]}
                  onPress={() => setDeleteCatAction('delete')}
                  activeOpacity={0.8}
                >
                  <Ionicons name={deleteCatAction === 'delete' ? 'radio-button-on' : 'radio-button-off'} size={20} color={deleteCatAction === 'delete' ? colors.destructive : colors.silver} />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[styles.deleteCatOptionTitle, { color: colors.foreground }]}>إبقاء المنتجات بدون قسم</Text>
                    <Text style={[styles.deleteCatOptionSub, { color: colors.mutedForeground }]}>تُحذف الرابط بالقسم فقط</Text>
                  </View>
                  <Ionicons name="layers-outline" size={20} color={colors.destructive} />
                </TouchableOpacity>
              </View>

              <View style={[styles.confirmBtns, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.secondary, flex: 1 }]}
                  onPress={() => setActiveModal('none')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: deleteCatAction === 'move' ? colors.primary : colors.destructive, flex: 1 }]}
                  onPress={() => {
                    if (deleteCatAction === 'move') {
                      if (otherCategories.length === 0) {
                        showToast({ message: 'لا توجد أقسام أخرى للنقل إليها', type: 'warning' });
                        return;
                      }
                      setMoveToCatId(otherCategories[0].id);
                      setActiveModal('deleteCatStep2');
                    } else {
                      confirmDeleteCat();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.confirmBtnText, { color: '#fff' }]}>
                    {deleteCatAction === 'move' ? 'التالي' : 'حذف'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ─── Delete Category Step 2 ─── */}
      <Modal
        visible={activeModal === 'deleteCatStep2'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal('deleteCatStep1')}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setActiveModal('deleteCatStep1')}>
          <View style={[styles.sheetPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => {}}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border, alignSelf: 'center' }]} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر القسم الهدف</Text>
              <Text style={[styles.confirmMsg, { color: colors.mutedForeground, marginBottom: 12 }]}>
                سيتم نقل جميع منتجات "{deletingCat?.name}" إلى:
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                {otherCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.targetCatRow,
                      {
                        borderColor: moveToCatId === cat.id ? cat.color : colors.border,
                        backgroundColor: moveToCatId === cat.id ? cat.color + '12' : colors.secondary,
                      },
                    ]}
                    onPress={() => setMoveToCatId(cat.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={moveToCatId === cat.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={moveToCatId === cat.id ? cat.color : colors.silver}
                    />
                    <Text style={[styles.targetCatName, { color: colors.foreground, flex: 1, textAlign: 'right' }]}>{cat.name}</Text>
                    <View style={[styles.catIconWrap, { backgroundColor: cat.color + '20' }]}>
                      <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[styles.confirmBtns, { marginTop: 14 }]}>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.secondary, flex: 1 }]}
                  onPress={() => setActiveModal('deleteCatStep1')}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.foreground }]}>رجوع</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={confirmDeleteCat}
                >
                  <Text style={[styles.confirmBtnText, { color: '#fff' }]}>نقل وحذف</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Restore Default Categories ─── */}
      <ConfirmModal
        visible={activeModal === 'restoreDefaultCats'}
        onClose={() => setActiveModal('none')}
        onConfirm={handleRestoreDefaults}
        colors={colors}
        title="استعادة الأقسام الافتراضية"
        message="سيتم استبدال جميع الأقسام الحالية بالأقسام الافتراضية. منتجاتك لن تُحذف لكن روابطها بالأقسام ستُزال."
        confirmLabel="استعادة"
        confirmDestructive
      />

      {/* ─── Confirm Import Modal ─── */}
      <ConfirmModal
        visible={activeModal === 'confirmImport'}
        onClose={() => setActiveModal('none')}
        onConfirm={confirmImportData}
        colors={colors}
        title="تأكيد استيراد البيانات"
        message={`سيتم دمج منتجات وأقسام الملف المحدد مع بياناتك الحالية (${products.length} منتج، ${categories.length} قسم).\n\nالمنتجات المكررة ستُضاف كمنتجات جديدة. هل تريد المتابعة؟`}
        confirmLabel="استيراد الآن"
        confirmDestructive
      />

      {/* ─── Backup Choice Modal ─── */}
      <Modal
        visible={activeModal === 'backupChoice'}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal('none')}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setActiveModal('none')}>
          <Pressable onPress={() => {}}>
            <View style={[styles.sheetPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ fontSize: 17, fontFamily: 'Tajawal_700Bold', color: colors.foreground, textAlign: 'center', marginBottom: 6 }}>
                نسخة احتياطية
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Tajawal_400Regular', color: colors.mutedForeground, textAlign: 'center', marginBottom: 20 }}>
                اختر ماذا تريد تضمينه في النسخة الاحتياطية
              </Text>

              {/* مع الفواتير */}
              <TouchableOpacity
                style={[styles.backupChoiceBtn, { borderColor: colors.primary + '60', backgroundColor: colors.primary + '0A' }]}
                onPress={() => handleExport(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.backupChoiceIcon, { backgroundColor: colors.primary + '25' }]}>
                  <Ionicons name="receipt-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.backupChoiceTitle, { color: colors.primary }]}>مع الفواتير</Text>
                  <Text style={[styles.backupChoiceSub, { color: colors.mutedForeground }]}>
                    {products.length} منتج • {categories.length} قسم • {savedInvoices.length} فاتورة
                  </Text>
                </View>
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
              </TouchableOpacity>

              {/* بدون فواتير */}
              <TouchableOpacity
                style={[styles.backupChoiceBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => handleExport(false)}
                activeOpacity={0.85}
              >
                <View style={[styles.backupChoiceIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="cube-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.backupChoiceTitle, { color: colors.foreground }]}>بدون فواتير</Text>
                  <Text style={[styles.backupChoiceSub, { color: colors.mutedForeground }]}>
                    {products.length} منتج • {categories.length} قسم فقط
                  </Text>
                </View>
                <Ionicons name="chevron-back" size={18} color={colors.silver} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.backupCancelBtn, { borderColor: colors.border }]}
                onPress={() => setActiveModal('none')}
                activeOpacity={0.8}
              >
                <Text style={[styles.backupCancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>


      {/* ─── Theme Modal ─── */}
      <BottomSheetModal
        visible={activeModal === 'theme'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title="اختر الثيم"
      >
        {THEMES.map((t, idx) => {
          const isActive = settings.themeId === t.id;
          return (
            <React.Fragment key={t.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                style={[styles.themeRow, { backgroundColor: isActive ? colors.primary + '10' : 'transparent' }]}
                onPress={() => { updateSettings({ themeId: t.id }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveModal('none'); }}
              >
                {isActive
                  ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  : <View style={styles.themeCheckEmpty} />}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.themeRowText, { color: colors.foreground }]}>{t.emoji} {t.name}</Text>
                </View>
                <View style={styles.themeSwatches}>
                  <View style={[styles.swatch, { backgroundColor: t.light.primary }]} />
                  <View style={[styles.swatch, { backgroundColor: t.light.accent }]} />
                  <View style={[styles.swatch, { backgroundColor: t.dark.primary }]} />
                </View>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </BottomSheetModal>

      {/* ─── PIN Setup Modal ─── */}
      <BottomSheetModal
        visible={activeModal === 'pinSetup'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title={settings.pinEnabled ? 'تغيير رمز PIN' : 'تفعيل قفل PIN'}
        keyboardAware
      >
        {pinError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{pinError}</Text>
          </View>
        ) : null}
        {settings.pinEnabled && (
          <>
            <ModalLabel text="رمز PIN الحالي" colors={colors} />
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: pinError ? colors.destructive : colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
              value={currentPinInput}
              onChangeText={(t) => { setCurrentPinInput(t.replace(/[^0-9]/g, '').slice(0, 4)); setPinError(''); }}
              placeholder="● ● ● ●"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </>
        )}
        <ModalLabel text="رمز PIN الجديد (4 أرقام)" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
          value={newPin}
          onChangeText={(t) => { setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4)); setPinError(''); }}
          placeholder="● ● ● ●"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <ModalLabel text="تأكيد رمز PIN" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
          value={confirmPin}
          onChangeText={(t) => { setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4)); setPinError(''); }}
          placeholder="● ● ● ●"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSavePin}>
          <Text style={[styles.modalSaveBtnText, { color: colors.primaryForeground }]}>
            {settings.pinEnabled ? 'تغيير القفل' : 'تفعيل القفل'}
          </Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ─── Disable PIN Verify Modal ─── */}
      <BottomSheetModal
        visible={activeModal === 'disablePinVerify'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title="إلغاء قفل PIN"
        keyboardAware
      >
        <View style={[styles.warnBox, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text style={[styles.warnText, { color: colors.warning }]}>
            أدخل رمز PIN الحالي للتأكيد قبل إلغاء القفل
          </Text>
        </View>
        {pinError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{pinError}</Text>
          </View>
        ) : null}
        <ModalLabel text="رمز PIN الحالي" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: pinError ? colors.destructive : colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
          value={currentPinInput}
          onChangeText={(t) => { setCurrentPinInput(t.replace(/[^0-9]/g, '').slice(0, 4)); setPinError(''); }}
          placeholder="● ● ● ●"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          autoFocus
        />
        <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.destructive }]} onPress={handleDisablePin}>
          <Text style={[styles.modalSaveBtnText, { color: '#fff' }]}>إلغاء القفل</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ─── Verify PIN for Security Key View ─── */}
      <BottomSheetModal
        visible={activeModal === 'verifyPinForKeyView'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title="عرض مفتاح الأمان"
        keyboardAware
      >
        <View style={[styles.warnBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Ionicons name="key-outline" size={20} color={colors.primary} />
          <Text style={[styles.warnText, { color: colors.primary }]}>
            أدخل رمز PIN للوصول إلى مفتاح الأمان
          </Text>
        </View>
        {pinError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{pinError}</Text>
          </View>
        ) : null}
        <ModalLabel text="رمز PIN" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: pinError ? colors.destructive : colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
          value={currentPinInput}
          onChangeText={(t) => { setCurrentPinInput(t.replace(/[^0-9]/g, '').slice(0, 4)); setPinError(''); }}
          placeholder="● ● ● ●"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          autoFocus
        />
        <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={confirmVerifyPinForKeyView}>
          <Text style={[styles.modalSaveBtnText, { color: colors.primaryForeground }]}>عرض المفتاح</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ─── Verify PIN for Key Regeneration ─── */}
      <BottomSheetModal
        visible={activeModal === 'verifyPinForRegen'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title="توليد مفتاح أمان جديد"
        keyboardAware
      >
        <View style={[styles.warnBox, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '30' }]}>
          <Ionicons name="warning-outline" size={22} color={colors.destructive} />
          <Text style={[styles.warnText, { color: colors.destructive }]}>
            سيتم إلغاء المفتاح الحالي نهائياً. تأكد من حفظ المفتاح الجديد!
          </Text>
        </View>
        {settings.pinEnabled && (
          <>
            {pinError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{pinError}</Text>
              </View>
            ) : null}
            <ModalLabel text="أدخل رمز PIN للتأكيد" colors={colors} />
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: pinError ? colors.destructive : colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
              value={currentPinInput}
              onChangeText={(t) => { setCurrentPinInput(t.replace(/[^0-9]/g, '').slice(0, 4)); setPinError(''); }}
              placeholder="● ● ● ●"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
          </>
        )}
        <View style={styles.warnBtns}>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.secondary, flex: 1 }]}
            onPress={() => setActiveModal('none')}
          >
            <Text style={[styles.modalSaveBtnText, { color: colors.foreground }]}>إلغاء</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.destructive, flex: 1 }]}
            onPress={confirmRegenerateKey}
          >
            <Text style={[styles.modalSaveBtnText, { color: '#fff' }]}>توليد جديد</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </View>
  );
}

function ConfirmModal({
  visible, onClose, onConfirm, colors, title, message, confirmLabel, confirmDestructive,
}: {
  visible: boolean; onClose: () => void; onConfirm: () => void;
  colors: any; title: string; message: string; confirmLabel: string; confirmDestructive?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.confirmOverlay} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(220)}
          style={[styles.confirmBox, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Pressable onPress={() => {}}>
            <View style={[styles.confirmIconWrap, { backgroundColor: confirmDestructive ? colors.destructive + '15' : colors.primary + '15' }]}>
              <Ionicons
                name={confirmDestructive ? 'trash-outline' : 'checkmark-circle-outline'}
                size={28}
                color={confirmDestructive ? colors.destructive : colors.primary}
              />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.confirmMsg, { color: colors.mutedForeground }]}>{message}</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.secondary, flex: 1 }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmBtnText, { color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: confirmDestructive ? colors.destructive : colors.primary, flex: 1 }]}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmBtnText, { color: '#fff' }]}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function BottomSheetModal({
  visible, onClose, colors, title, children,
}: {
  visible: boolean; onClose: () => void; colors: any; title: string; children: React.ReactNode; keyboardAware?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavFull}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.modalBackdropFlex} onPress={onClose} />
        <Pressable
          style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {children}
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModalLabel({ text, colors }: { text: string; colors: any }) {
  return <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>{text}</Text>;
}

function SectionHeader({ title, colors, icon }: { title: string; colors: any; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={12} color={colors.primary} />
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
  backBtn: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 38, height: 38, borderRadius: 11 },
  headerTexts: { alignItems: 'center', flex: 1 },
  pageTitle: { fontSize: 20, fontFamily: 'Tajawal_700Bold' },
  pageSubtitle: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 8, gap: 6 },
  addProductCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    gap: 12,
    marginBottom: 4,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  addProductTitle: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  addProductSub: { fontSize: 12, fontFamily: 'Tajawal_400Regular' },
  addProductIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 11, fontFamily: 'Tajawal_700Bold', textAlign: 'right', letterSpacing: 0.4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  rowSub: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  themePreviewDot: { width: 28, height: 28, borderRadius: 14 },
  divider: { height: 1 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  modeLabel: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  currencyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    margin: 4,
    marginBottom: 8,
  },
  currencyNoteText: { flex: 1, fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 18 },
  label: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 18 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateInput: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 18, fontFamily: 'Tajawal_500Medium' },
  saveBtn: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  rateNote: { fontSize: 13, fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  catActions: { flexDirection: 'row', gap: 6 },
  catAction: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  catHidden: { fontSize: 10, fontFamily: 'Tajawal_400Regular' },
  catIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addCatText: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2 },
  secIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secActionLabel: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  switchLabel: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  switchNote: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  keyDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  keyText: { flex: 1, fontSize: 16, fontFamily: 'Tajawal_700Bold', textAlign: 'center', letterSpacing: 3 },
  eyeBtn: { padding: 4 },
  regenBtn: { height: 42, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  regenBtnText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  lastBackupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  lastBackupText: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  backupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  backupBannerIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  backupBannerTitle: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  backupBannerSub: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right', marginTop: 2 },
  backupSummary: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, paddingVertical: 14,
  },
  backupSummaryItem: { alignItems: 'center', flex: 1 },
  backupSummaryNum: { fontSize: 20, fontFamily: 'Tajawal_700Bold' },
  backupSummaryLabel: { fontSize: 11, fontFamily: 'Tajawal_400Regular', marginTop: 2 },
  backupSummaryDivider: { width: 1, height: 32 },
  backupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  backupRowIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backupRowTitle: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  backupRowSub: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right', marginTop: 2 },
  backupChoiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 10,
  },
  backupChoiceTitle: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  backupChoiceSub: { fontSize: 11, fontFamily: 'Tajawal_400Regular', marginTop: 2 },
  backupChoiceIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backupCancelBtn: { height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backupCancelText: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoValue: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  infoLabel: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  deleteCatOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 14, padding: 12,
  },
  deleteCatOptionTitle: { fontSize: 13, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  deleteCatOptionSub: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  autoLockPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  autoLockPillText: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetPanel: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0,
    padding: 20, paddingBottom: 40,
  },
  targetCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  targetCatName: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  kavFull: { flex: 1 },
  modalBackdropFlex: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 14 },
  modalLabel: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right', color: '#888', marginBottom: 4, marginTop: 4 },
  modalInput: { height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 16, fontFamily: 'Tajawal_500Medium', marginBottom: 2 },
  modalSaveBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 4 },
  modalSaveBtnText: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, justifyContent: 'flex-end' },
  previewIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 18, fontFamily: 'Tajawal_700Bold' },
  colorRow: { gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  iconOption: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderRadius: 10, paddingHorizontal: 4 },
  themeRowText: { fontSize: 15, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  themeCheckEmpty: { width: 22, height: 22 },
  themeSwatches: { flexDirection: 'row', gap: 4 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  warnText: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 20 },
  warnBtns: { flexDirection: 'row', gap: 10 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  confirmBox: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 20 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: 19, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 8 },
  confirmMsg: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
});
