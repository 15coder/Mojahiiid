import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { useCategories } from '@/context/CategoriesContext';
import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/types/product';
import { searchProducts } from '@/utils/fuzzySearch';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, isLoading } = useProducts();
  const { visibleCategories, getCategoryById } = useCategories();
  const [query, setQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showBarcodeSearch, setShowBarcodeSearch] = useState(false);
  const barcodeInputRef = useRef<TextInput>(null);
  const fabScale = useSharedValue(1);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    let list = products;

    if (barcodeQuery.trim()) {
      const q = barcodeQuery.trim();
      list = list.filter((p) => p.barcode?.includes(q));
    } else if (query.trim()) {
      list = searchProducts(query, list);
    }

    if (activeCategoryId) {
      list = list.filter((p) => p.categoryId === activeCategoryId);
    }

    return list;
  }, [query, barcodeQuery, products, activeCategoryId]);

  function handleAddPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/product/add');
  }

  function handleFabPressIn() {
    fabScale.value = withSpring(0.92, { damping: 20, stiffness: 400 });
  }

  function handleFabPressOut() {
    fabScale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  function handleCategorySelect(id: string | null) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategoryId(id);
  }

  function toggleBarcodeSearch() {
    setShowBarcodeSearch((prev) => {
      if (!prev) {
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      } else {
        setBarcodeQuery('');
      }
      return !prev;
    });
  }

  const activeCategory = activeCategoryId ? getCategoryById(activeCategoryId) : null;

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Header ─── */}
      <Animated.View
        entering={FadeInDown.duration(400).springify().damping(20)}
        style={[
          styles.header,
          {
            paddingTop: topInset + 10,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Top row */}
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>المنتجات</Text>
            <Text style={[styles.headerCount, { color: colors.silver }]}>
              {filtered.length}/{products.length}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleBarcodeSearch}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: showBarcodeSearch ? colors.primary : colors.secondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name="barcode-outline"
                size={20}
                color={showBarcodeSearch ? colors.primaryForeground : colors.primary}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/scanner')}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Barcode search */}
        {showBarcodeSearch && (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.barcodeSearchRow}>
            <Ionicons name="barcode-outline" size={18} color={colors.silver} />
            <TextInput
              ref={barcodeInputRef}
              style={[styles.barcodeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              value={barcodeQuery}
              onChangeText={setBarcodeQuery}
              placeholder="أدخل رقم الباركود..."
              placeholderTextColor={colors.mutedForeground}
              keyboardType="default"
              returnKeyType="search"
              textAlign="right"
            />
            {barcodeQuery.length > 0 && (
              <Pressable onPress={() => setBarcodeQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.silver} />
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Text search */}
        {!showBarcodeSearch && (
          <View style={[styles.searchRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.silver} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث عن منتج..."
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.silver} />
              </Pressable>
            )}
          </View>
        )}

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabs}
          style={styles.categoryScroll}
        >
          <Pressable
            onPress={() => handleCategorySelect(null)}
            style={[
              styles.categoryTab,
              {
                backgroundColor: activeCategoryId === null ? colors.primary : colors.secondary,
                borderColor: activeCategoryId === null ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[
              styles.categoryTabText,
              { color: activeCategoryId === null ? colors.primaryForeground : colors.foreground }
            ]}>
              الكل
            </Text>
            <View style={[
              styles.categoryBadge,
              { backgroundColor: activeCategoryId === null ? 'rgba(255,255,255,0.25)' : colors.muted }
            ]}>
              <Text style={[
                styles.categoryBadgeText,
                { color: activeCategoryId === null ? '#fff' : colors.silver }
              ]}>
                {products.length}
              </Text>
            </View>
          </Pressable>

          {visibleCategories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            const count = countByCategory[cat.id] || 0;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                style={[
                  styles.categoryTab,
                  {
                    backgroundColor: isActive ? cat.color : colors.secondary,
                    borderColor: isActive ? cat.color : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={isActive ? '#fff' : cat.color}
                />
                <Text style={[
                  styles.categoryTabText,
                  { color: isActive ? '#fff' : colors.foreground }
                ]}>
                  {cat.name}
                </Text>
                <View style={[
                  styles.categoryBadge,
                  { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.muted }
                ]}>
                  <Text style={[
                    styles.categoryBadgeText,
                    { color: isActive ? '#fff' : colors.silver }
                  ]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ─── Content ─── */}
      {isLoading ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
            {activeCategory ? (
              <Ionicons name={activeCategory.icon as any} size={40} color={activeCategory.color} />
            ) : (
              <Ionicons name="cube-outline" size={40} color={colors.muted} />
            )}
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {query || barcodeQuery ? 'لا توجد نتائج' : activeCategory ? `لا منتجات في "${activeCategory.name}"` : 'لا توجد منتجات'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {query || barcodeQuery ? 'جرّب كلمة بحث مختلفة' : 'اضغط + لإضافة منتج جديد'}
          </Text>
        </Animated.View>
      ) : (
        <FlatList<Product>
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ProductCard
              product={item}
              index={index}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ─── FAB ─── */}
      <Animated.View
        entering={FadeInDown.delay(200).springify().damping(16).stiffness(150)}
        style={[
          styles.fab,
          { bottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 },
        ]}
      >
        <AnimatedPressable
          style={[styles.fabInner, { backgroundColor: colors.primary }, fabStyle]}
          onPress={handleAddPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
        >
          <Ionicons name="add" size={30} color={colors.primaryForeground} />
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  headerCount: {
    fontSize: 11,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Tajawal_400Regular',
    height: 44,
  },
  barcodeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'Tajawal_500Medium',
  },
  categoryScroll: {
    marginHorizontal: -16,
  },
  categoryTabs: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 12,
    fontFamily: 'Tajawal_500Medium',
  },
  categoryBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Tajawal_700Bold',
  },
  list: {
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
