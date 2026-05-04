export function formatArabicDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatArabicDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatArabicDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getBackupFileName(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `نسخة_${y}-${m}-${d}_${h}${min}${s}.json`;
}

export function formatPrice(value: number, currency: 'SYP' | 'USD'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return (
    new Intl.NumberFormat('ar-SY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value) + ' ل.س.ق'
  );
}

export function formatNewSYP(value: number): string {
  return (
    new Intl.NumberFormat('ar-SY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(value / 100)) + ' ل.س.ج'
  );
}

export function formatPriceCurrency(
  value: number,
  displayCurrency: 'SYP_NEW' | 'SYP_OLD' | 'USD'
): string {
  if (displayCurrency === 'USD') {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (displayCurrency === 'SYP_OLD') {
    return (
      new Intl.NumberFormat('ar-SY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ل.س.ق'
    );
  }
  return (
    new Intl.NumberFormat('ar-SY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(value / 100)) + ' ل.س.ج'
  );
}
