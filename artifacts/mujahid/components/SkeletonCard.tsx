import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

function SkeletonBox({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  radius?: number;
  style?: any;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ grid }: { grid?: boolean }) {
  const colors = useColors();

  if (grid) {
    return (
      <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SkeletonBox width={64} height={64} radius={12} />
        <SkeletonBox height={14} width="80%" />
        <SkeletonBox height={11} width="50%" />
        <SkeletonBox height={18} width="65%" />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonBox width={72} height={72} radius={12} />
      <View style={styles.content}>
        <SkeletonBox height={16} width="68%" />
        <SkeletonBox height={11} width="38%" />
        <View style={styles.pricesRow}>
          <SkeletonBox height={20} width="44%" />
          <SkeletonBox height={20} width="44%" />
        </View>
        <SkeletonBox height={10} width="52%" />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 6, grid }: { count?: number; grid?: boolean }) {
  if (grid) {
    return (
      <View style={styles.gridWrap}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.gridItemWrap}>
            <SkeletonCard grid />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 6, paddingHorizontal: 12, paddingTop: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  content: {
    flex: 1,
    gap: 8,
    alignItems: 'flex-end',
  },
  pricesRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'flex-end',
  },
  gridCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    alignItems: 'center',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  gridItemWrap: {
    flex: 1,
    minWidth: 140,
  },
});
