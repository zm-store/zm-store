import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import { COLORS } from '@/constants/Colors';

function SkeletonLine({ width, height = 14 }: { width: number | `${number}%`; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: COLORS.surfaceSecondary,
        opacity,
      }}
    />
  );
}

export function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 16 }}>
      {/* Banner skeleton */}
      <SkeletonLine width={'100%' as `${number}%`} height={160} />
      <View style={{ height: 24 }} />
      {/* Section header */}
      <SkeletonLine width={120} height={18} />
      <View style={{ height: 12 }} />
      {/* Grid skeletons */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <SkeletonLine width={'100%' as `${number}%`} height={100} />
            <View style={{ height: 8 }} />
            <SkeletonLine width={'80%' as `${number}%`} height={12} />
          </View>
        ))}
      </View>
      <View style={{ height: 24 }} />
      <SkeletonLine width={140} height={18} />
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <SkeletonLine width={'100%' as `${number}%`} height={140} />
            <View style={{ height: 8 }} />
            <SkeletonLine width={'70%' as `${number}%`} height={12} />
            <View style={{ height: 4 }} />
            <SkeletonLine width={'50%' as `${number}%`} height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: 16,
        height: 200,
        opacity,
      }}
    />
  );
}
