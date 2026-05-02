import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import { DEFAULT_THEME_ID } from '@/constants/themes';
import { AppSettings } from '@/types/product';

const SETTINGS_KEY = '@mujahid:settings';

function generateSecurityKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const DEFAULT_SETTINGS: AppSettings = {
  exchangeRate: 14000,
  biometricEnabled: false,
  darkMode: 'system',
  themeId: DEFAULT_THEME_ID,
  appName: 'مجاهد للتجارة',
  pinEnabled: false,
  pinCode: '',
  securityKey: generateSecurityKey(),
  customerViewMode: false,
  lastBackupDate: undefined,
  autoLockMinutes: 0,
  lowStockThreshold: 5,
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  isLocked: boolean;
  lock: () => void;
  unlock: (pin?: string) => boolean;
  isLoading: boolean;
  effectiveDarkMode: 'light' | 'dark';
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark'>('light');
  const backgroundTimeRef = useRef<number | null>(null);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    loadSettings();
    if (Platform.OS !== 'web') {
      const { Appearance } = require('react-native');
      const scheme = Appearance.getColorScheme();
      setSystemColorScheme(scheme === 'dark' ? 'dark' : 'light');
      const sub = Appearance.addChangeListener(({ colorScheme }: any) => {
        setSystemColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
      });
      return () => sub?.remove?.();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === 'active') {
        const bg = backgroundTimeRef.current;
        if (bg !== null) {
          const elapsedMin = (Date.now() - bg) / 60000;
          const autoLock = settingsRef.current.autoLockMinutes ?? 0;
          const shouldLock =
            autoLock > 0 &&
            elapsedMin >= autoLock &&
            (settingsRef.current.pinEnabled || settingsRef.current.biometricEnabled);
          if (shouldLock) {
            setIsLocked(true);
          }
          backgroundTimeRef.current = null;
        }
      }
    });
    return () => sub.remove();
  }, []);

  async function loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed: AppSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        if (!parsed.securityKey) parsed.securityKey = generateSecurityKey();
        setSettings(parsed);
        settingsRef.current = parsed;
        if (parsed.pinEnabled && parsed.pinCode && Platform.OS !== 'web') {
          setIsLocked(true);
        } else if (parsed.biometricEnabled && Platform.OS !== 'web') {
          setIsLocked(true);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      settingsRef.current = next;
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlock = useCallback((pin?: string): boolean => {
    if (pin !== undefined) {
      const currentSettings = settingsRef.current;
      if (currentSettings.pinEnabled && currentSettings.pinCode) {
        if (pin !== currentSettings.pinCode) return false;
      }
    }
    setIsLocked(false);
    return true;
  }, []);

  const effectiveDarkMode: 'light' | 'dark' =
    settings.darkMode === 'system' ? systemColorScheme : settings.darkMode;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLocked, lock, unlock, isLoading, effectiveDarkMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
