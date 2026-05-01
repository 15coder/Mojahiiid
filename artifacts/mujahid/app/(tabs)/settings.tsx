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
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/context/CategoriesContext';
import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { THEMES, getThemeById } from '@/constants/themes';
import { Category } from '@/types/category';

const CAT_ICON_OPTIONS = [
  'nutrition-outline', 'leaf-outline', 'cafe-outline', 'flame-outline',
  'water-outline', 'happy-outline', 'cart-outline', 'bag-outline',
  'star-outline', 'heart-outline', 'gift-outline', 'cube-outline',
  'shirt-outline', 'home-outline', 'construct-outline', 'flower-outline',
  'fish-outline', 'pizza-outline', 'beer-outline', 'ice-cream-outline',
];

const CAT_COLOR_OPTIONS = [
  '#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#06B6D4', '#EC4899',
  '#8B5CF6', '#F97316', '#14B8A6', '#6366F1', '#84CC16', '#E11D48',
];

type ActiveModal =
  | 'none'
  | 'addCategory'
  | 'editCategory'
  | 'theme'
  | 'appName'
  | 'pinSetup'
  | 'pinRecover'
  | 'securityKey';

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

  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState(CAT_ICON_OPTIONS[0]);
  const [catColor, setCatColor] = useState(CAT_COLOR_OPTIONS[0]);

  const [appNameInput, setAppNameInput] = useState(settings.appName || 'مجاهد للتجارة');

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [recoverKey, setRecoverKey] = useState('');
  const [recoverNewPin, setRecoverNewPin] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const currentTheme = getThemeById(settings.themeId || 'ocean');

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
      showToast({ message: 'غير متاح على الويب', type: 'warning' });
      return;
    }
    await updateSettings({ biometricEnabled: value });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleExport() {
    if (Platform.OS === 'web') {
      showToast({ message: 'التصدير غير متاح على الويب', type: 'warning' });
      return;
    }
    try {
      setIsExporting(true);
      const json = await exportData();
      const path = `${FileSystem.cacheDirectory}mujahid-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(path, { mimeType: 'application/json' });
      else showToast({ message: 'تم حفظ الملف', type: 'success' });
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
      Alert.alert('تأكيد الاستيراد', 'سيتم استبدال جميع المنتجات الحالية. هل أنت متأكد؟', [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استيراد',
          style: 'destructive',
          onPress: async () => {
            try {
              const count = await importData(json);
              showToast({ message: `تم استيراد ${count} منتج`, type: 'success' });
            } catch (e: any) {
              showToast({ message: e?.message || 'فشل الاستيراد', type: 'error' });
            }
          },
        },
      ]);
    } catch (e: any) {
      showToast({ message: e?.message || 'فشل فتح الملف', type: 'error' });
    } finally {
      setIsImporting(false);
    }
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

  async function handleDeleteCat(cat: Category) {
    Alert.alert('حذف القسم', `حذف "${cat.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(cat.id);
          showToast({ message: `تم حذف "${cat.name}"`, type: 'info' });
        },
      },
    ]);
  }

  async function handleSaveAppName() {
    if (!appNameInput.trim()) {
      showToast({ message: 'الاسم لا يمكن أن يكون فارغاً', type: 'error' });
      return;
    }
    await updateSettings({ appName: appNameInput.trim() });
    showToast({ message: 'تم تغيير الاسم', type: 'success' });
    setActiveModal('none');
  }

  async function handleSavePin() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      showToast({ message: 'PIN يجب أن يتكون من 4 أرقام', type: 'error' });
      return;
    }
    if (newPin !== confirmPin) {
      showToast({ message: 'كلمتا PIN غير متطابقتين', type: 'error' });
      return;
    }
    await updateSettings({ pinEnabled: true, pinCode: newPin });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({ message: 'تم تفعيل قفل PIN', type: 'success' });
    setNewPin('');
    setConfirmPin('');
    setActiveModal('none');
  }

  async function handleDisablePin() {
    await updateSettings({ pinEnabled: false, pinCode: '' });
    showToast({ message: 'تم تعطيل قفل PIN', type: 'info' });
  }

  async function handleRecoverPin() {
    if (recoverKey.trim() !== settings.securityKey) {
      showToast({ message: 'مفتاح الأمان غير صحيح', type: 'error' });
      return;
    }
    if (recoverNewPin.length !== 4 || !/^\d{4}$/.test(recoverNewPin)) {
      showToast({ message: 'PIN يجب أن يتكون من 4 أرقام', type: 'error' });
      return;
    }
    await updateSettings({ pinCode: recoverNewPin, pinEnabled: true });
    showToast({ message: 'تم إعادة تعيين PIN', type: 'success' });
    setRecoverKey('');
    setRecoverNewPin('');
    setActiveModal('none');
  }

  async function handleRegenerateKey() {
    Alert.alert(
      'توليد مفتاح جديد',
      'سيتم إلغاء المفتاح الحالي وتوليد مفتاح جديد. تأكد من حفظ المفتاح الجديد!',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'توليد',
          onPress: async () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            let key = '';
            for (let i = 0; i < 10; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
            await updateSettings({ securityKey: key });
            showToast({ message: 'تم توليد مفتاح جديد', type: 'success' });
          },
        },
      ]
    );
  }

  async function copySecurityKey() {
    if (Platform.OS !== 'web') {
      await Clipboard.setStringAsync(settings.securityKey);
    }
    showToast({ message: 'تم نسخ المفتاح', type: 'success' });
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
          <Text style={[styles.pageSubtitle, { color: colors.silver }]}>{settings.appName || 'مجاهد للتجارة'}</Text>
        </View>
        <Image source={require('@/assets/images/icon.png')} style={styles.headerIcon} contentFit="contain" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Name */}
        <SectionHeader title="اسم التطبيق" colors={colors} icon="text-outline" />
        <TouchableOpacity
          style={[styles.card, styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { setAppNameInput(settings.appName || 'مجاهد للتجارة'); setActiveModal('appName'); }}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.silver} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{settings.appName || 'مجاهد للتجارة'}</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>اضغط لتغيير الاسم</Text>
          </View>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
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
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>
              {currentTheme.emoji} {currentTheme.name}
            </Text>
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
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0, padding: 0, overflow: 'hidden' }]}>
          {categories.map((cat, idx) => (
            <View key={cat.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.catRow}>
                <View style={styles.catActions}>
                  <TouchableOpacity onPress={() => handleDeleteCat(cat)} style={[styles.catAction, { backgroundColor: colors.destructive + '15' }]}>
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
        </View>

        {/* PIN Lock */}
        <SectionHeader title="قفل PIN" colors={colors} icon="lock-closed-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
          <View style={styles.switchRow}>
            <Switch
              value={settings.pinEnabled}
              onValueChange={(v) => {
                if (v) setActiveModal('pinSetup');
                else handleDisablePin();
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>تفعيل قفل PIN</Text>
              <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>4 أرقام عند فتح التطبيق</Text>
            </View>
            <Ionicons name="keypad-outline" size={24} color={colors.primary} />
          </View>

          {settings.pinEnabled && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setActiveModal('pinSetup')}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>تغيير PIN</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security Key */}
        <SectionHeader title="مفتاح الأمان" colors={colors} icon="key-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            احفظ هذا المفتاح لاستعادة PIN إذا نسيته. يتكون من 10 أحرف وأرقام.
          </Text>
          <TouchableOpacity
            style={[styles.keyDisplay, { backgroundColor: colors.input, borderColor: colors.border }]}
            onPress={copySecurityKey}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={16} color={colors.primary} />
            <Text style={[styles.keyText, { color: colors.foreground }]} selectable>
              {settings.securityKey}
            </Text>
          </TouchableOpacity>
          <View style={styles.keyBtns}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary, flex: 1 }]} onPress={() => setActiveModal('pinRecover')}>
              <Ionicons name="refresh-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>استعادة PIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + '15', flex: 1 }]} onPress={handleRegenerateKey}>
              <Ionicons name="reload-outline" size={16} color={colors.destructive} />
              <Text style={[styles.actionBtnText, { color: colors.destructive }]}>مفتاح جديد</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security (Biometric) */}
        <SectionHeader title="البصمة" colors={colors} icon="finger-print-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>قفل بصمة الإصبع</Text>
              <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>يتطلب إعادة تشغيل التطبيق</Text>
            </View>
            <Ionicons name="finger-print" size={24} color={colors.primary} />
          </View>
        </View>

        {/* Backup */}
        <SectionHeader title="النسخ الاحتياطي" colors={colors} icon="cloud-outline" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>تصدير أو استيراد {products.length} منتج</Text>
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
          <InfoRow label="اسم التطبيق" value={settings.appName || 'مجاهد للتجارة'} colors={colors} />
          <InfoRow label="الإصدار" value="1.2.0" colors={colors} />
          <InfoRow label="عدد المنتجات" value={String(products.length)} colors={colors} />
          <InfoRow label="عدد الأقسام" value={String(categories.length)} colors={colors} last />
        </View>

        {/* Contact */}
        <SectionHeader title="الدعم" colors={colors} icon="headset-outline" />
        <TouchableOpacity
          style={[styles.card, styles.row, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/contact'); }}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>تواصل مع المُبرمج</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>نداء الرحمن عبّود</Text>
          </View>
          <View style={[styles.contactIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="person-outline" size={18} color={colors.primaryForeground} />
          </View>
        </TouchableOpacity>
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

      {/* ─── Theme Picker Modal ─── */}
      <BottomSheetModal
        visible={activeModal === 'theme'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title="اختر الثيم"
      >
        {THEMES.map((t, idx) => {
          const isActive = settings.themeId === t.id || (!settings.themeId && t.id === 'ocean');
          return (
            <React.Fragment key={t.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                style={[styles.themeRow, isActive && { backgroundColor: colors.secondary }]}
                onPress={() => {
                  updateSettings({ themeId: t.id });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveModal('none');
                }}
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

      {/* ─── App Name Modal ─── */}
      <BottomSheetModal
        visible={activeModal === 'appName'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title="تغيير اسم التطبيق"
      >
        <ModalLabel text="الاسم الجديد" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
          value={appNameInput}
          onChangeText={setAppNameInput}
          placeholder="مجاهد للتجارة"
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
          autoFocus
        />
        <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveAppName}>
          <Text style={[styles.modalSaveBtnText, { color: colors.primaryForeground }]}>حفظ الاسم</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ─── PIN Setup Modal ─── */}
      <BottomSheetModal
        visible={activeModal === 'pinSetup'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title={settings.pinEnabled ? 'تغيير PIN' : 'تفعيل قفل PIN'}
      >
        <ModalLabel text="أدخل PIN الجديد (4 أرقام)" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
          value={newPin}
          onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="● ● ● ●"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <ModalLabel text="تأكيد PIN" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
          value={confirmPin}
          onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="● ● ● ●"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSavePin}>
          <Text style={[styles.modalSaveBtnText, { color: colors.primaryForeground }]}>تفعيل القفل</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ─── PIN Recovery Modal ─── */}
      <BottomSheetModal
        visible={activeModal === 'pinRecover'}
        onClose={() => setActiveModal('none')}
        colors={colors}
        title="استعادة PIN"
      >
        <Text style={[styles.recoverNote, { color: colors.mutedForeground }]}>
          أدخل مفتاح الأمان (10 أحرف) لإعادة تعيين PIN.
        </Text>
        <ModalLabel text="مفتاح الأمان" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
          value={recoverKey}
          onChangeText={setRecoverKey}
          placeholder="أدخل مفتاح الأمان"
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
          autoCapitalize="none"
        />
        <ModalLabel text="PIN الجديد (4 أرقام)" colors={colors} />
        <TextInput
          style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input, letterSpacing: 8, textAlign: 'center' }]}
          value={recoverNewPin}
          onChangeText={(t) => setRecoverNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="● ● ● ●"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.success }]} onPress={handleRecoverPin}>
          <Text style={[styles.modalSaveBtnText, { color: '#fff' }]}>إعادة تعيين PIN</Text>
        </TouchableOpacity>
      </BottomSheetModal>
    </View>
  );
}

function BottomSheetModal({
  visible, onClose, colors, title, children,
}: {
  visible: boolean; onClose: () => void; colors: any; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
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
  label: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 18 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateInput: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 18, fontFamily: 'Tajawal_500Medium' },
  saveBtn: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rateBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  rateNote: { fontSize: 13, fontFamily: 'Tajawal_500Medium', textAlign: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  catActions: { flexDirection: 'row', gap: 6 },
  catAction: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  catHidden: { fontSize: 10, fontFamily: 'Tajawal_400Regular' },
  catIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addCatText: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  switchNote: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  actionBtn: { height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  actionBtnText: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  keyDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  keyText: { flex: 1, fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', letterSpacing: 3 },
  keyBtns: { flexDirection: 'row', gap: 10 },
  backupBtns: { flexDirection: 'row', gap: 10 },
  backupBtn: { height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  backupBtnText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoValue: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  infoLabel: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  contactIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 20, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right', marginBottom: 6, marginTop: 4 },
  modalInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Tajawal_500Medium', marginBottom: 10 },
  modalSaveBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 4 },
  modalSaveBtnText: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  // Category modal
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'center' },
  previewIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 18, fontFamily: 'Tajawal_700Bold' },
  colorRow: { flexDirection: 'row', gap: 10, paddingVertical: 4, marginBottom: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  iconOption: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // Theme
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  themeCheckEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ccc' },
  themeRowText: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  themeSwatches: { flexDirection: 'row', gap: 4 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  // PIN recover
  recoverNote: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 20, marginBottom: 10 },
});
