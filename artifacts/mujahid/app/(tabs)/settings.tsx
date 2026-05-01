import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { products, exportData, importData } = useProducts();
  const [rateInput, setRateInput] = useState(String(settings.exchangeRate));
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  async function handleRateSubmit() {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صرف صحيح');
      return;
    }
    await updateSettings({ exchangeRate: val });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('تم', 'تم تحديث سعر الصرف بنجاح');
  }

  async function handleToggleBiometric(value: boolean) {
    if (Platform.OS === 'web') {
      Alert.alert('غير مدعوم', 'المصادقة البيومترية غير متاحة على الويب');
      return;
    }
    await updateSettings({ biometricEnabled: value });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleExport() {
    if (Platform.OS === 'web') {
      Alert.alert('غير مدعوم', 'التصدير غير متاح على الويب حالياً');
      return;
    }
    try {
      setIsExporting(true);
      const json = await exportData();
      const path = `${FileSystem.cacheDirectory}mujahid-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'مشاركة نسخة احتياطية',
        });
      } else {
        Alert.alert('تم', `تم حفظ الملف في: ${path}`);
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل التصدير');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport() {
    if (Platform.OS === 'web') {
      Alert.alert('غير مدعوم', 'الاستيراد غير متاح على الويب حالياً');
      return;
    }
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      const json = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
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
                Alert.alert('تم الاستيراد', `تم استيراد ${count} منتج بنجاح`);
              } catch (e: any) {
                Alert.alert('خطأ', e?.message || 'فشل الاستيراد');
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل فتح الملف');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topInset + 16,
          paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 56,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={[styles.logoText, { color: colors.primaryForeground }]}>م</Text>
        </View>
        <View style={styles.headerTexts}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>الإعدادات</Text>
          <Text style={[styles.pageSubtitle, { color: colors.silver }]}>مجاهد للتجارة</Text>
        </View>
      </View>

      {/* ─── Exchange Rate ─── */}
      <SectionHeader title="معدل الصرف" colors={colors} icon="cash-outline" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          سعر الدولار بالليرة السورية (SYP)
        </Text>
        <View style={styles.rateRow}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleRateSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={22} color={colors.primaryForeground} />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.rateInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.input,
                fontFamily: 'Tajawal_500Medium',
              },
            ]}
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

      {/* ─── Security ─── */}
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
            <Text style={[styles.switchNote, { color: colors.mutedForeground }]}>
              يتطلب إعادة تشغيل التطبيق للتفعيل
            </Text>
          </View>
          <Ionicons name="finger-print" size={24} color={colors.primary} />
        </View>
      </View>

      {/* ─── Backup ─── */}
      <SectionHeader title="النسخ الاحتياطي" colors={colors} icon="cloud-outline" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 12 }]}>
        <Text style={[styles.backupNote, { color: colors.mutedForeground }]}>
          يمكنك تصدير بيانات {products.length} منتج إلى ملف JSON ومشاركته، أو استيراد ملف نسخة سابقة.
        </Text>
        <View style={styles.backupBtns}>
          <TouchableOpacity
            style={[styles.backupBtn, { backgroundColor: colors.primary, flex: 1 }]}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color={colors.primaryForeground} />
            <Text style={[styles.backupBtnText, { color: colors.primaryForeground }]} numberOfLines={1}>
              {isExporting ? 'جاري...' : 'تصدير'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.backupBtn,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderWidth: 1,
                flex: 1,
              },
            ]}
            onPress={handleImport}
            disabled={isImporting}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            <Text style={[styles.backupBtnText, { color: colors.primary }]} numberOfLines={1}>
              {isImporting ? 'جاري...' : 'استيراد'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Info ─── */}
      <SectionHeader title="معلومات التطبيق" colors={colors} icon="information-circle-outline" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <InfoRow label="اسم التطبيق" value="مجاهد للتجارة" colors={colors} />
        <InfoRow label="الإصدار" value="1.0.0" colors={colors} />
        <InfoRow label="عدد المنتجات" value={String(products.length)} colors={colors} />
        <InfoRow label="العملة الأساسية" value="ليرة سورية (SYP)" colors={colors} last />
      </View>

      {/* ─── Developer Contact ─── */}
      <SectionHeader title="الدعم والتواصل" colors={colors} icon="headset-outline" />
      <TouchableOpacity
        style={[styles.card, styles.contactCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/contact');
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.contactIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="person-outline" size={20} color={colors.primaryForeground} />
        </View>
        <View style={styles.contactTexts}>
          <Text style={[styles.contactTitle, { color: colors.foreground }]}>تواصل مع المُبرمج</Text>
          <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>نداء الرحمن عبّود</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionHeader({ title, colors, icon }: { title: string; colors: any; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={15} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
  last,
}: {
  label: string;
  value: string;
  colors: any;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 26, fontFamily: 'Tajawal_700Bold' },
  headerTexts: { alignItems: 'flex-end' },
  pageTitle: { fontSize: 24, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  pageSubtitle: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
    gap: 8,
  },
  label: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateInput: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 20,
    fontFamily: 'Tajawal_500Medium',
  },
  saveBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rateNote: { fontSize: 13, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  },
  switchTexts: { flex: 1, alignItems: 'flex-end' },
  switchLabel: { fontSize: 15, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  switchNote: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  backupNote: {
    fontSize: 13,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    lineHeight: 20,
  },
  backupBtns: { flexDirection: 'row', gap: 10 },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  backupBtnText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  infoLabel: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  infoValue: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'left' },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTexts: { flex: 1, alignItems: 'flex-end' },
  contactTitle: { fontSize: 16, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  contactSub: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
});
