import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';

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
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  isLocked: boolean;
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

  async function loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed: AppSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        if (!parsed.securityKey) parsed.securityKey = generateSecurityKey();
        setSettings(parsed);
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
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const unlock = useCallback((pin?: string): boolean => {
    if (pin !== undefined) {
      const currentSettings = settings;
      if (currentSettings.pinEnabled && currentSettings.pinCode) {
        if (pin !== currentSettings.pinCode) return false;
      }
    }
    setIsLocked(false);
    return true;
  }, [settings]);

  const effectiveDarkMode: 'light' | 'dark' =
    settings.darkMode === 'system' ? systemColorScheme : settings.darkMode;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLocked, unlock, isLoading, effectiveDarkMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
