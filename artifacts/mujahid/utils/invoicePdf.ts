import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { SavedInvoice } from './invoiceStore';

function fmt(n: number, dec = 0): string {
  return n.toLocaleString('en-US', {
    maximumFractionDigits: dec,
    minimumFractionDigits: dec,
  });
}

export async function generateAndShareInvoicePdf(invoice: SavedInvoice): Promise<void> {
  const totalSYP = invoice.totalSYP;
  const totalSYJ = Math.round(totalSYP / 100);
  const totalUSD = invoice.exchangeRate > 0 ? totalSYP / invoice.exchangeRate : 0;
  const syjRate = Math.round(invoice.exchangeRate / 100);

  const itemsHtml = invoice.items
    .map(
      (item, i) => `
      <div class="item-row">
        ${i + 1} : ${item.name} &times; ${item.qty} &nbsp; قيمة إجمالية ${fmt(item.unitPriceSYP * item.qty)} ل.س.ق
      </div>`
    )
    .join('');

  const customerLine = invoice.customerName
    ? `<div>اسم الزبون : ${invoice.customerName}</div>`
    : '';
  const notesLine = invoice.notes
    ? `<div>ملاحظات : ${invoice.notes}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Arial', sans-serif;
      direction: rtl;
      background: #ffffff;
      padding: 48px 44px;
      color: #1a1a2e;
      font-size: 15px;
      line-height: 1.8;
      max-width: 620px;
      margin: 0 auto;
    }
    .store-name {
      text-align: center;
      font-size: 40px;
      font-weight: 800;
      color: #1B2E5E;
      font-style: italic;
      letter-spacing: -0.5px;
      margin-bottom: 22px;
    }
    .divider-heavy {
      border: none;
      border-top: 2.5px solid #1B2E5E;
      margin-bottom: 20px;
    }
    .divider-light {
      border: none;
      border-top: 1px solid #d0d4de;
      margin: 18px 0;
    }
    .meta {
      text-align: right;
      margin-bottom: 20px;
      font-size: 15px;
    }
    .meta div { margin-bottom: 3px; }
    .items-section { margin-bottom: 4px; }
    .item-row {
      text-align: right;
      padding: 5px 0;
      font-size: 15px;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-20deg);
      font-size: 68px;
      font-weight: 800;
      color: rgba(27, 46, 94, 0.055);
      white-space: nowrap;
      pointer-events: none;
      font-style: italic;
      z-index: -1;
    }
    .total-line {
      text-align: right;
      font-size: 16px;
      font-weight: 700;
      margin: 18px 0;
    }
    .exchange-bar {
      border-top: 1.5px solid #d0d4de;
      border-bottom: 1.5px solid #d0d4de;
      padding: 11px 0;
      font-size: 14px;
      text-align: right;
      color: #555;
      margin-bottom: 30px;
    }
    .footer {
      text-align: center;
      font-size: 13px;
      color: #999;
      border-top: 1px solid #e5e7eb;
      padding-top: 18px;
    }
    .footer .hl { color: #1B2E5E; font-weight: 700; }
  </style>
</head>
<body>
  <div class="watermark">مجاهد للتجارة</div>
  <div class="store-name">مجاهـد للتجـارة</div>
  <hr class="divider-heavy">
  <div class="meta">
    <div>فاتورة رقم ${invoice.number}</div>
    ${customerLine}
    ${notesLine}
  </div>
  <hr class="divider-heavy">
  <div class="items-section">
    ${itemsHtml}
  </div>
  <hr class="divider-light">
  <div class="total-line">
    الإجمالي : ${fmt(totalSYP)} ل.س.ق &nbsp;|&nbsp; ${fmt(totalSYJ)} ل.س.ج &nbsp;|&nbsp; ${fmt(totalUSD, 2)} دولار
  </div>
  <div class="exchange-bar">
    سعر الصرف الحالي : 1 دولار = ${fmt(invoice.exchangeRate)} ل.س.ق &nbsp;|&nbsp; ${fmt(syjRate)} ل.س.ج
  </div>
  <div class="footer">
    تم إنشاء الملف عبر تطبيق <span class="hl">"مجاهد للتجارة"</span> . من برمجة <span class="hl">"نداء الرحمن عبود"</span>
  </div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `فاتورة رقم ${invoice.number}`,
    });
  }
}
