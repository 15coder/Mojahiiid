import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface Props {
  size?: number;
  style?: object;
  categoryIcon?: string;
  categoryColor?: string;
}

export function PlaceholderImage({ size = 80, style, categoryIcon, categoryColor }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: categoryColor ? categoryColor + '18' : colors.secondary,
          borderWidth: 1,
          borderColor: categoryColor ? categoryColor + '30' : colors.border,
        },
        style,
      ]}
    >
      <Ionicons
        name={(categoryIcon as any) || 'cube-outline'}
        size={size * 0.48}
        color={categoryColor || colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
