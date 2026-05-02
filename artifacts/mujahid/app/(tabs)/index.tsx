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
  FadeInUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { useCategories } from '@/context/CategoriesContext';
import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/types/product';
import { searchProducts } from '@/utils/fuzzySearch';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const NO_CATEGORY_ID = '__none__';

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, isLoading } = useProducts();
  const { visibleCategories, getCategoryById } = useCategories();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showBarcodeSearch, setShowBarcodeSearch] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const barcodeInputRef = useRef<TextInput>(null);
  const fabScale = useSharedValue(1);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    let noCatCount = 0;
    products.forEach((p) => {
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] || 0) + 1;
      } else {
        noCatCount++;
      }
    });
    map[NO_CATEGORY_ID] = noCatCount;
    return map;
  }, [products]);

  const sortedCategories = useMemo(() => {
    return [...visibleCategories].sort(
      (a, b) => (countByCategory[b.id] || 0) - (countByCategory[a.id] || 0)
    );
  }, [visibleCategories, countByCategory]);

  const filtered = useMemo(() => {
    let list = products;

    if (barcodeQuery.trim()) {
      const q = barcodeQuery.trim();
      list = list.filter((p) => p.barcode?.includes(q));
    } else if (query.trim()) {
      list = searchProducts(query, list);
    }

    if (activeCategoryId === NO_CATEGORY_ID) {
      list = list.filter((p) => !p.categoryId);
    } else if (activeCategoryId) {
      list = list.filter((p) => p.categoryId === activeCategoryId);
    }

    return list;
  }, [query, barcodeQuery, products, activeCategoryId]);

  const listKey = `${activeCategoryId ?? 'all'}-${query}-${barcodeQuery}-${animKey}`;

  function handleCalculatorPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/calculator');
  }

  function handleFabPressIn() {
    fabScale.value = withSpring(0.88, { damping: 20, stiffness: 500 });
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
    setAnimKey((k) => k + 1);
  }

  function toggleBarcodeSearch() {
    setShowBarcodeSearch((prev) => {
      if (!prev) setTimeout(() => barcodeInputRef.current?.focus(), 120);
      else setBarcodeQuery('');
      return !prev;
    });
  }

  const activeCategory = activeCategoryId && activeCategoryId !== NO_CATEGORY_ID
    ? getCategoryById(activeCategoryId)
    : null;
  const noCatCount = countByCategory[NO_CATEGORY_ID] || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(350).springify().damping(22)}
        style={[styles.header, { paddingTop: topInset + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{settings.appName || 'المنتجات'}</Text>
            <Text style={[styles.headerCount, { color: colors.silver }]}>{filtered.length}/{products.length}</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleBarcodeSearch}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: showBarcodeSearch ? colors.primary : colors.secondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="barcode-outline" size={20} color={showBarcodeSearch ? colors.primaryForeground : colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/scanner')}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Barcode search */}
        {showBarcodeSearch && (
          <Animated.View entering={FadeInDown.duration(220).springify()} style={styles.barcodeSearchRow}>
            <Ionicons name="barcode-outline" size={18} color={colors.silver} />
            <TextInput
              ref={barcodeInputRef}
              style={[styles.barcodeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              value={barcodeQuery}
              onChangeText={(t) => setBarcodeQuery(t.replace(/[^0-9]/g, ''))}
              placeholder="أدخل أرقام الباركود..."
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs} style={styles.categoryScroll}>
          <Pressable
            onPress={() => handleCategorySelect(null)}
            style={[
              styles.categoryTab,
              { backgroundColor: activeCategoryId === null ? colors.primary : colors.secondary, borderColor: activeCategoryId === null ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.categoryTabText, { color: activeCategoryId === null ? colors.primaryForeground : colors.foreground }]}>الكل</Text>
            <View style={[styles.countBadge, { backgroundColor: activeCategoryId === null ? 'rgba(255,255,255,0.25)' : colors.muted }]}>
              <Text style={[styles.countBadgeText, { color: activeCategoryId === null ? '#fff' : colors.silver }]}>{products.length}</Text>
            </View>
          </Pressable>

          {sortedCategories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            const count = countByCategory[cat.id] || 0;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                style={[
                  styles.categoryTab,
                  { backgroundColor: isActive ? cat.color : colors.secondary, borderColor: isActive ? cat.color : colors.border },
                ]}
              >
                <Ionicons name={cat.icon as any} size={13} color={isActive ? '#fff' : cat.color} />
                <Text style={[styles.categoryTabText, { color: isActive ? '#fff' : colors.foreground }]}>{cat.name}</Text>
                <View style={[styles.countBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.muted }]}>
                  <Text style={[styles.countBadgeText, { color: isActive ? '#fff' : colors.silver }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}

          {noCatCount > 0 && (
            <Pressable
              onPress={() => handleCategorySelect(NO_CATEGORY_ID)}
              style={[
                styles.categoryTab,
                {
                  backgroundColor: activeCategoryId === NO_CATEGORY_ID ? colors.silver : colors.secondary,
                  borderColor: activeCategoryId === NO_CATEGORY_ID ? colors.silver : colors.border,
                },
              ]}
            >
              <Ionicons name="apps-outline" size={13} color={activeCategoryId === NO_CATEGORY_ID ? '#fff' : colors.silver} />
              <Text style={[styles.categoryTabText, { color: activeCategoryId === NO_CATEGORY_ID ? '#fff' : colors.foreground }]}>بدون قسم</Text>
              <View style={[styles.countBadge, { backgroundColor: activeCategoryId === NO_CATEGORY_ID ? 'rgba(255,255,255,0.25)' : colors.muted }]}>
                <Text style={[styles.countBadgeText, { color: activeCategoryId === NO_CATEGORY_ID ? '#fff' : colors.silver }]}>{noCatCount}</Text>
              </View>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>

      {/* Content */}
      {isLoading ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(350).springify().damping(20)} style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
            {activeCategory ? (
              <Ionicons name={activeCategory.icon as any} size={40} color={activeCategory.color} />
            ) : activeCategoryId === NO_CATEGORY_ID ? (
              <Ionicons name="apps-outline" size={40} color={colors.silver} />
            ) : (
              <Ionicons name="cube-outline" size={40} color={colors.muted} />
            )}
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {query || barcodeQuery
              ? 'لا توجد نتائج'
              : activeCategory
              ? `لا منتجات في "${activeCategory.name}"`
              : activeCategoryId === NO_CATEGORY_ID
              ? 'لا توجد منتجات بدون قسم'
              : 'لا توجد منتجات'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {query || barcodeQuery ? 'جرّب كلمة بحث مختلفة' : 'أضف منتجاً من صفحة الإعدادات'}
          </Text>
        </Animated.View>
      ) : (
        <FlatList<Product>
          key={listKey}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp
                .delay(index * 35)
                .duration(350)
                .springify()
                .damping(20)
                .stiffness(160)}
              layout={LinearTransition.springify().damping(20)}
            >
              <ProductCard
                product={item}
                index={index}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
              />
            </Animated.View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 90 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        />
      )}

      {/* FAB — Calculator */}
      <Animated.View
        entering={FadeInDown.delay(300).springify().damping(14).stiffness(120)}
        style={[styles.fab, { bottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 }]}
      >
        <AnimatedPressable
          style={[styles.fabInner, { backgroundColor: colors.primary }, fabStyle]}
          onPress={handleCalculatorPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
        >
          <Ionicons name="calculator-outline" size={26} color={colors.primaryForeground} />
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  headerCount: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, gap: 8, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Tajawal_400Regular', height: 44 },
  barcodeSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barcodeInput: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Tajawal_500Medium' },
  categoryScroll: { marginHorizontal: -16 },
  categoryTabs: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  categoryTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryTabText: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  countBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countBadgeText: { fontSize: 10, fontFamily: 'Tajawal_700Bold' },
  list: { paddingTop: 8, paddingHorizontal: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 20 },
  fab: { position: 'absolute', right: 20 },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
});
