import React, { useEffect } from 'react';
import { ViewStyle, StyleProp, DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  children?: React.ReactNode;
}

export function Skeleton({ style, width, height, borderRadius = 8, children }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        animatedStyle,
        {
          backgroundColor: colors.border,
          width,
          height,
          borderRadius,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}