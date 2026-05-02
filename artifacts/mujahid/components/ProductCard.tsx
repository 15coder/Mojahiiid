import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { useCategories } from '@/context/CategoriesContext';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/types/product';
import { formatArabicDate, formatPrice } from '@/utils/dateFormatter';
import { getTrend } from '@/utils/priceUtils';
import { PlaceholderImage } from './PlaceholderImage';
import { PriceTrendIcon } from './PriceTrendIcon';

interface Props {
  product: Product;
  index: number;
  onPress: () => void;
  grid?: boolean;
  customerViewMode?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function isPriceUpdatedRecently(lastModified: string): boolean {
  const diff = Date.now() - new Date(lastModified).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

function ProductCardInner({ product, onPress, grid, customerViewMode }: Omit<Props, 'index'>) {
  const colors = useColors();
  const { getCategoryById } = useCategories();
  const scale = useSharedValue(1);

  const sellingTrend = getTrend(product.sellingPriceSYP, product.previousSellingPriceSYP);
  const costTrend = getTrend(product.costSYP, product.previousCostSYP);
  const hasImage = product.imagePaths && product.imagePaths.length > 0;
  const category = getCategoryById(product.categoryId);
  const priceUpdatedRecently = isPriceUpdatedRecently(product.lastModified);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }

  if (grid) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.gridCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          animatedStyle,
        ]}
      >
        {priceUpdatedRecently && (
          <View style={styles.updatedBadge}>
            <Text style={styles.updatedBadgeText}>سعر محدث</Text>
          </View>
        )}
        <View style={styles.gridImageWrap}>
          {hasImage ? (
            <Image
              source={{ uri: product.imagePaths[0] }}
              style={[styles.gridImage, { borderRadius: colors.radius * 0.5 }]}
              contentFit="cover"
            />
          ) : (
            <PlaceholderImage size={60} categoryIcon={category?.icon} categoryColor={category?.color} />
          )}
        </View>
        <Text style={[styles.gridName, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        {category && (
          <View style={[styles.categoryBadge, { backgroundColor: category.color + '18' }]}>
            <Ionicons name={category.icon as any} size={10} color={category.color} />
            <Text style={[styles.categoryText, { color: category.color }]}>{category.name}</Text>
          </View>
        )}
        <View style={styles.gridPriceRow}>
          <PriceTrendIcon trend={sellingTrend} />
          <Text style={[styles.gridPrice, { color: colors.primary }]} numberOfLines={1}>
            {formatPrice(product.sellingPriceSYP, 'SYP')}
          </Text>
        </View>
        {!customerViewMode && product.costSYP > 0 && (
          <Text style={[styles.gridCost, { color: colors.mutedForeground }]} numberOfLines={1}>
            التكلفة: {formatPrice(product.costSYP, 'SYP')}
          </Text>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        animatedStyle,
      ]}
    >
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image
            source={{ uri: product.imagePaths[0] }}
            style={[styles.image, { borderRadius: colors.radius * 0.6 }]}
            contentFit="cover"
          />
        ) : (
          <PlaceholderImage
            size={72}
            categoryIcon={category?.icon}
            categoryColor={category?.color}
          />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <View style={styles.nameLeft}>
            {priceUpdatedRecently && (
              <View style={styles.updatedBadgeInline}>
                <Text style={styles.updatedBadgeText}>سعر محدث</Text>
              </View>
            )}
            {product.barcode ? (
              <View style={[styles.barcodeBadge, { backgroundColor: colors.secondary }]}>
                <Ionicons name="barcode-outline" size={12} color={colors.primary} />
              </View>
            ) : null}
          </View>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {product.name}
          </Text>
        </View>

        {category && (
          <View style={[styles.categoryBadge, { backgroundColor: category.color + '18' }]}>
            <Ionicons name={category.icon as any} size={11} color={category.color} />
            <Text style={[styles.categoryText, { color: category.color }]}>{category.name}</Text>
          </View>
        )}

        <View style={styles.pricesRow}>
          {!customerViewMode && (
            <>
              <View style={styles.priceGroup}>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>التكلفة</Text>
                <View style={styles.priceValueRow}>
                  <PriceTrendIcon trend={costTrend} />
                  <Text style={[styles.priceValue, { color: colors.foreground }]}>
                    {formatPrice(product.costSYP, 'SYP')}
                  </Text>
                </View>
                <Text style={[styles.priceUsd, { color: colors.silver }]}>
                  {formatPrice(product.costUSD, 'USD')}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          <View style={styles.priceGroup}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>سعر البيع</Text>
            <View style={styles.priceValueRow}>
              <PriceTrendIcon trend={sellingTrend} />
              <Text style={[styles.priceValue, { color: colors.primary }]}>
                {formatPrice(product.sellingPriceSYP, 'SYP')}
              </Text>
            </View>
            <Text style={[styles.priceUsd, { color: colors.silver }]}>
              {formatPrice(product.sellingPriceUSD, 'USD')}
            </Text>
          </View>
        </View>

        <Text style={[styles.timestamp, { color: colors.mutedForeground }]} numberOfLines={1}>
          آخر تعديل: {formatArabicDate(product.lastModified)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export function ProductCard({ product, index, onPress, grid, customerViewMode }: Props) {
  return <ProductCardInner product={product} onPress={onPress} grid={grid} customerViewMode={customerViewMode} />;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    alignSelf: 'center',
  },
  image: {
    width: 72,
    height: 72,
  },
  content: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    width: '100%',
  },
  nameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
    flex: 1,
  },
  barcodeBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Tajawal_500Medium',
  },
  pricesRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-end',
  },
  priceGroup: {
    alignItems: 'flex-end',
    gap: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: 'Tajawal_400Regular',
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  priceValue: {
    fontSize: 14,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
  },
  priceUsd: {
    fontSize: 11,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
  },
  divider: {
    width: 1,
    height: 40,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    width: '100%',
  },
  updatedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  updatedBadgeInline: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  updatedBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Tajawal_700Bold',
  },
  gridCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  gridImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridImage: {
    width: 64,
    height: 64,
  },
  gridName: {
    fontSize: 13,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  gridPrice: {
    fontSize: 13,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    justifyContent: 'center',
  },
  gridCost: {
    fontSize: 10,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
  },
});
