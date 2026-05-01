import { useContext } from 'react';

import { getThemeById } from '@/constants/themes';
import { SettingsContext } from '@/context/SettingsContext';

export function useColors() {
  const ctx = useContext(SettingsContext as any) as any;

  const darkMode: 'light' | 'dark' = ctx?.effectiveDarkMode ?? 'light';
  const themeId: string = ctx?.settings?.themeId ?? 'ocean';

  const theme = getThemeById(themeId);
  const palette = darkMode === 'dark' ? theme.dark : theme.light;

  const base =
    darkMode === 'dark'
      ? {
          text: '#E8ECF4',
          tint: palette.primary,
          foreground: '#E8ECF4',
          cardForeground: '#E8ECF4',
          mutedForeground: '#8A9BB5',
          destructive: '#EF4444',
          destructiveForeground: '#FFFFFF',
          successForeground: '#FFFFFF',
          warning: '#F59E0B',
          warningForeground: '#FFFFFF',
          silver: '#607B9E',
          surface: palette.card,
        }
      : {
          text: '#0D1B3E',
          tint: palette.primary,
          foreground: '#0D1B3E',
          cardForeground: '#0D1B3E',
          mutedForeground: '#6B7A99',
          destructive: '#DC2626',
          destructiveForeground: '#FFFFFF',
          successForeground: '#FFFFFF',
          warning: '#D97706',
          warningForeground: '#FFFFFF',
          silver: '#8094B4',
          surface: palette.card,
        };

  return {
    ...base,
    ...palette,
    radius: 12,
  };
}
