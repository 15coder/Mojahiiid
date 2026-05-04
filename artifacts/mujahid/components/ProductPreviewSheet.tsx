import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/context/CategoriesContext';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/types/product';
import { formatPrice, formatNewSYP } from '@/utils/dateFormatter';
import { PlaceholderImage } from './PlaceholderImage';

interface Props {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  customerViewMode?: boolean;
}

export function ProductPreviewSheet({ product, visible, onClose, customerViewMode }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getCategoryById } = useCategories();

  const translateY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!product) return null;

  const category = getCategoryById(product.categoryId);
  const hasImage = product.imagePaths && product.imagePaths.length > 0;
  const profit = product.sellingPriceSYP - product.costSYP;
  const profitPct = product.costSYP > 0 ? Math.round((profit / product.costSYP) * 100) : 0;

  function handleViewFull() {
    onClose();
    setTimeout(() => router.push({ pathname: '/product/[id]', params: { id: product!.id } }), 180);
  }

  function handleEdit() {
    onClose();
    setTimeout(() => router.push({ pathname: '/product/edit/[id]', params: { id: product!.id } }), 180);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {category && (
            <View style={[styles.categoryStrip, { backgroundColor: category.color + '18', borderColor: category.color + '30' }]}>
              <Ionicons name={category.icon as any} size={13} color={category.color} />
              <Text style={[styles.categoryText, { color: category.color }]}>{category.name}</Text>
            </View>
          )}

          <View style={styles.topRow}>
            <View style={styles.imageWrap}>
              {hasImage ? (
                <Image
                  source={{ uri: product.imagePaths[0] }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <PlaceholderImage size={80} categoryIcon={category?.icon} categoryColor={category?.color} />
              )}
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
                {product.name}
              </Text>
              {product.barcode ? (
                <View style={[styles.barcodeBadge, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="barcode-outline" size={12} color={colors.primary} />
                  <Text style={[styles.barcodeText, { color: colors.mutedForeground }]}>{product.barcode}</Text>
                </View>
              ) : null}
              {product.notes ? (
                <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {product.notes}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Prices */}
          <View style={[styles.pricesCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {!customerViewMode && (
              <>
                <View style={styles.priceItem}>
                  <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>التكلفة</Text>
                  <Text style={[styles.priceValue, { color: colors.warning ?? '#F59E0B' }]}>
                    {formatPrice(product.costSYP, 'SYP')}
                  </Text>
                  <Text style={[styles.priceNew, { color: colors.mutedForeground }]}>
                    {formatNewSYP(product.costSYP)}
                  </Text>
                  <Text style={[styles.priceUsd, { color: colors.silver }]}>
                    {formatPrice(product.costUSD, 'USD')}
                  </Text>
                </View>
                <View style={[styles.priceDivider, { backgroundColor: colors.border }]} />
              </>
            )}
            <View style={styles.priceItem}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>سعر البيع</Text>
              <Text style={[styles.priceValue, { color: '#22C55E' }]}>
                {formatPrice(product.sellingPriceSYP, 'SYP')}
              </Text>
              <Text style={[styles.priceNew, { color: colors.mutedForeground }]}>
                {formatNewSYP(product.sellingPriceSYP)}
              </Text>
              <Text style={[styles.priceUsd, { color: colors.silver }]}>
                {formatPrice(product.sellingPriceUSD, 'USD')}
              </Text>
            </View>
            {!customerViewMode && product.costSYP > 0 && (
              <>
                <View style={[styles.priceDivider, { backgroundColor: colors.border }]} />
                <View style={styles.priceItem}>
                  <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>الربح</Text>
                  <Text style={[styles.priceValue, { color: profit >= 0 ? '#22C55E' : colors.destructive }]}>
                    {formatPrice(Math.abs(profit), 'SYP')}
                  </Text>
                  <Text style={[styles.priceNew, { color: profit >= 0 ? '#22C55E' : colors.destructive }]}>
                    {formatNewSYP(Math.abs(profit))}
                  </Text>
                  <Text style={[styles.priceUsd, { color: profit >= 0 ? '#22C55E' : colors.destructive }]}>
                    {profitPct}%
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleEdit}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>تعديل</Text>
            </Pressable>
            <Pressable
              onPress={handleViewFull}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.primaryAction,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="eye-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.actionText, { color: colors.primaryForeground }]}>عرض كامل</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  categoryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-end',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Tajawal_500Medium',
  },
  topRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  imageWrap: {
    flexShrink: 0,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-end',
  },
  productName: {
    fontSize: 18,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right',
    lineHeight: 26,
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  barcodeText: {
    fontSize: 11,
    fontFamily: 'Tajawal_400Regular',
  },
  notes: {
    fontSize: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    lineHeight: 18,
  },
  pricesCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  priceItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: 'Tajawal_400Regular',
  },
  priceValue: {
    fontSize: 15,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  priceNew: {
    fontSize: 11,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'center',
  },
  priceUsd: {
    fontSize: 11,
    fontFamily: 'Tajawal_400Regular',
  },
  priceDivider: {
    width: 1,
    height: 52,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  primaryAction: {
    flex: 2,
    borderWidth: 0,
  },
  actionText: {
    fontSize: 15,
    fontFamily: 'Tajawal_700Bold',
  },
});
