import Fuse from 'fuse.js';
import { Product } from '@/types/product';

let fuseInstance: Fuse<Product> | null = null;
let lastProductsLength = -1;
let lastProductsHash = '';

function getProductsHash(products: Product[]): string {
  return products.map(p => p.id).join(',');
}

export function buildSearchIndex(products: Product[]): void {
  fuseInstance = new Fuse(products, {
    keys: ['name', 'barcode', 'notes'],
    threshold: 0.35,
    includeScore: true,
    useExtendedSearch: false,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
  lastProductsLength = products.length;
  lastProductsHash = getProductsHash(products);
}

export function searchProducts(query: string, products: Product[]): Product[] {
  if (!query.trim()) return products;
  if (products.length === 0) return [];

  const currentHash = getProductsHash(products);
  if (!fuseInstance || lastProductsLength !== products.length || lastProductsHash !== currentHash) {
    buildSearchIndex(products);
  }

  const results = fuseInstance!.search(query);
  return results.map((r) => r.item);
}

export function rebuildIndex(products: Product[]): void {
  buildSearchIndex(products);
}
