import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF',
  '#FF8B94', '#6C5CE7', '#FDCB6E', '#74B9FF',
  '#55EFC4', '#FD79A8', '#E17055', '#00B894',
];
const COUNT = 55;

interface Particle {
  prog: Animated.Value;
  x0: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rot: number;
  isSquare: boolean;
  delay: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: COUNT }).map((_, i) => ({
    prog: new Animated.Value(0),
    x0: W * 0.3 + Math.random() * W * 0.4,
    vx: (Math.random() - 0.5) * 300,
    vy: -(160 + Math.random() * 320),
    color: COLORS[i % COLORS.length],
    size: 5 + Math.random() * 8,
    rot: (Math.random() - 0.5) * 720,
    isSquare: i % 3 !== 0,
    delay: Math.random() * 120,
  }));
}

export function ConfettiEffect({ visible, onDone }: { visible: boolean; onDone?: () => void }) {
  const particles = useRef<Particle[]>(makeParticles()).current;

  useEffect(() => {
    if (!visible) return;

    particles.forEach((p) => p.prog.setValue(0));

    const anims = particles.map((p) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.prog, {
          toValue: 1,
          duration: 950 + Math.random() * 200,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(anims).start(() => onDone?.());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            top: H * 0.65,
            width: p.size,
            height: p.size,
            borderRadius: p.isSquare ? 2 : p.size / 2,
            backgroundColor: p.color,
            opacity: p.prog.interpolate({
              inputRange: [0, 0.55, 1],
              outputRange: [1, 1, 0],
            }),
            transform: [
              {
                translateX: p.prog.interpolate({
                  inputRange: [0, 1],
                  outputRange: [p.x0, p.x0 + p.vx],
                }),
              },
              {
                translateY: p.prog.interpolate({
                  inputRange: [0, 0.55, 1],
                  outputRange: [0, p.vy, p.vy + 160],
                }),
              },
              {
                rotate: p.prog.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${p.rot}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
