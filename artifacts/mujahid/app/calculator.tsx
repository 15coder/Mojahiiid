import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
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
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useColors } from '@/hooks/useColors';
import { useInvoiceStore, SavedInvoice, InvoiceItem } from '@/utils/invoiceStore';
import { searchProducts } from '@/utils/fuzzySearch';
import { formatPrice, formatArabicDateShort } from '@/utils/dateFormatter';

type ExitAction = 'save' | 'discard' | null;

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const store = useInvoiceStore();
  const {
    activeItems, savedInvoices, activeNumber,
    totalSYP, totalUSD,
    addItem, updateQty, removeItem, saveActive, discardActive, deleteSaved,
  } = store;

  const [activeTab, setActiveTab] = useState<'invoice' | 'history'>('invoice');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchProducts(searchQuery, products).slice(0, 20);
  }, [searchQuery, products]);

  const hasItems = activeItems.length > 0;

  // ── Android back handler ────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasItems) {
        setShowExitModal(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasItems]);

  function handleBack() {
    if (hasItems) {
      setShowExitModal(true);
    } else {
      router.back();
    }
  }

  function handleExitSave() {
    saveActive();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowExitModal(false);
    router.back();
  }

  function handleExitDiscard() {
    discardActive();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowExitModal(false);
    router.back();
  }

  function handleSaveInvoice() {
    if (activeItems.length === 0) return;
    saveActive();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveTab('history');
  }

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
    const item = activeItems.find((i) => i.productId === productId);
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQty(productId, item.qty + delta);
  }

  function handleClear() {
    discardActive();
    setShowClearConfirm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  function handleDeleteSaved() {
    if (!deletingInvoiceId) return;
    deleteSaved(deletingInvoiceId);
    setDeletingInvoiceId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  function toggleInvoiceExpand(id: string) {
    setExpandedInvoices((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalItems = activeItems.reduce((s, i) => s + i.qty, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.secondary }]}
          onPress={handleBack}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>حاسبة الفواتير</Text>
          <Text style={[styles.headerSub, { color: colors.silver }]}>
            {hasItems ? `فاتورة ${activeNumber} — ${activeItems.length} منتج` : `فاتورة ${activeNumber}`}
          </Text>
        </View>

        {hasItems ? (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.destructive + '15' }]}
            onPress={() => setShowClearConfirm(true)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoice' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('invoice')}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeTab === 'invoice' ? colors.primary : colors.silver}
          />
          <Text style={[styles.tabText, { color: activeTab === 'invoice' ? colors.primary : colors.silver }]}>
            الفاتورة الحالية
          </Text>
          {hasItems && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.tabBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? colors.primary : colors.silver}
          />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.primary : colors.silver }]}>
            السجلات
          </Text>
          {savedInvoices.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.silver }]}>
              <Text style={styles.tabBadgeText}>{savedInvoices.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── ACTIVE INVOICE TAB ───────────────────────────────────── */}
      {activeTab === 'invoice' && (
        <>
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
              style={[
                styles.actionBtn,
                { backgroundColor: showSearch ? colors.primary + '18' : colors.secondary, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => {
                setShowSearch((v) => !v);
                setSearchQuery('');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name={showSearch ? 'close-outline' : 'search-outline'} size={20} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                {showSearch ? 'إغلاق البحث' : 'بحث بالاسم'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
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
                <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                  <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>لا توجد منتجات مطابقة</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Items */}
          {!hasItems ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="receipt-outline" size={44} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>فاتورة {activeNumber} فارغة</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                امسح باركود أو ابحث عن منتج لإضافته
              </Text>
            </Animated.View>
          ) : (
            <FlatList
              data={activeItems}
              keyExtractor={(item) => item.productId}
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 160 }]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInUp.delay(index * 25).duration(200).springify()}>
                  <InvoiceRow
                    item={item}
                    colors={colors}
                    onIncrease={() => handleQtyChange(item.productId, 1)}
                    onDecrease={() => handleQtyChange(item.productId, -1)}
                    onRemove={() => {
                      removeItem(item.productId);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                </Animated.View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            />
          )}

          {/* Total Footer */}
          {hasItems && (
            <Animated.View
              entering={FadeInDown.duration(300).springify()}
              style={[
                styles.totalFooter,
                { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomInset + 12 },
              ]}
            >
              <View style={styles.totalRow}>
                <View style={styles.totalAmounts}>
                  <Text style={[styles.totalSYP, { color: colors.primary }]}>{formatPrice(totalSYP, 'SYP')}</Text>
                  <Text style={[styles.totalUSD, { color: colors.silver }]}>{formatPrice(totalUSD, 'USD')}</Text>
                </View>
                <View style={styles.totalRight}>
                  <View style={[styles.totalCountBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.totalCount, { color: colors.primary }]}>{totalItems} قطعة</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveInvoice}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="save-outline" size={18} color={colors.primaryForeground} />
                    <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>حفظ الفاتورة</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {savedInvoices.length === 0 ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="time-outline" size={44} color={colors.silver} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد فواتير محفوظة</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                احفظ الفاتورة الحالية لتظهر هنا
              </Text>
            </Animated.View>
          ) : (
            <FlatList
              data={savedInvoices}
              keyExtractor={(inv) => inv.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 20 }]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: inv, index }) => {
                const isExpanded = expandedInvoices.has(inv.id);
                return (
                  <Animated.View entering={FadeInDown.delay(index * 30).duration(200).springify()}>
                    <View style={[styles.savedInvoiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {/* Invoice header row */}
                      <TouchableOpacity
                        style={styles.savedInvoiceHeader}
                        onPress={() => toggleInvoiceExpand(inv.id)}
                        activeOpacity={0.8}
                      >
                        <TouchableOpacity
                          style={[styles.deleteInvBtn, { backgroundColor: colors.destructive + '15' }]}
                          onPress={() => setDeletingInvoiceId(inv.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                        </TouchableOpacity>

                        <View style={styles.savedInvoiceInfo}>
                          <Text style={[styles.savedInvoiceTotal, { color: colors.primary }]}>
                            {formatPrice(inv.totalSYP, 'SYP')}
                          </Text>
                          <Text style={[styles.savedInvoiceDate, { color: colors.mutedForeground }]}>
                            {formatArabicDateShort(inv.createdAt)} — {inv.items.length} منتج
                          </Text>
                        </View>

                        <View style={[styles.invNumberBadge, { backgroundColor: colors.primary + '18' }]}>
                          <Text style={[styles.invNumberText, { color: colors.primary }]}>
                            فاتورة {inv.number}
                          </Text>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.silver}
                        />
                      </TouchableOpacity>

                      {/* Expanded items */}
                      {isExpanded && (
                        <Animated.View entering={FadeInDown.duration(200)} style={[styles.savedInvoiceItems, { borderTopColor: colors.border }]}>
                          {inv.items.map((item) => (
                            <View key={item.productId} style={[styles.savedItemRow, { borderBottomColor: colors.border }]}>
                              <Text style={[styles.savedItemSubtotal, { color: colors.primary }]}>
                                {formatPrice(item.sellingPriceSYP * item.qty, 'SYP')}
                              </Text>
                              <Text style={[styles.savedItemQty, { color: colors.mutedForeground }]}>
                                ×{item.qty}
                              </Text>
                              <Text style={[styles.savedItemName, { color: colors.foreground }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                            </View>
                          ))}
                          <View style={[styles.savedInvoiceTotalsRow, { borderTopColor: colors.border }]}>
                            <Text style={[styles.savedInvTotalUSD, { color: colors.silver }]}>
                              {formatPrice(inv.totalUSD, 'USD')}
                            </Text>
                            <Text style={[styles.savedInvTotalSYP, { color: colors.primary }]}>
                              المجموع: {formatPrice(inv.totalSYP, 'SYP')}
                            </Text>
                          </View>
                        </Animated.View>
                      )}
                    </View>
                  </Animated.View>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
        </View>
      )}

      {/* ── EXIT CONFIRMATION MODAL ──────────────────────────────── */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowExitModal(false)}>
          <Animated.View
            entering={FadeInDown.duration(250).springify()}
            style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Pressable onPress={() => {}}>
              <View style={[styles.modalIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="save-outline" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>حفظ الفاتورة؟</Text>
              <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                لديك {activeItems.length} منتج في فاتورة {activeNumber}{'\n'}هل تريد حفظها قبل الخروج؟
              </Text>
              <TouchableOpacity
                style={[styles.modalBtnFull, { backgroundColor: colors.primary, marginBottom: 8 }]}
                onPress={handleExitSave}
              >
                <Ionicons name="save-outline" size={18} color={colors.primaryForeground} />
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>حفظ والخروج</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnFull, { backgroundColor: colors.destructive + '15', marginBottom: 8 }]}
                onPress={handleExitDiscard}
              >
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                <Text style={[styles.modalBtnText, { color: colors.destructive }]}>تجاهل والخروج</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnFull, { backgroundColor: colors.secondary }]}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>تراجع</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── CLEAR CONFIRM MODAL ──────────────────────────────────── */}
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>مسح الفاتورة الحالية</Text>
              <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                سيتم حذف جميع المنتجات من فاتورة {activeNumber}
              </Text>
              <View style={styles.modalBtnRow}>
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

      {/* ── DELETE SAVED INVOICE MODAL ───────────────────────────── */}
      <Modal visible={!!deletingInvoiceId} transparent animationType="fade" onRequestClose={() => setDeletingInvoiceId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeletingInvoiceId(null)}>
          <Animated.View
            entering={FadeInDown.duration(250).springify()}
            style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Pressable onPress={() => {}}>
              <View style={[styles.modalIcon, { backgroundColor: colors.destructive + '15' }]}>
                <Ionicons name="trash-outline" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>حذف الفاتورة</Text>
              <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                هل تريد حذف هذه الفاتورة من السجل نهائياً؟
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => setDeletingInvoiceId(null)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
                  onPress={handleDeleteSaved}
                >
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

function InvoiceRow({
  item, colors, onIncrease, onDecrease, onRemove,
}: {
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
        <Text style={[styles.rowSubtotal, { color: colors.primary }]}>{formatPrice(subtotal, 'SYP')}</Text>
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
          <Ionicons
            name={item.qty === 1 ? 'trash-outline' : 'remove'}
            size={16}
            color={item.qty === 1 ? colors.destructive : colors.primary}
          />
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
  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Tajawal_700Bold' },
  // Action buttons
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
  // Search
  searchContainer: { borderBottomWidth: 1, padding: 12, gap: 6, maxHeight: 320 },
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
  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  emptyIcon: { width: 90, height: 90, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22 },
  // Items list
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
  // Total footer
  totalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 16,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalAmounts: { alignItems: 'flex-start', gap: 2 },
  totalSYP: { fontSize: 22, fontFamily: 'Tajawal_700Bold' },
  totalUSD: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  totalRight: { alignItems: 'flex-end', gap: 8 },
  totalCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  totalCount: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  saveBtnText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  // Saved invoices (history tab)
  savedInvoiceCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  savedInvoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  deleteInvBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  savedInvoiceInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  savedInvoiceTotal: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  savedInvoiceDate: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  invNumberBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  invNumberText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  savedInvoiceItems: { borderTopWidth: 1, paddingHorizontal: 14, paddingBottom: 8, paddingTop: 4 },
  savedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  savedItemSubtotal: { fontSize: 13, fontFamily: 'Tajawal_700Bold', minWidth: 80, textAlign: 'left' },
  savedItemQty: { fontSize: 12, fontFamily: 'Tajawal_400Regular', minWidth: 28, textAlign: 'center' },
  savedItemName: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  savedInvoiceTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
  },
  savedInvTotalSYP: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  savedInvTotalUSD: { fontSize: 12, fontFamily: 'Tajawal_400Regular' },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 24 },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 8 },
  modalMsg: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBtnFull: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
});
