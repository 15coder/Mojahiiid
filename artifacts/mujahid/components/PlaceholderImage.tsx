import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface Props {
  size?: number;
  style?: object;
}

export function PlaceholderImage({ size = 80, style }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.12,
          backgroundColor: colors.secondary,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.45, color: colors.primary }]}>
        م
      </Text>
      <Text style={[styles.label, { fontSize: size * 0.13, color: colors.silver }]}>
        مجاهد
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  letter: {
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
