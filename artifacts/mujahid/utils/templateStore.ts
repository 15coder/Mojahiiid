import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@mujahid:invoice_templates';

export interface TemplateItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  note: string;
  items: TemplateItem[];
  discountPct: number;
  discountFixed: number;
  createdAt: string;
}

export async function getTemplates(): Promise<InvoiceTemplate[]> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveTemplate(
  data: Omit<InvoiceTemplate, 'id' | 'createdAt'>
): Promise<InvoiceTemplate> {
  const templates = await getTemplates();
  const newTemplate: InvoiceTemplate = {
    ...data,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([newTemplate, ...templates]));
  return newTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates();
  await AsyncStorage.setItem(KEY, JSON.stringify(templates.filter((t) => t.id !== id)));
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  const templates = await getTemplates();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(templates.map((t) => (t.id === id ? { ...t, name } : t)))
  );
}
