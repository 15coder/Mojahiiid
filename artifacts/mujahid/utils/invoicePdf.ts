import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { SavedInvoice } from './invoiceStore';

const FOOTER_NOTE = 'هذا التطبيق من برمجة "نداء الرحمن عبّود"';

function fmt(v: number): string {
  return new Intl.NumberFormat('ar-SY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function buildInvoiceHtml(
  inv: SavedInvoice,
  storeName: string,
  exchangeRate: number
): string {
  const totalOld = inv.finalTotalSYP ?? inv.totalSYP;
  const totalNew = Math.floor(totalOld / 100);
  const totalUSD = exchangeRate > 0 ? totalOld / exchangeRate : 0;
  const hasDiscount =
    (inv.discountPct && inv.discountPct > 0) ||
    (inv.discountFixed && inv.discountFixed > 0);

  const itemRows = inv.items
    .map((item, i) => {
      const subOld = item.sellingPriceSYP * item.qty;
      const subNew = Math.floor(subOld / 100);
      return `
      <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="cell-num">${i + 1}</td>
        <td class="cell-name">${item.name}</td>
        <td class="cell-center">${item.qty}</td>
        <td class="cell-price">${fmt(item.sellingPriceSYP)}</td>
        <td class="cell-price">${fmt(subOld)}</td>
        <td class="cell-price">${fmt(subNew)}</td>
      </tr>`;
    })
    .join('');

  const discountBlock = hasDiscount
    ? `
    <tr class="summary-row">
      <td colspan="4" class="summary-label">المجموع قبل الخصم</td>
      <td class="summary-value">${fmt(inv.totalSYP)}</td>
      <td class="summary-value">${fmt(Math.floor(inv.totalSYP / 100))}</td>
    </tr>
    <tr class="discount-row">
      <td colspan="4" class="summary-label discount-label">
        ${inv.discountPct ? `خصم ${inv.discountPct}%` : ''}
        ${inv.discountFixed ? `خصم ثابت: ${fmt(inv.discountFixed)} ل.س.ق` : ''}
      </td>
      <td class="summary-value discount-value">- ${fmt(inv.totalSYP - totalOld)}</td>
      <td class="summary-value discount-value">- ${fmt(Math.floor((inv.totalSYP - totalOld) / 100))}</td>
    </tr>`
    : '';

  const clientBlock =
    inv.name || inv.note
      ? `
    <div class="client-box">
      ${inv.name ? `<div class="client-row"><span class="client-label">العميل:</span><span class="client-value">${inv.name}</span></div>` : ''}
      ${inv.note ? `<div class="client-row"><span class="client-label">ملاحظة:</span><span class="client-value">${inv.note}</span></div>` : ''}
    </div>`
      : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>فاتورة #${inv.number}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Cairo', 'Arial', sans-serif;
    background: #f8f9fa;
    color: #1a1a2e;
    direction: rtl;
    font-size: 13px;
  }

  .page {
    max-width: 800px;
    margin: 0 auto;
    background: #ffffff;
    min-height: 100vh;
    padding: 0;
    box-shadow: 0 0 40px rgba(0,0,0,0.1);
  }

  /* ─── HEADER ─────────────────────────── */
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%);
    padding: 28px 32px 24px;
    color: white;
    position: relative;
    overflow: hidden;
  }

  .header::before {
    content: '';
    position: absolute;
    top: -40px; left: -40px;
    width: 180px; height: 180px;
    background: rgba(255,255,255,0.06);
    border-radius: 50%;
  }

  .header::after {
    content: '';
    position: absolute;
    bottom: -60px; right: -30px;
    width: 200px; height: 200px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
  }

  .header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative; z-index: 1;
  }

  .store-block { display: flex; align-items: center; gap: 14px; }

  .store-logo {
    width: 56px; height: 56px;
    background: rgba(255,255,255,0.18);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    font-weight: 900;
    color: white;
    border: 2px solid rgba(255,255,255,0.3);
    flex-shrink: 0;
  }

  .store-name {
    font-size: 22px;
    font-weight: 900;
    color: white;
    letter-spacing: 0.5px;
  }

  .store-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.7);
    margin-top: 3px;
  }

  .inv-meta { text-align: left; }

  .inv-number {
    font-size: 28px;
    font-weight: 900;
    color: white;
    direction: ltr;
  }

  .inv-number-label {
    font-size: 11px;
    color: rgba(255,255,255,0.65);
    text-align: center;
    margin-bottom: 2px;
  }

  .inv-date {
    font-size: 12px;
    color: rgba(255,255,255,0.8);
    text-align: left;
    margin-top: 4px;
  }

  /* ─── BODY ───────────────────────────── */
  .body { padding: 24px 32px; }

  /* Client box */
  .client-box {
    background: #f0f7ff;
    border: 1px solid #c8e0f8;
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 20px;
  }

  .client-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 3px 0;
  }

  .client-label {
    font-size: 12px;
    color: #5580a4;
    font-weight: 600;
    min-width: 60px;
  }

  .client-value {
    font-size: 13px;
    font-weight: 700;
    color: #1e3a5f;
  }

  /* ─── TABLE ──────────────────────────── */
  .table-wrap {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2eaf3;
    margin-bottom: 20px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: #1e3a5f;
    color: white;
  }

  thead th {
    padding: 11px 10px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
  }

  .cell-num { text-align: center; width: 36px; }
  .cell-name { text-align: right; padding-right: 14px !important; }
  .cell-center { text-align: center; }
  .cell-price { text-align: center; font-weight: 600; }

  .row-even { background: #ffffff; }
  .row-odd  { background: #f7fafd; }

  tbody td {
    padding: 10px 10px;
    font-size: 12.5px;
    border-bottom: 1px solid #eef3f8;
  }

  /* Summary rows */
  .summary-row td { background: #f0f7ff; font-weight: 600; }
  .summary-label { text-align: right; padding-right: 14px !important; color: #444; font-size: 12px; }
  .summary-value { text-align: center; color: #1e3a5f; font-weight: 700; }

  .discount-row td { background: #fff5f5; }
  .discount-label { color: #c0392b; }
  .discount-value { color: #c0392b; }

  .total-row td { background: #1e3a5f; color: white; font-weight: 900; }
  .total-label { text-align: right; padding-right: 14px !important; font-size: 13px; }
  .total-value { text-align: center; font-size: 14px; }
  .total-highlight { font-size: 16px; }

  /* ─── TOTALS SUMMARY BOX ─────────────── */
  .totals-box {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .total-card {
    flex: 1;
    border-radius: 12px;
    padding: 14px 16px;
    text-align: center;
  }

  .total-card.primary {
    background: linear-gradient(135deg, #1e3a5f, #2d6a9f);
    color: white;
  }

  .total-card.secondary {
    background: #f0f7ff;
    border: 1px solid #c8e0f8;
    color: #1e3a5f;
  }

  .total-card.usd {
    background: #f0fff4;
    border: 1px solid #b2dfdb;
    color: #1a5c40;
  }

  .total-card-label {
    font-size: 11px;
    opacity: 0.75;
    margin-bottom: 6px;
    font-weight: 600;
  }

  .total-card-value {
    font-size: 18px;
    font-weight: 900;
  }

  .total-card-sub {
    font-size: 10px;
    opacity: 0.65;
    margin-top: 3px;
  }

  /* ─── EXCHANGE RATE ──────────────────── */
  .rate-bar {
    background: #fafafa;
    border: 1px solid #e8edf3;
    border-radius: 10px;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    font-size: 12px;
    color: #666;
  }

  .rate-bar span { font-weight: 700; color: #1e3a5f; }

  /* ─── FOOTER ─────────────────────────── */
  .footer {
    border-top: 2px solid #e8edf3;
    padding: 18px 32px 24px;
    text-align: center;
  }

  .footer-note {
    font-size: 11.5px;
    color: #888;
    margin-bottom: 6px;
  }

  .footer-brand {
    font-size: 12px;
    font-weight: 700;
    color: #1e3a5f;
    opacity: 0.6;
  }

  .badge-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
  }

  .badge {
    background: #f0f7ff;
    border: 1px solid #c8e0f8;
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 11px;
    color: #2d6a9f;
    font-weight: 600;
  }

  @media print {
    body { background: white; }
    .page { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-inner">
      <div class="store-block">
        <div class="store-logo">${storeName.charAt(0)}</div>
        <div>
          <div class="store-name">${storeName}</div>
          <div class="store-sub">فاتورة مبيعات</div>
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-number-label">رقم الفاتورة</div>
        <div class="inv-number">#${inv.number}</div>
        <div class="inv-date">${fmtDate(inv.createdAt)}<br/>${fmtTime(inv.createdAt)}</div>
      </div>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    ${clientBlock}

    <!-- ITEMS TABLE -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="cell-num">#</th>
            <th class="cell-name">اسم المنتج</th>
            <th class="cell-center">الكمية</th>
            <th class="cell-price">سعر القطعة (ل.س.ق)</th>
            <th class="cell-price">المجموع (ل.س.ق)</th>
            <th class="cell-price">المجموع (ل.س.ج)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${discountBlock}
          <tr class="total-row">
            <td colspan="4" class="total-label">الإجمالي النهائي</td>
            <td class="total-value total-highlight">${fmt(totalOld)}<br/><small style="font-size:10px;opacity:0.8">ل.س.ق</small></td>
            <td class="total-value total-highlight">${fmt(totalNew)}<br/><small style="font-size:10px;opacity:0.8">ل.س.ج</small></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TOTALS CARDS -->
    <div class="totals-box">
      <div class="total-card primary">
        <div class="total-card-label">الإجمالي القديم</div>
        <div class="total-card-value">${fmt(totalOld)}</div>
        <div class="total-card-sub">ليرة سورية قديمة</div>
      </div>
      <div class="total-card secondary">
        <div class="total-card-label">الإجمالي الجديد</div>
        <div class="total-card-value">${fmt(totalNew)}</div>
        <div class="total-card-sub">ليرة سورية جديدة</div>
      </div>
      ${exchangeRate > 0 ? `
      <div class="total-card usd">
        <div class="total-card-label">بالدولار</div>
        <div class="total-card-value">${totalUSD.toFixed(2)}</div>
        <div class="total-card-sub">USD</div>
      </div>` : ''}
    </div>

    <!-- EXCHANGE RATE BAR -->
    ${exchangeRate > 0 ? `
    <div class="rate-bar">
      <span>سعر صرف الدولار</span>
      <span>1 USD = ${fmt(exchangeRate)} ل.س.ق = ${fmt(Math.floor(exchangeRate / 100))} ل.س.ج</span>
    </div>` : ''}

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-note">شكراً لتعاملكم معنا</div>
    <div class="badge-row">
      <div class="badge">${inv.items.length} منتج</div>
      <div class="badge">فاتورة #${inv.number}</div>
      <div class="badge">${fmtDate(inv.createdAt)}</div>
    </div>
    <div class="footer-brand" style="margin-top:14px">${FOOTER_NOTE}</div>
  </div>

</div>
</body>
</html>`;
}

export async function exportInvoicePdf(
  inv: SavedInvoice,
  storeName: string,
  exchangeRate: number,
  mode: 'save' | 'share'
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = buildInvoiceHtml(inv, storeName, exchangeRate);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    if (mode === 'share') {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) return { success: false, error: 'المشاركة غير متاحة على هذا الجهاز' };
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `فاتورة #${inv.number}`,
        UTI: 'com.adobe.pdf',
      });
      return { success: true };
    }

    // Save to Downloads
    if (Platform.OS === 'android') {
      const destDir = FileSystem.documentDirectory + 'Invoices/';
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const fileName = `فاتورة_${inv.number}_${new Date().getFullYear()}.pdf`;
      const dest = destDir + fileName;
      await FileSystem.copyAsync({ from: uri, to: dest });
      // Also share so user can save to downloads
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dest, {
          mimeType: 'application/pdf',
          dialogTitle: `حفظ فاتورة #${inv.number}`,
          UTI: 'com.adobe.pdf',
        });
      }
      return { success: true };
    } else {
      // iOS — share directly (user can save to Files)
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `فاتورة #${inv.number}`,
          UTI: 'com.adobe.pdf',
        });
      }
      return { success: true };
    }
  } catch (e: any) {
    return { success: false, error: e?.message || 'حدث خطأ أثناء إنشاء PDF' };
  }
}
