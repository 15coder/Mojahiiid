let pendingBarcode: string | null = null;

export function setScanResult(barcode: string) {
  pendingBarcode = barcode;
}

export function consumeScanResult(): string | null {
  const result = pendingBarcode;
  pendingBarcode = null;
  return result;
}
