import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

export interface SpeedDialAction {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface SpeedDialProps {
  actions: SpeedDialAction[];
  bottom?: number;
  right?: number;
}

export function SpeedDial({ actions, bottom = 24, right = 20 }: SpeedDialProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const mainRotate = useSharedValue(0);
  const mainScale = useSharedValue(1);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainScale.value }, { rotate: `${mainRotate.value}deg` }],
  }));

  function toggle() {
    const next = !open;
    setOpen(next);
    mainRotate.value = withSpring(next ? 45 : 0, { damping: 28, stiffness: 280 });
    mainScale.value = withSpring(next ? 0.94 : 1, { damping: 28, stiffness: 280 });
    if (next) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handleAction(action: SpeedDialAction) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(false);
    mainRotate.value = withSpring(0, { damping: 28, stiffness: 280 });
    mainScale.value = withSpring(1, { damping: 28, stiffness: 280 });
    setTimeout(() => action.onPress(), 80);
  }

  function close() {
    setOpen(false);
    mainRotate.value = withSpring(0, { damping: 28, stiffness: 280 });
    mainScale.value = withSpring(1, { damping: 28, stiffness: 280 });
  }

  return (
    <>
      {open && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
      )}
      <View style={[styles.container, { bottom, right }]}>
        {open &&
          [...actions].reverse().map((action, revIdx) => {
            const i = actions.length - 1 - revIdx;
            return (
              <Animated.View
                key={i}
                entering={FadeIn.delay(revIdx * 30).duration(200)}
                exiting={FadeOut.duration(120)}
                style={styles.miniRow}
              >
                <View
                  style={[
                    styles.miniLabel,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.miniLabelText, { color: colors.foreground }]}>
                    {action.label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleAction(action)}
                  style={({ pressed }) => [
                    styles.miniFab,
                    {
                      backgroundColor: action.color || colors.secondary,
                      borderColor: action.color || colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={20}
                    color={action.color ? '#fff' : colors.primary}
                  />
                </Pressable>
              </Animated.View>
            );
          })}

        <Animated.View style={[styles.mainFab, { backgroundColor: colors.primary }, mainStyle]}>
          <Pressable onPress={toggle} style={styles.mainFabInner}>
            <Ionicons name="add" size={28} color={colors.primaryForeground} />
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 98,
  },
  container: {
    position: 'absolute',
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 99,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniLabel: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  miniLabelText: {
    fontSize: 13,
    fontFamily: 'Tajawal_500Medium',
  },
  miniFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  mainFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
    overflow: 'hidden',
  },
  mainFabInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
