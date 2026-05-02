import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';
import { useInvoice, InvoiceItem } from '@/utils/invoiceStore';
import { searchProducts } from '@/utils/fuzzySearch';
import { formatPrice } from '@/utils/dateFormatter';

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const { items, updateQty, removeItem, clear, totalSYP, totalUSD } = useInvoice();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { addItem } = useInvoice();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchProducts(searchQuery, products).slice(0, 20);
  }, [searchQuery, products]);

  function handleAddFromSearch(product: typeof products[0]) {
    addItem({
      productId: product.id,
      name: product.name,
      sellingPriceSYP: product.sellingPriceSYP,
      sellingPriceUSD: product.sellingPriceUSD,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
  }

  function handleQtyChange(productId: string, delta: number) {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQty(productId, item.qty + delta);
  }

  function handleClear() {
    clear();
    setShowClearConfirm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الآلة الحاسبة</Text>
          <Text style={[styles.headerSub, { color: colors.silver }]}>
            {items.length > 0 ? `${items.length} منتج` : 'فاتورة فارغة'}
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.destructive + '15' }]}
            onPress={() => setShowClearConfirm(true)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </TouchableOpacity>
        )}
        {items.length === 0 && <View style={{ width: 38 }} />}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/scanner?mode=calculator');
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="scan-outline" size={20} color={colors.primaryForeground} />
          <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>مسح باركود</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: showSearch ? colors.secondary : colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => {
            setShowSearch((v) => !v);
            setSearchQuery('');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="search-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>بحث بالاسم</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      {showSearch && (
        <Animated.View
          entering={FadeInDown.duration(200).springify()}
          style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        >
          <View style={[styles.searchRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.silver} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="ابحث عن منتج للإضافة..."
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.silver} />
              </Pressable>
            )}
          </View>

          {searchResults.length > 0 && (
            <ScrollView
              style={styles.searchResults}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchResults.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleAddFromSearch(p)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchResultLeft}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultName, { color: colors.foreground }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[styles.searchResultPrice, { color: colors.primary }]}>
                      {formatPrice(p.sellingPriceSYP, 'SYP')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                لا توجد منتجات مطابقة
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="calculator-outline" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد منتجات</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            امسح باركود أو ابحث عن منتج لإضافته للفاتورة
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.productId}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 180 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 30).duration(250).springify()}>
              <InvoiceRow
                item={item}
                colors={colors}
                onIncrease={() => handleQtyChange(item.productId, 1)}
                onDecrease={() => handleQtyChange(item.productId, -1)}
                onRemove={() => { removeItem(item.productId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              />
            </Animated.View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        />
      )}

      {/* Total Footer */}
      {items.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={[styles.totalFooter, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomInset + 12 }]}
        >
          <View style={styles.totalRow}>
            <View style={styles.totalAmounts}>
              <Text style={[styles.totalUSD, { color: colors.silver }]}>
                {formatPrice(totalUSD, 'USD')}
              </Text>
              <Text style={[styles.totalSYP, { color: colors.primary }]}>
                {formatPrice(totalSYP, 'SYP')}
              </Text>
            </View>
            <View style={styles.totalLabelWrap}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>المجموع الكلي</Text>
              <View style={[styles.totalCountBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.totalCount, { color: colors.primary }]}>
                  {items.reduce((s, i) => s + i.qty, 0)} قطعة
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Clear Confirm Modal */}
      <Modal visible={showClearConfirm} transparent animationType="fade" onRequestClose={() => setShowClearConfirm(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowClearConfirm(false)}>
          <Animated.View
            entering={FadeInDown.duration(250).springify()}
            style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Pressable onPress={() => {}}>
              <View style={[styles.modalIcon, { backgroundColor: colors.destructive + '15' }]}>
                <Ionicons name="trash-outline" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>مسح الفاتورة</Text>
              <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                هل تريد حذف جميع العناصر من الفاتورة الحالية؟
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => setShowClearConfirm(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
                  onPress={handleClear}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>مسح الكل</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function InvoiceRow({ item, colors, onIncrease, onDecrease, onRemove }: {
  item: InvoiceItem;
  colors: any;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const subtotal = item.sellingPriceSYP * item.qty;

  return (
    <View style={[styles.invoiceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.removeBtn, { backgroundColor: colors.destructive + '12' }]}
        onPress={onRemove}
      >
        <Ionicons name="close" size={14} color={colors.destructive} />
      </TouchableOpacity>

      <View style={styles.rowCenter}>
        <Text style={[styles.rowSubtotal, { color: colors.primary }]}>
          {formatPrice(subtotal, 'SYP')}
        </Text>
        <Text style={[styles.rowPrice, { color: colors.mutedForeground }]}>
          {formatPrice(item.sellingPriceSYP, 'SYP')} × {item.qty}
        </Text>
      </View>

      <View style={styles.qtyControl}>
        <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.secondary }]} onPress={onIncrease}>
          <Ionicons name="add" size={16} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.qty}</Text>
        <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.secondary }]} onPress={onDecrease}>
          <Ionicons name={item.qty === 1 ? 'trash-outline' : 'remove'} size={16} color={item.qty === 1 ? colors.destructive : colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.rowNameWrap}>
        <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
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
  headerBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  headerSub: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  actionBtnText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  searchContainer: {
    borderBottomWidth: 1,
    padding: 12,
    gap: 6,
    maxHeight: 320,
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
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Tajawal_400Regular', height: 44 },
  searchResults: { maxHeight: 200 },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchResultLeft: { width: 32, alignItems: 'center' },
  searchResultInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  searchResultName: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  searchResultPrice: { fontSize: 12, fontFamily: 'Tajawal_400Regular' },
  noResults: { paddingVertical: 12, alignItems: 'center' },
  noResultsText: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  emptyIcon: { width: 90, height: 90, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22 },
  listContent: { paddingTop: 8, paddingHorizontal: 12 },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  removeBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowCenter: { alignItems: 'center', gap: 2, minWidth: 90 },
  rowSubtotal: { fontSize: 15, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  rowPrice: { fontSize: 10, fontFamily: 'Tajawal_400Regular', textAlign: 'center' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontFamily: 'Tajawal_700Bold', minWidth: 22, textAlign: 'center' },
  rowNameWrap: { flex: 1, alignItems: 'flex-end' },
  rowName: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right', lineHeight: 20 },
  totalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabelWrap: { alignItems: 'flex-end', gap: 6 },
  totalLabel: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  totalCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  totalCount: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  totalAmounts: { alignItems: 'flex-start', gap: 2 },
  totalSYP: { fontSize: 26, fontFamily: 'Tajawal_700Bold' },
  totalUSD: { fontSize: 14, fontFamily: 'Tajawal_400Regular' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 24 },
  modalIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 8 },
  modalMsg: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
});
