import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@mujahid:recently_viewed';
const MAX = 5;

export async function addToRecentlyViewed(productId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    const updated = [productId, ...ids.filter((id) => id !== productId)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function getRecentlyViewed(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function removeFromRecentlyViewed(productId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    await AsyncStorage.setItem(KEY, JSON.stringify(ids.filter((id) => id !== productId)));
  } catch {}
}

export async function clearRecentlyViewed(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
