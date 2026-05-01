import Fuse from 'fuse.js';
import { Product } from '@/types/product';

let fuseInstance: Fuse<Product> | null = null;

export function buildSearchIndex(products: Product[]): void {
  fuseInstance = new Fuse(products, {
    keys: ['name', 'barcode', 'notes'],
    threshold: 0.4,
    includeScore: true,
    useExtendedSearch: false,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
}

export function searchProducts(query: string, products: Product[]): Product[] {
  if (!query.trim()) return products;

  if (!fuseInstance) {
    buildSearchIndex(products);
  }

  const results = fuseInstance!.search(query);
  return results.map((r) => r.item);
}

export function rebuildIndex(products: Product[]): void {
  buildSearchIndex(products);
}
