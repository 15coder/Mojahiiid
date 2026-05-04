import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { ProductPreviewSheet } from '@/components/ProductPreviewSheet';
import { SkeletonList } from '@/components/SkeletonCard';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { useCategories } from '@/context/CategoriesContext';
import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/types/product';
import { searchProducts } from '@/utils/fuzzySearch';
import {
  addToRecentlyViewed,
  getRecentlyViewed,
} from '@/utils/recentlyViewed';

const NO_CATEGORY_ID = '__none__';

type SortMode = 'newest' | 'oldest' | 'az' | 'za' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { key: SortMode; label: string; icon: string }[] = [
  { key: 'newest', label: 'الأحدث أولاً', icon: 'time-outline' },
  { key: 'oldest', label: 'الأقدم أولاً', icon: 'hourglass-outline' },
  { key: 'az', label: 'أ — ي', icon: 'text-outline' },
  { key: 'za', label: 'ي — أ', icon: 'text-outline' },
  { key: 'price_asc', label: 'السعر: الأقل أولاً', icon: 'trending-up-outline' },
  { key: 'price_desc', label: 'السعر: الأعلى أولاً', icon: 'trending-down-outline' },
];

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, isLoading, deleteProduct, restoreProduct } = useProducts();
  const { visibleCategories, getCategoryById } = useCategories();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showBarcodeSearch, setShowBarcodeSearch] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [gridView, setGridView] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const barcodeInputRef = useRef<TextInput>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const customerViewMode = settings.customerViewMode ?? false;

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  async function loadRecentlyViewed() {
    const ids = await getRecentlyViewed();
    setRecentIds(ids);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecentlyViewed();
    setTimeout(() => setRefreshing(false), 600);
  }, []);

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

  const sortedFiltered = useMemo(() => {
    const list = [...filtered];
    switch (sortMode) {
      case 'newest':
        return list.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      case 'oldest':
        return list.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
      case 'az':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      case 'za':
        return list.sort((a, b) => b.name.localeCompare(a.name, 'ar'));
      case 'price_asc':
        return list.sort((a, b) => a.sellingPriceSYP - b.sellingPriceSYP);
      case 'price_desc':
        return list.sort((a, b) => b.sellingPriceSYP - a.sellingPriceSYP);
      default:
        return list;
    }
  }, [filtered, sortMode]);

  const recentProducts = useMemo(() => {
    return recentIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as Product[];
  }, [recentIds, products]);

  const listKey = `${activeCategoryId ?? 'all'}-${query}-${barcodeQuery}-${animKey}-${gridView ? 'grid' : 'list'}-${sortMode}`;

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

  function handleSortSelect(key: SortMode) {
    setSortMode(key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortModal(false);
  }

  function toggleGrid() {
    setGridView((v) => !v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleProductPress(product: Product) {
    addToRecentlyViewed(product.id).then(() => loadRecentlyViewed());
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }

  function handleProductLongPress(product: Product) {
    setPreviewProduct(product);
    setShowPreview(true);
  }

  function handleDeleteWithUndo(product: Product) {
    deleteProduct(product.id);
    showToast({
      message: `تم حذف "${product.name}"`,
      type: 'info',
      duration: 4500,
      actionLabel: 'تراجع',
      onAction: () => restoreProduct(product),
    });
  }

  const speedDialActions: SpeedDialAction[] = [
    {
      icon: 'calculator-outline',
      label: 'الحاسبة',
      color: '#1B3A70',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/calculator');
      },
    },
    {
      icon: 'scan-outline',
      label: 'الباركود',
      color: '#6C5CE7',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/scanner');
      },
    },
    {
      icon: 'add-circle-outline',
      label: 'منتج جديد',
      color: '#22C55E',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/product/add');
      },
    },
  ];

  const activeCategory = activeCategoryId && activeCategoryId !== NO_CATEGORY_ID
    ? getCategoryById(activeCategoryId)
    : null;
  const noCatCount = countByCategory[NO_CATEGORY_ID] || 0;

  const showRecentlyViewed = recentProducts.length > 0 && !query && !barcodeQuery;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
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
            <Text style={[styles.headerCount, { color: colors.silver }]}>{sortedFiltered.length}/{products.length}</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleGrid}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: gridView ? colors.primary + '18' : colors.secondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name={gridView ? 'grid' : 'list'} size={18} color={gridView ? colors.primary : colors.silver} />
            </Pressable>
            <Pressable
              onPress={() => setShowSortModal(true)}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: sortMode !== 'newest' ? colors.primary + '18' : colors.secondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="funnel-outline" size={18} color={sortMode !== 'newest' ? colors.primary : colors.silver} />
            </Pressable>
            <Pressable
              onPress={toggleBarcodeSearch}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: showBarcodeSearch ? colors.primary : colors.secondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="barcode-outline" size={20} color={showBarcodeSearch ? colors.primaryForeground : colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Barcode search */}
        {showBarcodeSearch && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.barcodeSearchRow}>
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
      </View>

      {/* Content */}
      {isLoading ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
          <SkeletonList count={6} grid={gridView} />
        </Animated.View>
      ) : sortedFiltered.length === 0 && !showRecentlyViewed ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
            {activeCategory ? (
              <Ionicons name={activeCategory.icon as any} size={40} color={activeCategory.color} />
            ) : activeCategoryId === NO_CATEGORY_ID ? (
              <Ionicons name="apps-outline" size={40} color={colors.silver} />
            ) : query || barcodeQuery ? (
              <Ionicons name="search-outline" size={40} color={colors.silver} />
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
            {query || barcodeQuery ? 'جرّب كلمة بحث مختلفة' : 'أضف منتجاً من زر + في الأسفل'}
          </Text>
        </Animated.View>
      ) : (
        <FlatList<Product>
          key={listKey}
          data={sortedFiltered}
          keyExtractor={(item) => item.id}
          numColumns={gridView ? 2 : 1}
          columnWrapperStyle={gridView ? { gap: 8 } : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            showRecentlyViewed ? (
              <Animated.View entering={FadeIn.duration(250)} style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Ionicons name="time-outline" size={14} color={colors.silver} />
                  <Text style={[styles.recentTitle, { color: colors.mutedForeground }]}>شاهدته مؤخراً</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
                  {recentProducts.map((p) => {
                    const cat = getCategoryById(p.categoryId);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => handleProductPress(p)}
                        style={({ pressed }) => [
                          styles.recentCard,
                          { backgroundColor: colors.card, borderColor: cat?.color || colors.border, opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <View style={[styles.recentDot, { backgroundColor: cat?.color || colors.border }]} />
                        <Text style={[styles.recentName, { color: colors.foreground }]} numberOfLines={2}>
                          {p.name}
                        </Text>
                        <Text style={[styles.recentPrice, { color: '#22C55E' }]} numberOfLines={1}>
                          {new Intl.NumberFormat('ar-SY').format(p.sellingPriceSYP)} ل.س.ق
                        </Text>
                        <Text style={[styles.recentPriceNew, { color: '#16A34A' }]} numberOfLines={1}>
                          {new Intl.NumberFormat('ar-SY').format(Math.floor(p.sellingPriceSYP / 100))} ل.س
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={[styles.recentDivider, { backgroundColor: colors.border }]} />
              </Animated.View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeIn.delay(index * 18).duration(220)}
              layout={LinearTransition.duration(200)}
              style={gridView ? styles.gridItem : undefined}
            >
              <ProductCard
                product={item}
                index={index}
                grid={gridView}
                customerViewMode={customerViewMode}
                onPress={() => handleProductPress(item)}
                onLongPress={() => handleProductLongPress(item)}
              />
            </Animated.View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 100 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={gridView ? undefined : () => <View style={{ height: 2 }} />}
        />
      )}

      {/* Speed Dial FAB */}
      <SpeedDial
        actions={speedDialActions}
        bottom={bottomInset + 24}
        right={20}
      />

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={styles.sortOverlay} onPress={() => setShowSortModal(false)}>
          <View style={[styles.sortSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => {}}>
              <View style={[styles.sortHandle, { backgroundColor: colors.border }]} />
              <View style={styles.sortHeader}>
                <Ionicons name="funnel-outline" size={16} color={colors.primary} />
                <Text style={[styles.sortTitle, { color: colors.foreground }]}>ترتيب المنتجات</Text>
              </View>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.sortOption,
                    { borderBottomColor: colors.border },
                    sortMode === opt.key && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleSortSelect(opt.key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.sortOptionLeft}>
                    {sortMode === opt.key ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : (
                      <View style={[styles.sortOptionDot, { borderColor: colors.border }]} />
                    )}
                  </View>
                  <Text style={[styles.sortOptionText, { color: sortMode === opt.key ? colors.primary : colors.foreground }]}>
                    {opt.label}
                  </Text>
                  <Ionicons name={opt.icon as any} size={16} color={sortMode === opt.key ? colors.primary : colors.silver} />
                </TouchableOpacity>
              ))}
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Product Preview Bottom Sheet */}
      <ProductPreviewSheet
        product={previewProduct}
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        customerViewMode={customerViewMode}
      />
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
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  headerTitle: { fontSize: 19, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  headerCount: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
  list: { paddingTop: 8, paddingHorizontal: 12, gap: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 20 },
  gridItem: { flex: 1 },
  sortOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sortSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingBottom: 40 },
  sortHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sortHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 12 },
  sortTitle: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 12 },
  sortOptionLeft: { width: 24, alignItems: 'center' },
  sortOptionDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  sortOptionText: { flex: 1, fontSize: 15, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  recentSection: { marginBottom: 8 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', paddingHorizontal: 4, paddingVertical: 4 },
  recentTitle: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  recentList: { gap: 8, paddingVertical: 4 },
  recentCard: {
    width: 110,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    gap: 4,
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  recentName: { fontSize: 12, fontFamily: 'Tajawal_700Bold', textAlign: 'right', lineHeight: 17 },
  recentPrice: { fontSize: 11, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  recentPriceNew: { fontSize: 10, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  recentDivider: { height: 1, marginTop: 10 },
});
