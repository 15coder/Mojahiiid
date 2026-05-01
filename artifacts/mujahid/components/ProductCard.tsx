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
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ProductCardInner({ product, onPress }: Omit<Props, 'index'>) {
  const colors = useColors();
  const { getCategoryById } = useCategories();
  const scale = useSharedValue(1);

  const sellingTrend = getTrend(product.sellingPriceSYP, product.previousSellingPriceSYP);
  const costTrend = getTrend(product.costSYP, product.previousCostSYP);
  const hasImage = product.imagePaths && product.imagePaths.length > 0;
  const category = getCategoryById(product.categoryId);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
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
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {product.name}
          </Text>
          {product.barcode ? (
            <View style={[styles.barcodeBadge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="barcode-outline" size={12} color={colors.primary} />
            </View>
          ) : null}
        </View>

        {category && (
          <View style={[styles.categoryBadge, { backgroundColor: category.color + '18' }]}>
            <Ionicons name={category.icon as any} size={11} color={category.color} />
            <Text style={[styles.categoryText, { color: category.color }]}>{category.name}</Text>
          </View>
        )}

        <View style={styles.pricesRow}>
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

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.priceGroup}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>سعر التكلفة</Text>
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
        </View>

        <Text style={[styles.timestamp, { color: colors.mutedForeground }]} numberOfLines={1}>
          آخر تعديل: {formatArabicDate(product.lastModified)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export function ProductCard({ product, index, onPress }: Props) {
  return <ProductCardInner product={product} onPress={onPress} />;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
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
});
