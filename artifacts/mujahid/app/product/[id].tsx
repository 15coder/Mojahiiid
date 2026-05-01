import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceholderImage } from '@/components/PlaceholderImage';
import { PriceTrendIcon } from '@/components/PriceTrendIcon';
import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';
import { formatArabicDate, formatPrice } from '@/utils/dateFormatter';
import { getTrend } from '@/utils/priceUtils';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProductById, deleteProduct } = useProducts();
  const [imageIdx, setImageIdx] = useState(0);

  const product = getProductById(id);

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

  function handleDelete() {
    Alert.alert('حذف المنتج', `هل تريد حذف "${product!.name}" نهائياً؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(product!.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        },
      },
    ]);
  }

  function handleEdit() {
    router.push({ pathname: '/product/edit/[id]', params: { id: product!.id } });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleDelete} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="trash-outline" size={20} color={colors.destructive} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity onPress={handleEdit} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
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

          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            آخر تعديل: {formatArabicDate(product.lastModified)}
          </Text>
        </View>

        <PriceCard
          title="سعر البيع"
          icon="trending-up"
          iconColor={colors.success}
          priceSYP={product.sellingPriceSYP}
          priceUSD={product.sellingPriceUSD}
          prevSYP={product.previousSellingPriceSYP}
          prevUSD={product.previousSellingPriceUSD}
          trend={sellTrend}
          colors={colors}
          highlight
        />

        <PriceCard
          title="سعر التكلفة"
          icon="trending-down"
          iconColor={colors.mutedForeground}
          priceSYP={product.costSYP}
          priceUSD={product.costUSD}
          prevSYP={product.previousCostSYP}
          prevUSD={product.previousCostUSD}
          trend={costTrend}
          colors={colors}
        />

        {product.notes ? (
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={[styles.notesTitle, { color: colors.primary }]}>ملاحظات</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{product.notes}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.editFullBtn, { backgroundColor: colors.primary }]}
          onPress={handleEdit}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={20} color={colors.primaryForeground} />
          <Text style={[styles.editBtnText, { color: colors.primaryForeground }]}>تعديل المنتج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function PriceCard({
  title, icon, iconColor, priceSYP, priceUSD, prevSYP, prevUSD, trend, colors, highlight,
}: {
  title: string; icon: string; iconColor: string;
  priceSYP: number; priceUSD: number;
  prevSYP?: number; prevUSD?: number;
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
          {prevSYP !== undefined && prevSYP !== priceSYP && (
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
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Tajawal_700Bold',
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  imageSection: {
    alignItems: 'center',
    gap: 10,
  },
  imageContainer: {
    width: '100%',
  },
  mainImage: {
    width: '100%',
    height: 240,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
  },
  infoSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  productName: {
    fontSize: 24,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
  },
  barcodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  barcodeText: {
    fontSize: 13,
    fontFamily: 'Tajawal_500Medium',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
  },
  priceCard: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
    alignItems: 'flex-end',
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  priceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceCardTitle: {
    fontSize: 14,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prevPrice: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textDecorationLine: 'line-through',
  },
  bigPrice: {
    fontSize: 28,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
  },
  usdPrice: {
    fontSize: 16,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
  },
  notesCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  notesTitle: {
    fontSize: 13,
    fontFamily: 'Tajawal_700Bold',
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    lineHeight: 22,
  },
  editFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  editBtnText: {
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
  },
  notFound: {
    fontSize: 18,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
    marginTop: 40,
  },
});
