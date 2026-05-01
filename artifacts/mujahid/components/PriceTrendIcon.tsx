import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { TrendDirection } from '@/utils/priceUtils';

interface Props {
  trend: TrendDirection;
  size?: number;
}

export function PriceTrendIcon({ trend, size = 14 }: Props) {
  const colors = useColors();

  if (trend === 'neutral') return null;

  const isUp = trend === 'up';
  const color = isUp ? colors.destructive : colors.success;
  const icon = isUp ? 'arrow-up' : 'arrow-down';

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
