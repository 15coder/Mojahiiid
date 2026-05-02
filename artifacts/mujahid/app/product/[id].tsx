import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceholderImage } from '@/components/PlaceholderImage';
import { PriceTrendIcon } from '@/components/PriceTrendIcon';
import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';
import { formatArabicDate, formatPrice } from '@/utils/dateFormatter';
import { getTrend } from '@/utils/priceUtils';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProductById, deleteProduct } = useProducts();
  const { settings } = useSettings();
  const [imageIdx, setImageIdx] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const product = getProductById(id);
  const customerViewMode = settings.customerViewMode ?? false;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>المنتج غير موجود</Text>
      </View>
    );
  }

  const costTrend = getTrend(product.costSYP, product.previousCostSYP);
  const sellTrend = getTrend(product.sellingPriceSYP, product.previousSellingPriceSYP);
  const hasImages = product.imagePaths && product.imagePaths.length > 0;

  async function confirmDelete() {
    setShowDeleteModal(false);
    await deleteProduct(product!.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  }

  function handleEdit() {
    router.push({ pathname: '/product/edit/[id]', params: { id: product!.id } });
  }

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lines: string[] = [
      `📦 ${product!.name}`,
    ];
    if (product!.barcode) lines.push(`🔢 الباركود: ${product!.barcode}`);
    lines.push('━━━━━━━━━━━━━━━');
    lines.push(`💰 سعر البيع: ${formatPrice(product!.sellingPriceSYP, 'SYP')}`);
    if (!customerViewMode) {
      lines.push(`💸 سعر التكلفة: ${formatPrice(product!.costSYP, 'SYP')}`);
    }
    if (product!.notes) lines.push(`📝 ${product!.notes}`);
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('📱 تطبيق مجاهد للتجارة');
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {}
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          {hasImages ? (
            <Animated.View entering={FadeIn} style={styles.imageContainer}>
              <Image
                source={{ uri: product.imagePaths[imageIdx] }}
                style={[styles.mainImage, { borderRadius: colors.radius }]}
                contentFit="cover"
              />
            </Animated.View>
          ) : (
            <PlaceholderImage size={200} />
          )}
          {hasImages && product.imagePaths.length > 1 && (
            <View style={styles.thumbnailsRow}>
              {product.imagePaths.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => setImageIdx(i)}>
                  <Image
                    source={{ uri }}
                    style={[
                      styles.thumbnail,
                      {
                        borderRadius: 8,
                        borderColor: i === imageIdx ? colors.primary : colors.border,
                        borderWidth: i === imageIdx ? 2 : 1,
                      },
                    ]}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>

          {product.barcode ? (
            <View style={[styles.barcodePill, { backgroundColor: colors.secondary }]}>
              <Ionicons name="barcode-outline" size={16} color={colors.primary} />
              <Text style={[styles.barcodeText, { color: colors.primary }]}>{product.barcode}</Text>
            </View>
          ) : null}

          <View style={styles.timestampBlock}>
            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
              آخر تعديل: {formatArabicDate(product.lastModified)}
            </Text>
            {product.createdAt && (
              <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
                تاريخ الإضافة: {formatArabicDate(product.createdAt)}
              </Text>
            )}
          </View>
        </View>

        <PriceCard
          title="سعر البيع"
          icon="trending-up"
          iconColor={colors.success}
          priceSYP={product.sellingPriceSYP}
          priceUSD={product.sellingPriceUSD}
          prevSYP={product.previousSellingPriceSYP}
          trend={sellTrend}
          colors={colors}
          highlight
        />

        {!customerViewMode && (
          <PriceCard
            title="سعر التكلفة"
            icon="trending-down"
            iconColor={colors.mutedForeground}
            priceSYP={product.costSYP}
            priceUSD={product.costUSD}
            prevSYP={product.previousCostSYP}
            trend={costTrend}
            colors={colors}
          />
        )}

        {!customerViewMode && product.costSYP > 0 && product.sellingPriceSYP > 0 && (
          <View style={[styles.profitCard, { backgroundColor: product.sellingPriceSYP >= product.costSYP ? colors.success + '12' : colors.destructive + '12', borderColor: product.sellingPriceSYP >= product.costSYP ? colors.success + '30' : colors.destructive + '30' }]}>
            <Text style={[styles.profitLabel, { color: product.sellingPriceSYP >= product.costSYP ? colors.success : colors.destructive }]}>
              {product.sellingPriceSYP >= product.costSYP ? '📈 هامش الربح' : '📉 خسارة'}
            </Text>
            <Text style={[styles.profitValue, { color: product.sellingPriceSYP >= product.costSYP ? colors.success : colors.destructive }]}>
              {formatPrice(product.sellingPriceSYP - product.costSYP, 'SYP')} ({Math.round(((product.sellingPriceSYP - product.costSYP) / product.costSYP) * 100)}%)
            </Text>
          </View>
        )}

        {product.notes ? (
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={[styles.notesTitle, { color: colors.primary }]}>ملاحظات</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{product.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.editFullBtn, { backgroundColor: colors.primary, flex: 1 }]}
            onPress={handleEdit}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={20} color={colors.primaryForeground} />
            <Text style={[styles.editBtnText, { color: colors.primaryForeground }]}>تعديل</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}
            onPress={() => setShowDeleteModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            <Text style={[styles.editBtnText, { color: colors.destructive }]}>حذف</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Animated.View
            entering={FadeInDown.duration(250).springify()}
            style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Pressable onPress={() => {}}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.destructive + '15' }]}>
                <Ionicons name="trash-outline" size={30} color={colors.destructive} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>حذف المنتج</Text>
              <Text style={[styles.modalMessage, { color: colors.mutedForeground }]}>
                هل تريد حذف «{product.name}» نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => setShowDeleteModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
                  onPress={confirmDelete}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>حذف</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function PriceCard({
  title, icon, iconColor, priceSYP, priceUSD, prevSYP, trend, colors, highlight,
}: {
  title: string; icon: string; iconColor: string;
  priceSYP: number; priceUSD: number; prevSYP?: number;
  trend: any; colors: any; highlight?: boolean;
}) {
  return (
    <View style={[
      styles.priceCard,
      { backgroundColor: colors.card, borderColor: highlight ? colors.primary : colors.border, borderWidth: highlight ? 2 : 1 },
    ]}>
      <View style={styles.priceCardHeader}>
        <View style={styles.trendRow}>
          <PriceTrendIcon trend={trend} size={16} />
          {prevSYP !== undefined && prevSYP !== priceSYP && prevSYP > 0 && (
            <Text style={[styles.prevPrice, { color: colors.mutedForeground }]}>
              {formatPrice(prevSYP, 'SYP')}
            </Text>
          )}
        </View>
        <View style={styles.priceTitleRow}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
          <Text style={[styles.priceCardTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
      </View>
      <Text style={[styles.bigPrice, { color: highlight ? colors.primary : colors.foreground }]}>
        {formatPrice(priceSYP, 'SYP')}
      </Text>
      <Text style={[styles.usdPrice, { color: colors.silver }]}>
        {formatPrice(priceUSD, 'USD')}
      </Text>
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
  headerTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  imageSection: { alignItems: 'center', gap: 10 },
  imageContainer: { width: '100%' },
  mainImage: { width: '100%', height: 240 },
  thumbnailsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  thumbnail: { width: 56, height: 56 },
  infoSection: { alignItems: 'flex-end', gap: 6 },
  productName: { fontSize: 24, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  barcodePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  barcodeText: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  timestampBlock: { gap: 2, alignItems: 'flex-end' },
  timestamp: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  profitCard: { borderRadius: 14, padding: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profitLabel: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  profitValue: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
  priceCard: { borderRadius: 16, padding: 16, gap: 4, alignItems: 'flex-end' },
  priceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  priceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceCardTitle: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prevPrice: { fontSize: 12, fontFamily: 'Tajawal_400Regular', textDecorationLine: 'line-through' },
  bigPrice: { fontSize: 28, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  usdPrice: { fontSize: 16, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  notesCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 8 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  notesTitle: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  notesText: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'right', lineHeight: 22 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  shareBtn: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  editBtnText: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  notFound: { fontSize: 18, fontFamily: 'Tajawal_500Medium', textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  modalIconWrap: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 8 },
  modalMessage: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  modalBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
});
