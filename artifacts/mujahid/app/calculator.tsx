import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  FlatList,
  Keyboard,
  PanResponder,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '@/context/ProductsContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { formatArabicDateShort } from '@/utils/dateFormatter';
import { generateAndShareInvoicePdf } from '@/utils/invoicePdf';
import { useInvoiceStore, type SavedInvoice } from '@/utils/invoiceStore';
import { consumeScanResult } from '@/utils/scanResult';
import { searchProducts } from '@/utils/fuzzySearch';

type Tab = 'invoice' | 'records' | 'stats';
type StatsPeriod = 'today' | 'week' | 'month';

function fmtSYP(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
function fmtUSD(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { products } = useProducts();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const store = useInvoiceStore();

  const [tab, setTab] = useState<Tab>('invoice');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerInput, setCustomerInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('today');
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [kbHeight, setKbHeight] = useState(0);
  const searchRef = useRef<TextInput>(null);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const recordsListRef = useRef<any>(null);

  const exchangeRate = settings.exchangeRate;
  const totalSYP = store.totalSYP;
  const totalSYJ = Math.round(totalSYP / 100);
  const totalUSD = exchangeRate > 0 ? totalSYP / exchangeRate : 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => setKbHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as any, (e: any) => {
      if (store.items.length === 0) return;
      e.preventDefault();
      pendingNavRef.current = () => navigation.dispatch(e.data.action);
      setShowLeaveModal(true);
    });
    return unsubscribe;
  }, [navigation, store.items.length]);

  useFocusEffect(
    useCallback(() => {
      const barcode = consumeScanResult();
      if (!barcode) return;
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        store.addItem({ productId: product.id, name: product.name, unitPriceSYP: product.sellingPriceSYP });
        setTab('invoice');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({ message: `✓ أُضيف: ${product.name}`, type: 'success' });
      } else {
        showToast({ message: 'المنتج غير موجود في القائمة', type: 'warning' });
      }
    }, [products])
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    if (products.length === 0) return [];
    return searchProducts(searchQuery, products).slice(0, 8);
  }, [searchQuery, products]);

  function openCustomerModal() {
    setCustomerInput(store.customerName);
    setNotesInput(store.notes);
    setShowCustomerModal(true);
  }

  function saveCustomerInfo() {
    store.setCustomerName(customerInput.trim());
    store.setNotes(notesInput.trim());
    setShowCustomerModal(false);
  }

  function openAddItemModal() {
    setCustomItemName('');
    setCustomItemPrice('');
    setShowAddItemModal(true);
  }

  function confirmAddCustomItem() {
    const name = customItemName.trim();
    const price = parseFloat(customItemPrice.replace(/,/g, ''));
    if (!name) {
      showToast({ message: 'يرجى إدخال اسم العنصر', type: 'warning' });
      return;
    }
    if (isNaN(price) || price <= 0) {
      showToast({ message: 'يرجى إدخال سعر صحيح', type: 'warning' });
      return;
    }
    const customId = `custom_${Date.now()}`;
    store.addItem({ productId: customId, name, unitPriceSYP: price });
    setShowAddItemModal(false);
    setTab('invoice');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({ message: `✓ أُضيف: ${name}`, type: 'success' });
  }

  async function handleSaveInvoice() {
    if (store.items.length === 0) {
      showToast({ message: 'الفاتورة فارغة — أضف منتجاً أولاً', type: 'warning' });
      return;
    }
    try {
      setSaving(true);
      await store.saveInvoice(exchangeRate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ message: 'تم حفظ الفاتورة بنجاح', type: 'success' });
      setTab('records');
      setTimeout(() => {
        recordsListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 120);
    } catch {
      showToast({ message: 'فشل حفظ الفاتورة', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePdf(inv: SavedInvoice) {
    try {
      setPdfLoadingId(inv.id);
      await generateAndShareInvoicePdf(inv);
    } catch {
      showToast({ message: 'فشل إنشاء ملف PDF', type: 'error' });
    } finally {
      setPdfLoadingId(null);
    }
  }

  function addFromSearch(product: (typeof products)[0]) {
    store.addItem({ productId: product.id, name: product.name, unitPriceSYP: product.sellingPriceSYP });
    setSearchQuery('');
    searchRef.current?.blur();
    setTab('invoice');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast({ message: `✓ أُضيف: ${product.name}`, type: 'success' });
  }

  const stats = store.getStats(statsPeriod);

  const items = store.items;

  if (!store.isLoaded) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 6, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>حاسبة</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>فاتورة #{store.number}</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      {/* ── Tab Bar ── */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(
          [
            { id: 'invoice', label: 'الفاتورة', icon: 'receipt-outline' },
            { id: 'records', label: 'الفواتير', icon: 'time-outline', badge: store.savedInvoices.length },
            { id: 'stats', label: 'إحصائيات', icon: 'stats-chart-outline' },
          ] as const
        ).map(t => {
          const active = tab === (t.id as Tab);
          return (
            <TouchableOpacity
              key={t.id}
              style={s.tabItem}
              onPress={() => { setTab(t.id as Tab); Haptics.selectionAsync(); }}
              activeOpacity={0.7}
            >
              <View style={s.tabInner}>
                <Ionicons name={t.icon as any} size={16} color={active ? colors.primary : colors.mutedForeground} />
                <Text style={[s.tabLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
                  {t.label}
                </Text>
                {'badge' in t && t.badge > 0 && (
                  <View style={[s.badge, { backgroundColor: colors.primary }]}>
                    <Text style={s.badgeText}>{t.badge}</Text>
                  </View>
                )}
              </View>
              {active && <View style={[s.tabLine, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab Content ── */}
      {tab === 'invoice' && (
        <Animated.View entering={FadeIn.duration(220)} style={s.flex}>
          {/* Action bar */}
          <View style={[s.actionBar, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openCustomerModal}
              activeOpacity={0.75}
            >
              <Ionicons name="person-outline" size={19} color={colors.foreground} />
              {(store.customerName || store.notes) ? (
                <View style={[s.dot, { backgroundColor: colors.primary }]} />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openAddItemModal}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={15} color={colors.mutedForeground} />
              <TextInput
                ref={searchRef}
                style={[s.searchInput, { color: colors.foreground }]}
                placeholder="بحث عن منتج"
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[s.scanBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: '/scanner', params: { returnTo: 'calculator' } });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-outline" size={17} color="#fff" />
              <Text style={s.scanBtnTxt}>مسح</Text>
            </TouchableOpacity>
          </View>

          {/* Search dropdown */}
          {searchResults.length > 0 && (
            <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {searchResults.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[s.dropRow, { borderBottomColor: colors.border }]}
                  onPress={() => addFromSearch(product)}
                  activeOpacity={0.65}
                >
                  <View style={[s.addIcon, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </View>
                  <View style={s.dropInfo}>
                    <Text style={[s.dropName, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
                    <Text style={[s.dropPrice, { color: colors.mutedForeground }]}>
                      {fmtSYP(product.sellingPriceSYP)} ل.س.ق
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Items or empty state */}
          {items.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="receipt-outline" size={50} color={colors.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>فاتورة #{store.number} فارغة</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>امسح باركود أو ابحث عن منتج أو أضف عنصراً</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.productId}
              contentContainerStyle={{ padding: 12, paddingBottom: 130 }}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              extraData={store.tick}
              renderItem={({ item }) => {
                const lineTotal = item.unitPriceSYP * item.qty;
                return (
                  <View style={[s.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={s.itemRow}>
                      <Pressable
                        style={s.trashBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                        onPress={() => {
                          store.removeItem(item.productId);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                      </Pressable>

                      <View style={[s.qtyBox, { borderColor: colors.border }]}>
                        <Pressable
                          style={s.qtyBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                          onPress={() => {
                            store.updateQty(item.productId, item.qty - 1);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Text style={[s.qtyBtnTxt, { color: item.qty === 1 ? '#FF3B30' : colors.primary }]}>
                            {item.qty === 1 ? '×' : '−'}
                          </Text>
                        </Pressable>
                        <Text style={[s.qtyNum, { color: colors.foreground }]}>{item.qty}</Text>
                        <Pressable
                          style={s.qtyBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                          onPress={() => {
                            store.updateQty(item.productId, item.qty + 1);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Text style={[s.qtyBtnTxt, { color: colors.primary }]}>+</Text>
                        </Pressable>
                      </View>

                      <View style={s.itemInfo}>
                        <Text style={[s.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[s.itemUnitPrice, { color: colors.mutedForeground }]}>
                          {fmtSYP(item.unitPriceSYP)} ل.س.ق × {item.qty}
                        </Text>
                      </View>
                    </View>

                    <View style={[s.itemFooter, { borderTopColor: colors.border }]}>
                      <Text style={[s.itemTotalLbl, { color: colors.mutedForeground }]}>الإجمالي</Text>
                      <Text style={[s.itemTotalVal, { color: colors.primary }]}>
                        {fmtSYP(lineTotal)} ل.س.ق
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Total bar */}
          {items.length > 0 && (
            <Animated.View
              entering={FadeIn.duration(250)}
              exiting={FadeOut.duration(180)}
              style={[s.totalBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}
            >
              <View style={s.totalAmounts}>
                <Text style={[s.totalMain, { color: colors.foreground }]}>
                  {fmtSYP(totalSYP)}{' '}
                  <Text style={[s.totalMainCur, { color: colors.mutedForeground }]}>ل.س.ق</Text>
                </Text>
                <Text style={[s.totalSecondary, { color: colors.mutedForeground }]}>
                  {fmtSYP(totalSYJ)} ل.س.ج  ·  {fmtUSD(totalUSD)} $
                </Text>
              </View>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveInvoice}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={s.saveBtnTxt}>حفظ</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {tab === 'records' && (
        <Animated.View entering={FadeIn.duration(220)} style={s.flex}>
          {store.savedInvoices.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="receipt-outline" size={50} color={colors.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>لا توجد فواتير محفوظة</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>الفواتير ستظهر هنا بعد الحفظ</Text>
            </View>
          ) : (
            <FlatList
              ref={recordsListRef}
              data={store.savedInvoices}
              keyExtractor={i => i.id}
              extraData={store.tick}
              contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: inv, index }) => {
                const invSYJ = Math.round(inv.totalSYP / 100);
                const invUSD = inv.exchangeRate > 0 ? inv.totalSYP / inv.exchangeRate : 0;
                const isExpanded = expandedInvoiceId === inv.id;
                return (
                  <Animated.View entering={FadeInDown.duration(220).delay(index < 8 ? index * 35 : 0)} style={[s.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={s.recordTop}
                      onPress={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                      activeOpacity={0.75}
                    >
                      <View style={s.recordActions}>
                        <TouchableOpacity
                          style={[s.recBtn, { backgroundColor: '#FF3B3010' }]}
                          onPress={() => { store.deleteSaved(inv.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                          hitSlop={6}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.recBtn, { backgroundColor: colors.primary + '12' }]}
                          onPress={() => handlePdf(inv)}
                          disabled={pdfLoadingId === inv.id}
                          hitSlop={6}
                        >
                          {pdfLoadingId === inv.id
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                          }
                        </TouchableOpacity>
                      </View>
                      <View style={s.recordMeta}>
                        <Text style={[s.recordNum, { color: colors.foreground }]}>فاتورة #{inv.number}</Text>
                        {inv.customerName ? (
                          <Text style={[s.recordCustomer, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {inv.customerName}
                          </Text>
                        ) : null}
                        {inv.notes ? (
                          <Text style={[s.recordNote, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {inv.notes}
                          </Text>
                        ) : null}
                        <Text style={[s.recordDate, { color: colors.mutedForeground }]}>
                          {formatArabicDateShort(inv.createdAt)}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.mutedForeground}
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[s.recordDetails, { borderTopColor: colors.border }]}>
                        {inv.items.map((it, idx) => (
                          <View
                            key={`${it.productId}_${idx}`}
                            style={[s.detailRow, idx < inv.items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                          >
                            <Text style={[s.detailTotal, { color: colors.primary }]}>
                              {fmtSYP(it.unitPriceSYP * it.qty)} ل.س.ق
                            </Text>
                            <Text style={[s.detailQty, { color: colors.mutedForeground }]}>× {it.qty}</Text>
                            <Text style={[s.detailName, { color: colors.foreground }]} numberOfLines={1}>{it.name}</Text>
                          </View>
                        ))}
                        {(inv.customerName || inv.notes) && (
                          <View style={[s.detailInfoBox, { backgroundColor: colors.secondary, borderTopColor: colors.border }]}>
                            {inv.customerName ? (
                              <Text style={[s.detailInfoTxt, { color: colors.mutedForeground }]}>
                                الزبون: <Text style={{ color: colors.foreground }}>{inv.customerName}</Text>
                              </Text>
                            ) : null}
                            {inv.notes ? (
                              <Text style={[s.detailInfoTxt, { color: colors.mutedForeground }]}>
                                ملاحظات: <Text style={{ color: colors.foreground }}>{inv.notes}</Text>
                              </Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                    )}

                    <View style={[s.recordBottom, { borderTopColor: colors.border }]}>
                      <Text style={[s.recSecondary, { color: colors.mutedForeground }]}>
                        {fmtSYP(invSYJ)} ل.س.ج  ·  {fmtUSD(invUSD)} $
                      </Text>
                      <Text style={[s.recTotal, { color: colors.primary }]}>
                        {fmtSYP(inv.totalSYP)}{' '}
                        <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.mutedForeground }}>ل.س.ق</Text>
                      </Text>
                    </View>
                  </Animated.View>
                );
              }}
            />
          )}
        </Animated.View>
      )}

      {tab === 'stats' && (
        <Animated.View entering={FadeIn.duration(220)} style={s.flex}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Period selector */}
          <View style={[s.periodRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(
              [
                { id: 'today', label: 'اليوم' },
                { id: 'week', label: 'الأسبوع' },
                { id: 'month', label: 'الشهر' },
              ] as const
            ).map(p => (
              <TouchableOpacity
                key={p.id}
                style={[s.periodBtn, statsPeriod === p.id && [s.periodBtnActive, { backgroundColor: colors.primary }]]}
                onPress={() => setStatsPeriod(p.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.periodTxt, { color: statsPeriod === p.id ? '#fff' : colors.mutedForeground }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats cards */}
          <View style={s.statsRow}>
            {[
              { label: 'عدد الفواتير', value: String(stats.count), icon: 'receipt-outline' as const },
              { label: 'المجموع', value: `${fmtSYP(stats.totalSYP)}\nل.س.ق`, icon: 'wallet-outline' as const },
              { label: 'المتوسط', value: `${fmtSYP(stats.avgSYP)}\nل.س.ق`, icon: 'trending-up-outline' as const },
            ].map(card => (
              <View key={card.label} style={[s.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={card.icon} size={22} color={colors.primary} />
                <Text style={[s.statsVal, { color: colors.foreground }]}>{card.value}</Text>
                <Text style={[s.statsLbl, { color: colors.mutedForeground }]}>{card.label}</Text>
              </View>
            ))}
          </View>

          {stats.invoices.length === 0 ? (
            <View style={s.statsEmpty}>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>لا توجد فواتير في هذه الفترة</Text>
            </View>
          ) : (
            <>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>الفواتير</Text>
              {stats.invoices.map(inv => (
                <TouchableOpacity
                  key={inv.id}
                  style={[s.statsInvRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handlePdf(inv)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.statsInvTotal, { color: colors.foreground }]}>{fmtSYP(inv.totalSYP)} ل.س.ق</Text>
                  <Text style={[s.statsInvName, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {inv.customerName || '—'}
                  </Text>
                  <Text style={[s.statsInvNum, { color: colors.primary }]}>#{inv.number}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
        </Animated.View>
      )}

      {/* ── Customer Modal ── */}
      <Modal
        visible={showCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowCustomerModal(false); }}
      >
        <Pressable style={s.backdrop} onPress={() => { Keyboard.dismiss(); setShowCustomerModal(false); }}>
          <Pressable>
            <SwipeSheet
              onClose={() => { Keyboard.dismiss(); setShowCustomerModal(false); }}
              sheetStyle={[s.panel, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: kbHeight }]}
              handleColor={colors.border}
            >
              <Text style={[s.panelTitle, { color: colors.foreground }]}>معلومات الزبون</Text>

              <Text style={[s.fieldLbl, { color: colors.mutedForeground }]}>اسم الزبون</Text>
              <TextInput
                style={[s.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="اسم الزبون (اختياري)"
                placeholderTextColor={colors.mutedForeground}
                value={customerInput}
                onChangeText={setCustomerInput}
                returnKeyType="next"
              />

              <Text style={[s.fieldLbl, { color: colors.mutedForeground }]}>ملاحظات</Text>
              <TextInput
                style={[s.fieldInput, s.fieldArea, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="ملاحظات (اختياري)"
                placeholderTextColor={colors.mutedForeground}
                value={notesInput}
                onChangeText={setNotesInput}
                multiline
                numberOfLines={3}
              />

              <View style={s.modalBtns}>
                <TouchableOpacity
                  style={[s.modalCancel, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setShowCustomerModal(false); }}
                >
                  <Text style={[s.modalCancelTxt, { color: colors.mutedForeground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalSave, { backgroundColor: colors.primary }]}
                  onPress={saveCustomerInfo}
                >
                  <Text style={s.modalSaveTxt}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </SwipeSheet>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Add Custom Item Modal ── */}
      <Modal
        visible={showAddItemModal}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowAddItemModal(false); }}
      >
        <Pressable style={s.backdrop} onPress={() => { Keyboard.dismiss(); setShowAddItemModal(false); }}>
          <Pressable>
            <SwipeSheet
              onClose={() => { Keyboard.dismiss(); setShowAddItemModal(false); }}
              sheetStyle={[s.panel, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: kbHeight }]}
              handleColor={colors.border}
            >
              <Text style={[s.panelTitle, { color: colors.foreground }]}>إضافة عنصر مخصص</Text>

              <Text style={[s.fieldLbl, { color: colors.mutedForeground }]}>اسم العنصر</Text>
              <TextInput
                style={[s.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="مثال: خدمة شحن"
                placeholderTextColor={colors.mutedForeground}
                value={customItemName}
                onChangeText={setCustomItemName}
                returnKeyType="next"
                autoFocus
              />

              <Text style={[s.fieldLbl, { color: colors.mutedForeground }]}>السعر (ل.س.ق)</Text>
              <TextInput
                style={[s.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="مثال: 50000"
                placeholderTextColor={colors.mutedForeground}
                value={customItemPrice}
                onChangeText={setCustomItemPrice}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={confirmAddCustomItem}
              />

              <View style={s.modalBtns}>
                <TouchableOpacity
                  style={[s.modalCancel, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setShowAddItemModal(false); }}
                >
                  <Text style={[s.modalCancelTxt, { color: colors.mutedForeground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalSave, { backgroundColor: colors.primary }]}
                  onPress={confirmAddCustomItem}
                >
                  <Text style={s.modalSaveTxt}>إضافة</Text>
                </TouchableOpacity>
              </View>
            </SwipeSheet>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Leave Without Save Modal ── */}
      <Modal visible={showLeaveModal} transparent animationType="fade" onRequestClose={() => setShowLeaveModal(false)}>
        <Pressable style={s.leaveBackdrop} onPress={() => setShowLeaveModal(false)}>
          <Animated.View entering={FadeIn.duration(200)}>
            <Pressable>
              <View style={[s.leaveBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.leaveIconWrap, { backgroundColor: colors.warning + '18' }]}>
                  <Ionicons name="warning-outline" size={30} color={colors.warning} />
                </View>
                <Text style={[s.leaveTitle, { color: colors.foreground }]}>مغادرة الفاتورة؟</Text>
                <Text style={[s.leaveMsg, { color: colors.mutedForeground }]}>
                  الفاتورة تحتوي على {items.length} عنصر غير محفوظ
                </Text>

                {/* حفظ ثم مغادرة */}
                <TouchableOpacity
                  style={[s.leaveActionBtn, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    setShowLeaveModal(false);
                    await handleSaveInvoice();
                    if (pendingNavRef.current) {
                      pendingNavRef.current();
                      pendingNavRef.current = null;
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                  <Text style={[s.leaveActionTxt, { color: '#fff' }]}>حفظ ثم مغادرة</Text>
                </TouchableOpacity>

                {/* مغادرة بدون حفظ */}
                <TouchableOpacity
                  style={[s.leaveActionBtn, { backgroundColor: '#FF3B3010', borderWidth: 1.5, borderColor: '#FF3B3040' }]}
                  onPress={() => {
                    setShowLeaveModal(false);
                    if (pendingNavRef.current) {
                      pendingNavRef.current();
                      pendingNavRef.current = null;
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="exit-outline" size={17} color="#FF3B30" />
                  <Text style={[s.leaveActionTxt, { color: '#FF3B30' }]}>مغادرة بدون حفظ</Text>
                </TouchableOpacity>

                {/* البقاء */}
                <TouchableOpacity
                  style={[s.leaveActionBtn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setShowLeaveModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.leaveActionTxt, { color: colors.mutedForeground }]}>البقاء</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function SwipeSheet({
  onClose, sheetStyle, handleColor, children,
}: {
  onClose: () => void; sheetStyle: any; handleColor: string; children: React.ReactNode;
}) {
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 3 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          RNAnimated.timing(translateY, { toValue: 700, duration: 220, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            onCloseRef.current();
          });
        } else {
          RNAnimated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    })
  ).current;

  return (
    <RNAnimated.View style={[sheetStyle, { transform: [{ translateY }] }]}>
      <View {...panResponder.panHandlers} style={s.dragHandleZone}>
        <View style={[s.dragHandleBar, { backgroundColor: handleColor }]} />
      </View>
      {children}
    </RNAnimated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 18 },
  headerSub: { fontFamily: 'Tajawal_400Regular', fontSize: 13, marginTop: 1 },
  arrowBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  arrowDot: { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4 },

  // Tab bar
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabLabel: { fontFamily: 'Tajawal_500Medium', fontSize: 13 },
  tabLine: { position: 'absolute', bottom: 0, left: 14, right: 14, height: 2.5, borderRadius: 2 },
  badge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Tajawal_700Bold' },

  // Action bar
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4 },
  searchWrap: {
    flex: 1, height: 40, borderRadius: 10, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 5,
  },
  searchInput: { flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 14, textAlign: 'right', paddingVertical: 0 },
  scanBtn: { height: 40, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  scanBtnTxt: { color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 14 },

  // Search dropdown
  dropdown: {
    position: 'absolute', top: 62, left: 10, right: 10, zIndex: 999,
    borderRadius: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
    elevation: 20,
  },
  dropRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  dropInfo: { flex: 1, alignItems: 'flex-end' },
  dropName: { fontFamily: 'Tajawal_700Bold', fontSize: 14 },
  dropPrice: { fontFamily: 'Tajawal_400Regular', fontSize: 12, marginTop: 1 },
  addIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 },
  emptyIcon: { width: 90, height: 90, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 17, marginBottom: 6 },
  emptySub: { fontFamily: 'Tajawal_400Regular', fontSize: 14 },

  // Item card
  itemCard: { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 11, gap: 9 },
  trashBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FF3B3010', alignItems: 'center', justifyContent: 'center' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  qtyBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt: { fontFamily: 'Tajawal_700Bold', fontSize: 20 },
  qtyNum: { minWidth: 34, textAlign: 'center', fontFamily: 'Tajawal_700Bold', fontSize: 16 },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { fontFamily: 'Tajawal_700Bold', fontSize: 15 },
  itemUnitPrice: { fontFamily: 'Tajawal_400Regular', fontSize: 12, marginTop: 2 },
  itemFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 11, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemTotalLbl: { fontFamily: 'Tajawal_400Regular', fontSize: 12 },
  itemTotalVal: { fontFamily: 'Tajawal_700Bold', fontSize: 14 },

  // Total bar
  totalBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  totalAmounts: { flex: 1 },
  totalMain: { fontFamily: 'Tajawal_700Bold', fontSize: 20 },
  totalMainCur: { fontFamily: 'Tajawal_400Regular', fontSize: 13 },
  totalSecondary: { fontFamily: 'Tajawal_400Regular', fontSize: 12, marginTop: 2 },
  saveBtn: { height: 46, paddingHorizontal: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveBtnTxt: { color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 15 },

  // Records
  recordCard: { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  recordTop: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  recordActions: { flexDirection: 'row', gap: 6 },
  recBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recordMeta: { flex: 1, alignItems: 'flex-end' },
  recordNum: { fontFamily: 'Tajawal_700Bold', fontSize: 15 },
  recordCustomer: { fontFamily: 'Tajawal_500Medium', fontSize: 13, marginTop: 1 },
  recordNote: { fontFamily: 'Tajawal_400Regular', fontSize: 12, marginTop: 1, fontStyle: 'italic' },
  recordDate: { fontFamily: 'Tajawal_400Regular', fontSize: 12, marginTop: 1 },
  recordDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
  },
  detailName: { flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 13, textAlign: 'right' },
  detailQty: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#888' },
  detailTotal: { fontFamily: 'Tajawal_700Bold', fontSize: 13, minWidth: 80, textAlign: 'left' },
  detailInfoBox: {
    marginTop: 6, marginBottom: 4, borderRadius: 8, padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 2,
  },
  detailInfoTxt: { fontFamily: 'Tajawal_400Regular', fontSize: 12, textAlign: 'right' },
  recordBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  recTotal: { fontFamily: 'Tajawal_700Bold', fontSize: 15 },
  recSecondary: { fontFamily: 'Tajawal_400Regular', fontSize: 12 },

  // Stats
  periodRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodBtnActive: {},
  periodTxt: { fontFamily: 'Tajawal_500Medium', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statsCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 5 },
  statsVal: { fontFamily: 'Tajawal_700Bold', fontSize: 13, textAlign: 'center' },
  statsLbl: { fontFamily: 'Tajawal_400Regular', fontSize: 11, textAlign: 'center' },
  statsEmpty: { marginTop: 40, alignItems: 'center' },
  sectionTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 15, marginBottom: 8, textAlign: 'right' },
  statsInvRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1,
    padding: 10, marginBottom: 6, gap: 8,
  },
  statsInvNum: { fontFamily: 'Tajawal_700Bold', fontSize: 14, width: 44 },
  statsInvName: { flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 13, textAlign: 'right' },
  statsInvTotal: { fontFamily: 'Tajawal_700Bold', fontSize: 13 },

  // Swipe-to-dismiss handle
  dragHandleZone: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  dragHandleBar: { width: 40, height: 4, borderRadius: 2 },

  // Customer/Add Item modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  panel: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    paddingHorizontal: 22, paddingBottom: 38,
  },
  panelTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  fieldLbl: { fontFamily: 'Tajawal_500Medium', fontSize: 13, textAlign: 'right', marginBottom: 6 },
  fieldInput: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: 'Tajawal_400Regular', fontSize: 15, textAlign: 'right', marginBottom: 16,
  },
  fieldArea: { height: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: 'center' },
  modalCancelTxt: { fontFamily: 'Tajawal_500Medium', fontSize: 15 },
  modalSave: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalSaveTxt: { color: '#fff', fontFamily: 'Tajawal_700Bold', fontSize: 15 },

  // Leave modal
  leaveBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  leaveBox: {
    width: '100%', borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 18,
  },
  leaveIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  leaveTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 18, marginBottom: 6, textAlign: 'center' },
  leaveMsg: { fontFamily: 'Tajawal_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 22, opacity: 0.7 },
  leaveActionBtn: {
    width: '100%', borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginBottom: 10,
  },
  leaveActionTxt: { fontFamily: 'Tajawal_700Bold', fontSize: 15 },
});
