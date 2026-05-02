import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import { InvoiceItem, SavedInvoice, StatsPeriod, useInvoiceStore } from '@/utils/invoiceStore';
import { formatArabicDateShort, formatPrice } from '@/utils/dateFormatter';

type TabId = 'invoice' | 'history' | 'stats';
type DiscountType = 'pct' | 'fixed';

const BRANDING_TEXT = '🏪 مصدرة عن تطبيق "مجاهد للتجارة"\n💻 برمجة وتطوير: نداء الرحمن عبّود';

function buildShareText(inv: SavedInvoice): string {
  const lines: string[] = [];
  lines.push(`🧾 فاتورة رقم ${inv.number}`);
  if (inv.note) lines.push(`👤 ${inv.note}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  inv.items.forEach((item) => {
    const sub = item.sellingPriceSYP * item.qty;
    lines.push(`• ${item.name} × ${item.qty} = ${formatPrice(sub, 'SYP')}`);
  });
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  if ((inv.discountPct && inv.discountPct > 0) || (inv.discountFixed && inv.discountFixed > 0)) {
    lines.push(`المجموع الجزئي: ${formatPrice(inv.totalSYP, 'SYP')}`);
    if (inv.discountPct) lines.push(`🏷️ خصم ${inv.discountPct}%: -${formatPrice(inv.totalSYP - (inv.finalTotalSYP ?? inv.totalSYP), 'SYP')}`);
    if (inv.discountFixed) lines.push(`🏷️ خصم ثابت: -${formatPrice(inv.discountFixed, 'SYP')}`);
    lines.push(`💰 الإجمالي بعد الخصم: ${formatPrice(inv.finalTotalSYP ?? inv.totalSYP, 'SYP')}`);
  } else {
    lines.push(`💰 المجموع: ${formatPrice(inv.totalSYP, 'SYP')}`);
  }
  lines.push(`📅 ${formatArabicDateShort(inv.createdAt)}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(BRANDING_TEXT);
  return lines.join('\n');
}

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const {
    activeItems,
    activeNote,
    activeDiscountPct,
    activeDiscountFixed,
    savedInvoices,
    activeNumber,
    totalSYP,
    totalUSD,
    finalTotalSYP,
    finalTotalUSD,
    addItem,
    updateQty,
    removeItem,
    setNote,
    setDiscount,
    saveActive,
    discardActive,
    deleteSaved,
    duplicateInvoice,
    getStats,
  } = useInvoiceStore();

  const [activeTab, setActiveTab] = useState<TabId>('invoice');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>('pct');
  const [discountInput, setDiscountInput] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('today');
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [showExitModal, setShowExitModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const hasItems = activeItems.length > 0;
  const hasDiscount = (activeDiscountPct > 0 || activeDiscountFixed > 0);
  const discountAmountSYP = totalSYP - finalTotalSYP;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q))
      .slice(0, 8);
  }, [searchQuery, products]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return savedInvoices;
    const q = historySearch.trim();
    return savedInvoices.filter(
      (inv) =>
        String(inv.number).includes(q) ||
        (inv.note && inv.note.includes(q))
    );
  }, [savedInvoices, historySearch]);

  const stats = useMemo(() => getStats(statsPeriod), [savedInvoices, statsPeriod]);

  function handleBack() {
    if (hasItems) {
      setShowExitModal(true);
    } else {
      router.back();
    }
  }

  function handleExitSave() {
    saveActive();
    setShowExitModal(false);
    router.back();
  }

  function handleExitDiscard() {
    discardActive();
    setShowExitModal(false);
    router.back();
  }

  function handleSaveInvoice() {
    const inv = saveActive();
    if (inv) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDiscount(false);
      setDiscountInput('');
      setShowNoteInput(false);
    }
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
    setDiscount(0, 0);
    setDiscountInput('');
    setShowDiscount(false);
    setShowNoteInput(false);
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

  function handleDuplicateInvoice(id: string) {
    duplicateInvoice(id);
    setActiveTab('invoice');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDiscount(false);
    setDiscountInput('');
  }

  async function handleShareInvoice(inv: SavedInvoice) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: buildShareText(inv) });
    } catch {}
  }

  function handleDiscountInputChange(val: string) {
    setDiscountInput(val);
    const n = parseFloat(val) || 0;
    if (discountType === 'pct') {
      setDiscount(Math.min(100, n), 0);
    } else {
      setDiscount(0, n);
    }
  }

  function handleDiscountTypeChange(type: DiscountType) {
    setDiscountType(type);
    setDiscountInput('');
    setDiscount(0, 0);
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
        {([
          { id: 'invoice' as TabId, label: 'الفاتورة', icon: 'receipt-outline', badge: hasItems ? totalItems : null },
          { id: 'history' as TabId, label: 'السجلات', icon: 'time-outline', badge: savedInvoices.length > 0 ? savedInvoices.length : null },
          { id: 'stats' as TabId, label: 'إحصائيات', icon: 'bar-chart-outline', badge: null },
        ] as const).map(({ id, label, icon, badge }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, activeTab === id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(id)}
          >
            <Ionicons name={icon} size={15} color={activeTab === id ? colors.primary : colors.silver} />
            <Text style={[styles.tabText, { color: activeTab === id ? colors.primary : colors.silver }]}>{label}</Text>
            {badge !== null && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === id ? colors.primary : colors.silver }]}>
                <Text style={styles.tabBadgeText}>{badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ACTIVE INVOICE TAB ─────────────────────────── */}
      {activeTab === 'invoice' && (
        <>
          {/* Action Row */}
          <View style={[styles.actionRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1.2 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/scanner?mode=calculator'); }}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>مسح</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: showSearch ? colors.primary + '18' : colors.secondary, borderColor: colors.border, borderWidth: 1, flex: 1.2 }]}
              onPress={() => { setShowSearch((v) => !v); setSearchQuery(''); }}
              activeOpacity={0.85}
            >
              <Ionicons name={showSearch ? 'close-outline' : 'search-outline'} size={18} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>{showSearch ? 'إغلاق' : 'بحث'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnSquare, { backgroundColor: showNoteInput ? colors.primary + '18' : colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => setShowNoteInput((v) => !v)}
              activeOpacity={0.85}
            >
              <Ionicons name={activeNote ? 'person' : 'person-outline'} size={18} color={activeNote ? colors.primary : colors.silver} />
            </TouchableOpacity>
          </View>

          {/* Note Input */}
          {showNoteInput && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={[styles.noteRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            >
              <Ionicons name="person-outline" size={16} color={colors.silver} />
              <TextInput
                style={[styles.noteInput, { color: colors.foreground }]}
                value={activeNote}
                onChangeText={setNote}
                placeholder="اسم الزبون أو ملاحظة..."
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
              {activeNote.length > 0 && (
                <Pressable onPress={() => setNote('')}>
                  <Ionicons name="close-circle" size={16} color={colors.silver} />
                </Pressable>
              )}
            </Animated.View>
          )}

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
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      <View style={styles.searchResultInfo}>
                        <Text style={[styles.searchResultName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[styles.searchResultPrice, { color: colors.primary }]}>{formatPrice(p.sellingPriceSYP, 'SYP')}</Text>
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
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>امسح باركود أو ابحث عن منتج</Text>
            </Animated.View>
          ) : (
            <FlatList
              data={activeItems}
              keyExtractor={(item) => item.productId}
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 220 }]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInUp.delay(index * 25).duration(200).springify()}>
                  <InvoiceRow
                    item={item}
                    colors={colors}
                    onIncrease={() => handleQtyChange(item.productId, 1)}
                    onDecrease={() => handleQtyChange(item.productId, -1)}
                    onRemove={() => { removeItem(item.productId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
              style={[styles.totalFooter, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomInset + 12 }]}
            >
              {/* Discount toggle */}
              <TouchableOpacity
                style={[styles.discountToggle, { borderColor: colors.border }]}
                onPress={() => { setShowDiscount((v) => !v); if (showDiscount) { setDiscount(0, 0); setDiscountInput(''); } }}
              >
                <Ionicons
                  name={showDiscount ? 'close-circle-outline' : 'pricetag-outline'}
                  size={15}
                  color={showDiscount ? colors.destructive : colors.primary}
                />
                <Text style={[styles.discountToggleText, { color: showDiscount ? colors.destructive : colors.primary }]}>
                  {showDiscount ? 'إلغاء الخصم' : 'إضافة خصم'}
                </Text>
              </TouchableOpacity>

              {/* Discount input */}
              {showDiscount && (
                <Animated.View entering={FadeInDown.duration(180)} style={[styles.discountRow, { borderColor: colors.border }]}>
                  <View style={[styles.discountTypeToggle, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
                    <TouchableOpacity
                      style={[styles.discountTypePill, discountType === 'pct' && { backgroundColor: colors.primary }]}
                      onPress={() => handleDiscountTypeChange('pct')}
                    >
                      <Text style={[styles.discountTypePillText, { color: discountType === 'pct' ? colors.primaryForeground : colors.foreground }]}>%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.discountTypePill, discountType === 'fixed' && { backgroundColor: colors.primary }]}
                      onPress={() => handleDiscountTypeChange('fixed')}
                    >
                      <Text style={[styles.discountTypePillText, { color: discountType === 'fixed' ? colors.primaryForeground : colors.foreground }]}>ل.س</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.discountInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                    value={discountInput}
                    onChangeText={handleDiscountInputChange}
                    placeholder={discountType === 'pct' ? '0%' : '0 ل.س'}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </Animated.View>
              )}

              {/* Totals */}
              <View style={styles.totalRow}>
                <View style={styles.totalAmounts}>
                  {hasDiscount && (
                    <Text style={[styles.subtotalLine, { color: colors.mutedForeground }]}>
                      الجزئي: <Text style={{ textDecorationLine: 'line-through' }}>{formatPrice(totalSYP, 'SYP')}</Text>
                    </Text>
                  )}
                  {hasDiscount && (
                    <Text style={[styles.discountLine, { color: colors.destructive }]}>
                      الخصم: -{formatPrice(discountAmountSYP, 'SYP')}
                    </Text>
                  )}
                  <Text style={[styles.totalSYP, { color: colors.primary }]}>{formatPrice(finalTotalSYP, 'SYP')}</Text>
                  <Text style={[styles.totalUSD, { color: colors.silver }]}>{formatPrice(finalTotalUSD, 'USD')}</Text>
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
                    <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>حفظ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {/* History search */}
          <View style={[styles.histSearchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.histSearchRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={16} color={colors.silver} />
              <TextInput
                style={[styles.histSearchInput, { color: colors.foreground }]}
                value={historySearch}
                onChangeText={setHistorySearch}
                placeholder="ابحث برقم الفاتورة أو اسم الزبون..."
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
              {historySearch.length > 0 && (
                <Pressable onPress={() => setHistorySearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.silver} />
                </Pressable>
              )}
            </View>
          </View>

          {filteredHistory.length === 0 ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="time-outline" size={44} color={colors.silver} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {historySearch ? 'لا توجد نتائج' : 'لا توجد فواتير محفوظة'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {historySearch ? 'جرب كلمة أخرى' : 'احفظ الفاتورة الحالية لتظهر هنا'}
              </Text>
            </Animated.View>
          ) : (
            <FlatList
              data={filteredHistory}
              keyExtractor={(inv) => inv.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 20 }]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: inv, index }) => {
                const isExpanded = expandedInvoices.has(inv.id);
                const displayTotal = inv.finalTotalSYP ?? inv.totalSYP;
                return (
                  <Animated.View entering={FadeInDown.delay(index * 30).duration(200).springify()}>
                    <View style={[styles.savedInvoiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <TouchableOpacity
                        style={styles.savedInvoiceHeader}
                        onPress={() => toggleInvoiceExpand(inv.id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.invNumberBadge, { backgroundColor: colors.primary + '18' }]}>
                          <Text style={[styles.invNumberText, { color: colors.primary }]}>#{inv.number}</Text>
                        </View>

                        <View style={styles.savedInvoiceInfo}>
                          {inv.note ? (
                            <Text style={[styles.savedInvoiceNote, { color: colors.foreground }]} numberOfLines={1}>
                              {inv.note}
                            </Text>
                          ) : null}
                          <Text style={[styles.savedInvoiceTotal, { color: colors.primary }]}>
                            {formatPrice(displayTotal, 'SYP')}
                          </Text>
                          <Text style={[styles.savedInvoiceDate, { color: colors.mutedForeground }]}>
                            {formatArabicDateShort(inv.createdAt)} — {inv.items.length} منتج
                          </Text>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.silver}
                        />
                      </TouchableOpacity>

                      {/* Expanded */}
                      {isExpanded && (
                        <Animated.View entering={FadeInDown.duration(200)} style={[styles.savedInvoiceItems, { borderTopColor: colors.border }]}>
                          {inv.items.map((item) => (
                            <View key={item.productId} style={[styles.savedItemRow, { borderBottomColor: colors.border }]}>
                              <Text style={[styles.savedItemSubtotal, { color: colors.primary }]}>
                                {formatPrice(item.sellingPriceSYP * item.qty, 'SYP')}
                              </Text>
                              <Text style={[styles.savedItemQty, { color: colors.mutedForeground }]}>×{item.qty}</Text>
                              <Text style={[styles.savedItemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                            </View>
                          ))}
                          {((inv.discountPct && inv.discountPct > 0) || (inv.discountFixed && inv.discountFixed > 0)) && (
                            <View style={[styles.discountSummaryRow, { borderTopColor: colors.border }]}>
                              <Text style={[styles.discountSummaryText, { color: colors.destructive }]}>
                                خصم: -{formatPrice(inv.totalSYP - (inv.finalTotalSYP ?? inv.totalSYP), 'SYP')}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.savedInvoiceTotalsRow, { borderTopColor: colors.border }]}>
                            <Text style={[styles.savedInvTotalUSD, { color: colors.silver }]}>
                              {formatPrice(inv.finalTotalUSD ?? inv.totalUSD, 'USD')}
                            </Text>
                            <Text style={[styles.savedInvTotalSYP, { color: colors.primary }]}>
                              الإجمالي: {formatPrice(displayTotal, 'SYP')}
                            </Text>
                          </View>

                          {/* Invoice actions */}
                          <View style={[styles.invActionsRow, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                              style={[styles.invActionBtn, { backgroundColor: colors.destructive + '15' }]}
                              onPress={() => setDeletingInvoiceId(inv.id)}
                            >
                              <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                              <Text style={[styles.invActionText, { color: colors.destructive }]}>حذف</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.invActionBtn, { backgroundColor: colors.secondary }]}
                              onPress={() => handleShareInvoice(inv)}
                            >
                              <Ionicons name="share-outline" size={15} color={colors.primary} />
                              <Text style={[styles.invActionText, { color: colors.primary }]}>مشاركة</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.invActionBtn, { backgroundColor: colors.primary + '15' }]}
                              onPress={() => handleDuplicateInvoice(inv.id)}
                            >
                              <Ionicons name="copy-outline" size={15} color={colors.primary} />
                              <Text style={[styles.invActionText, { color: colors.primary }]}>تكرار</Text>
                            </TouchableOpacity>
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

      {/* ── STATS TAB ────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <ScrollView contentContainerStyle={[styles.statsContent, { paddingBottom: bottomInset + 20 }]} showsVerticalScrollIndicator={false}>
          {/* Period selector */}
          <View style={[styles.periodSelector, { backgroundColor: colors.secondary }]}>
            {([
              { key: 'today' as StatsPeriod, label: 'اليوم' },
              { key: 'week' as StatsPeriod, label: 'الأسبوع' },
              { key: 'month' as StatsPeriod, label: 'الشهر' },
            ]).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.periodPill, statsPeriod === key && { backgroundColor: colors.primary }]}
                onPress={() => { setStatsPeriod(key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[styles.periodPillText, { color: statsPeriod === key ? colors.primaryForeground : colors.foreground }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {stats.count === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="bar-chart-outline" size={44} color={colors.silver} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد مبيعات</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {statsPeriod === 'today' ? 'لا يوجد مبيعات اليوم' : statsPeriod === 'week' ? 'لا يوجد مبيعات هذا الأسبوع' : 'لا يوجد مبيعات هذا الشهر'}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsCardsRow}>
                <StatsCard label="عدد الفواتير" value={String(stats.count)} icon="receipt-outline" color={colors.primary} colors={colors} />
                <StatsCard label="المتوسط" value={formatPrice(Math.round(stats.avgSYP), 'SYP')} icon="analytics-outline" color={colors.silver} colors={colors} />
              </View>

              <View style={[styles.statsBigCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statsBigRow}>
                  <Ionicons name="cash-outline" size={22} color={colors.primary} />
                  <Text style={[styles.statsBigLabel, { color: colors.foreground }]}>إجمالي المبيعات</Text>
                </View>
                <Text style={[styles.statsBigValue, { color: colors.primary }]}>{formatPrice(Math.round(stats.totalSYP), 'SYP')}</Text>
                <Text style={[styles.statsBigSub, { color: colors.silver }]}>{formatPrice(stats.totalUSD, 'USD')}</Text>
              </View>

              <Text style={[styles.statsHistoryTitle, { color: colors.foreground }]}>الفواتير</Text>
              {stats.invoices.map((inv) => (
                <View key={inv.id} style={[styles.statsInvRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statsInvTotal, { color: colors.primary }]}>{formatPrice(inv.finalTotalSYP ?? inv.totalSYP, 'SYP')}</Text>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {inv.note ? <Text style={[styles.statsInvNote, { color: colors.foreground }]} numberOfLines={1}>{inv.note}</Text> : null}
                    <Text style={[styles.statsInvDate, { color: colors.mutedForeground }]}>{formatArabicDateShort(inv.createdAt)}</Text>
                  </View>
                  <View style={[styles.statsInvBadge, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.statsInvNum, { color: colors.primary }]}>#{inv.number}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── EXIT MODAL ──────────────────────────────────── */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowExitModal(false)}>
          <Animated.View entering={FadeInDown.duration(250).springify()} style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => {}}>
              <View style={[styles.modalIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="save-outline" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>حفظ الفاتورة؟</Text>
              <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>
                لديك {activeItems.length} منتج في فاتورة {activeNumber}
              </Text>
              <TouchableOpacity style={[styles.modalBtnFull, { backgroundColor: colors.primary, marginBottom: 8 }]} onPress={handleExitSave}>
                <Ionicons name="save-outline" size={18} color={colors.primaryForeground} />
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>حفظ والخروج</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnFull, { backgroundColor: colors.destructive + '15', marginBottom: 8 }]} onPress={handleExitDiscard}>
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                <Text style={[styles.modalBtnText, { color: colors.destructive }]}>تجاهل والخروج</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnFull, { backgroundColor: colors.secondary }]} onPress={() => setShowExitModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>تراجع</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── CLEAR MODAL ─────────────────────────────────── */}
      <Modal visible={showClearConfirm} transparent animationType="fade" onRequestClose={() => setShowClearConfirm(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowClearConfirm(false)}>
          <Animated.View entering={FadeInDown.duration(250).springify()} style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => {}}>
              <View style={[styles.modalIcon, { backgroundColor: colors.destructive + '15' }]}>
                <Ionicons name="trash-outline" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>مسح الفاتورة</Text>
              <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>سيتم حذف جميع المنتجات من فاتورة {activeNumber}</Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowClearConfirm(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.destructive }]} onPress={handleClear}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>مسح</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── DELETE SAVED MODAL ──────────────────────────── */}
      <Modal visible={!!deletingInvoiceId} transparent animationType="fade" onRequestClose={() => setDeletingInvoiceId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeletingInvoiceId(null)}>
          <Animated.View entering={FadeInDown.duration(250).springify()} style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => {}}>
              <View style={[styles.modalIcon, { backgroundColor: colors.destructive + '15' }]}>
                <Ionicons name="trash-outline" size={28} color={colors.destructive} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>حذف الفاتورة</Text>
              <Text style={[styles.modalMsg, { color: colors.mutedForeground }]}>هل تريد حذف هذه الفاتورة نهائياً؟</Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setDeletingInvoiceId(null)}>
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.destructive }]} onPress={handleDeleteSaved}>
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

function StatsCard({ label, value, icon, color, colors }: { label: string; value: string; icon: string; color: string; colors: any }) {
  return (
    <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statsCardIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statsCardValue, { color: color }]}>{value}</Text>
      <Text style={[styles.statsCardLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function InvoiceRow({
  item, colors, onIncrease, onDecrease, onRemove,
}: {
  item: InvoiceItem; colors: any;
  onIncrease: () => void; onDecrease: () => void; onRemove: () => void;
}) {
  const subtotal = item.sellingPriceSYP * item.qty;
  return (
    <View style={[styles.invoiceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={[styles.removeBtn, { backgroundColor: colors.destructive + '15' }]} onPress={onRemove}>
        <Ionicons name="close" size={14} color={colors.destructive} />
      </TouchableOpacity>
      <View style={styles.invoiceRowContent}>
        <Text style={[styles.invoiceRowName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.invoiceRowPrice, { color: colors.silver }]}>{formatPrice(item.sellingPriceSYP, 'SYP')} / قطعة</Text>
      </View>
      <View style={styles.qtyControls}>
        <Text style={[styles.invoiceRowSubtotal, { color: colors.primary }]}>{formatPrice(subtotal, 'SYP')}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.secondary }]} onPress={onDecrease}>
            <Ionicons name="remove" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.qty}</Text>
          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.primary }]} onPress={onIncrease}>
            <Ionicons name="add" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerBtn: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold' },
  headerSub: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 5 },
  tabText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Tajawal_700Bold' },
  actionRow: { flexDirection: 'row', padding: 10, gap: 8, borderBottomWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  actionBtnSquare: { width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  actionBtnText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  noteInput: { flex: 1, fontSize: 14, fontFamily: 'Tajawal_400Regular', height: 36 },
  searchContainer: { borderBottomWidth: 1, paddingHorizontal: 12, paddingBottom: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, gap: 8, height: 40, marginVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Tajawal_400Regular', height: 40 },
  searchResults: { maxHeight: 200 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  searchResultInfo: { flex: 1, alignItems: 'flex-end' },
  searchResultName: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  searchResultPrice: { fontSize: 12, fontFamily: 'Tajawal_400Regular' },
  noResults: { paddingVertical: 10 },
  noResultsText: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center' },
  listContent: { paddingTop: 8, paddingHorizontal: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 20 },
  totalFooter: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 6,
  },
  discountToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderRadius: 10,
  },
  discountToggleText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 6 },
  discountTypeToggle: { flexDirection: 'row', padding: 3, gap: 2 },
  discountTypePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  discountTypePillText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  discountInput: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Tajawal_700Bold' },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  totalAmounts: { gap: 1 },
  subtotalLine: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  discountLine: { fontSize: 11, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  totalSYP: { fontSize: 22, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  totalUSD: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  totalRight: { alignItems: 'flex-end', gap: 6 },
  totalCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  totalCount: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
  invoiceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  removeBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  invoiceRowContent: { flex: 1, alignItems: 'flex-end', gap: 2 },
  invoiceRowName: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  invoiceRowPrice: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  qtyControls: { alignItems: 'flex-end', gap: 4 },
  invoiceRowSubtotal: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontFamily: 'Tajawal_700Bold', minWidth: 24, textAlign: 'center' },
  histSearchWrap: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  histSearchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, gap: 8, height: 38 },
  histSearchInput: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_400Regular', height: 38 },
  savedInvoiceCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  savedInvoiceHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  invNumberBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  invNumberText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  savedInvoiceInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  savedInvoiceNote: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  savedInvoiceTotal: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  savedInvoiceDate: { fontSize: 11, fontFamily: 'Tajawal_400Regular' },
  savedInvoiceItems: { borderTopWidth: 1 },
  savedItemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  savedItemSubtotal: { fontSize: 13, fontFamily: 'Tajawal_700Bold', minWidth: 80, textAlign: 'right' },
  savedItemQty: { fontSize: 12, fontFamily: 'Tajawal_400Regular', minWidth: 24, textAlign: 'center' },
  savedItemName: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_500Medium', textAlign: 'right' },
  discountSummaryRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, justifyContent: 'flex-end' },
  discountSummaryText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  savedInvoiceTotalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  savedInvTotalUSD: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  savedInvTotalSYP: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
  invActionsRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1 },
  invActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  invActionText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  statsContent: { padding: 12, gap: 10 },
  periodSelector: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  periodPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  periodPillText: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  statsCardsRow: { flexDirection: 'row', gap: 10 },
  statsCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6 },
  statsCardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statsCardValue: { fontSize: 20, fontFamily: 'Tajawal_700Bold', textAlign: 'center' },
  statsCardLabel: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'center' },
  statsBigCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  statsBigRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  statsBigLabel: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  statsBigValue: { fontSize: 28, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  statsBigSub: { fontSize: 14, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  statsHistoryTitle: { fontSize: 14, fontFamily: 'Tajawal_700Bold', textAlign: 'right', marginTop: 4 },
  statsInvRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  statsInvBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statsInvNum: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  statsInvNote: { fontSize: 13, fontFamily: 'Tajawal_700Bold', textAlign: 'right' },
  statsInvDate: { fontSize: 11, fontFamily: 'Tajawal_400Regular', textAlign: 'right' },
  statsInvTotal: { fontSize: 15, fontFamily: 'Tajawal_700Bold', minWidth: 100, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 20, gap: 2 },
  modalIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontFamily: 'Tajawal_700Bold', textAlign: 'center', marginBottom: 6 },
  modalMsg: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  modalBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontFamily: 'Tajawal_700Bold' },
});
