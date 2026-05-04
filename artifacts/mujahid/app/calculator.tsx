import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
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
  const searchRef = useRef<TextInput>(null);

  const exchangeRate = settings.exchangeRate;
  const totalSYP = store.totalSYP;
  const totalSYJ = Math.round(totalSYP / 100);
  const totalUSD = exchangeRate > 0 ? totalSYP / exchangeRate : 0;

  useFocusEffect(
    useCallback(() => {
      const barcode = consumeScanResult();
      if (!barcode) return;
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        store.addItem({ productId: product.id, name: product.name, unitPriceSYP: product.sellingPriceSYP });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showToast({ message: 'المنتج غير موجود في القائمة', type: 'warning' });
      }
    }, [products])
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchProducts(searchQuery, products).slice(0, 7);
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

  async function handleDraftPdf() {
    if (store.items.length === 0) {
      showToast({ message: 'الفاتورة فارغة', type: 'warning' });
      return;
    }
    const draft: SavedInvoice = {
      id: 'draft',
      number: store.number,
      customerName: store.customerName,
      notes: store.notes,
      items: store.items,
      totalSYP,
      exchangeRate,
      createdAt: new Date().toISOString(),
    };
    await handlePdf(draft);
  }

  function addFromSearch(product: (typeof products)[0]) {
    store.addItem({ productId: product.id, name: product.name, unitPriceSYP: product.sellingPriceSYP });
    setSearchQuery('');
    searchRef.current?.blur();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const stats = store.getStats(statsPeriod);

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
        <TouchableOpacity
          style={[s.arrowBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={openCustomerModal}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar ── */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(
          [
            { id: 'invoice', label: 'الفاتورة', icon: 'receipt-outline' },
            { id: 'records', label: 'السجلات', icon: 'time-outline', badge: store.savedInvoices.length },
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
        <View style={s.flex}>
          {/* Action bar */}
          <View style={[s.actionBar, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openCustomerModal}
              activeOpacity={0.75}
            >
              <Ionicons name="person-outline" size={18} color={colors.foreground} />
              {(store.customerName || store.notes) ? (
                <View style={[s.dot, { backgroundColor: colors.primary }]} />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleDraftPdf}
              activeOpacity={0.75}
              disabled={pdfLoadingId === 'draft'}
            >
              {pdfLoadingId === 'draft'
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="document-text-outline" size={18} color={colors.foreground} />
              }
            </TouchableOpacity>

            <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={15} color={colors.mutedForeground} />
              <TextInput
                ref={searchRef}
                style={[s.searchInput, { color: colors.foreground }]}
                placeholder="بحث"
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
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {searchResults.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[s.dropRow, { borderBottomColor: colors.border }]}
                  onPress={() => addFromSearch(product)}
                  activeOpacity={0.7}
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
            </Animated.View>
          )}

          {/* Items or empty state */}
          {store.items.length === 0 ? (
            <Animated.View entering={FadeIn} style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="receipt-outline" size={50} color={colors.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>فاتورة #{store.number} فارغة</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>امسح باركود أو ابحث عن منتج</Text>
            </Animated.View>
          ) : (
            <ScrollView
              style={s.flex}
              contentContainerStyle={{ padding: 12, paddingBottom: 108 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {store.items.map(item => {
                const lineTotal = item.unitPriceSYP * item.qty;
                return (
                  <Animated.View key={item.productId} entering={FadeIn}>
                    <View style={[s.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={s.itemRow}>
                        <TouchableOpacity
                          style={s.trashBtn}
                          onPress={() => { store.removeItem(item.productId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                        </TouchableOpacity>

                        <View style={[s.qtyBox, { borderColor: colors.border }]}>
                          <TouchableOpacity
                            style={s.qtyBtn}
                            onPress={() => { store.updateQty(item.productId, item.qty - 1); Haptics.selectionAsync(); }}
                          >
                            <Text style={[s.qtyBtnTxt, { color: item.qty === 1 ? '#FF3B30' : colors.primary }]}>
                              {item.qty === 1 ? '×' : '−'}
                            </Text>
                          </TouchableOpacity>
                          <Text style={[s.qtyNum, { color: colors.foreground }]}>{item.qty}</Text>
                          <TouchableOpacity
                            style={s.qtyBtn}
                            onPress={() => { store.updateQty(item.productId, item.qty + 1); Haptics.selectionAsync(); }}
                          >
                            <Text style={[s.qtyBtnTxt, { color: colors.primary }]}>+</Text>
                          </TouchableOpacity>
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
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}

          {/* Total bar */}
          {store.items.length > 0 && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
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
        </View>
      )}

      {tab === 'records' && (
        <View style={s.flex}>
          {store.savedInvoices.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="time-outline" size={50} color={colors.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>لا توجد فواتير محفوظة</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>الفواتير ستظهر هنا بعد الحفظ</Text>
            </View>
          ) : (
            <FlatList
              data={store.savedInvoices}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: inv }) => {
                const invSYJ = Math.round(inv.totalSYP / 100);
                const invUSD = inv.exchangeRate > 0 ? inv.totalSYP / inv.exchangeRate : 0;
                return (
                  <View style={[s.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={s.recordTop}>
                      <View style={s.recordActions}>
                        <TouchableOpacity
                          style={[s.recBtn, { backgroundColor: '#FF3B3010' }]}
                          onPress={() => { store.deleteSaved(inv.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.recBtn, { backgroundColor: colors.primary + '12' }]}
                          onPress={() => handlePdf(inv)}
                          disabled={pdfLoadingId === inv.id}
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
                        <Text style={[s.recordDate, { color: colors.mutedForeground }]}>
                          {formatArabicDateShort(inv.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={[s.recordBottom, { borderTopColor: colors.border }]}>
                      <Text style={[s.recSecondary, { color: colors.mutedForeground }]}>
                        {fmtSYP(invSYJ)} ل.س.ج  ·  {fmtUSD(invUSD)} $
                      </Text>
                      <Text style={[s.recTotal, { color: colors.primary }]}>
                        {fmtSYP(inv.totalSYP)}{' '}
                        <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.mutedForeground }}>ل.س.ق</Text>
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {tab === 'stats' && (
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
      )}

      {/* ── Customer Modal ── */}
      <Modal visible={showCustomerModal} transparent animationType="slide" onRequestClose={() => setShowCustomerModal(false)}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowCustomerModal(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View style={[s.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.handle, { backgroundColor: colors.border }]} />
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
                    onPress={() => setShowCustomerModal(false)}
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
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    position: 'absolute', top: 60, left: 10, right: 10, zIndex: 200,
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
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
  qtyBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  qtyBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt: { fontFamily: 'Tajawal_700Bold', fontSize: 18 },
  qtyNum: { width: 30, textAlign: 'center', fontFamily: 'Tajawal_700Bold', fontSize: 15 },
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
  recordCustomer: { fontFamily: 'Tajawal_400Regular', fontSize: 13, marginTop: 1 },
  recordDate: { fontFamily: 'Tajawal_400Regular', fontSize: 12, marginTop: 1 },
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

  // Customer modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  panel: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    padding: 22, paddingBottom: 38,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
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
});
