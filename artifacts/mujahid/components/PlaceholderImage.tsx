import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

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
          borderRadius: size * 0.22,
          backgroundColor: colors.secondary,
        },
        style,
      ]}
    >
      <Image
        source={require('@/assets/images/icon.png')}
        style={{ width: size * 0.75, height: size * 0.75 }}
        contentFit="contain"
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
