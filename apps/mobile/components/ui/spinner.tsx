import React, { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 60, color = "white" }: SpinnerProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const dotCount = 12;
  const dotRadius = size * 0.05;
  const orbitRadius = (size - dotRadius * 4) / 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Animated.View
      style={animatedStyle}
      accessible
      accessibilityRole="progressbar"
      aria-label="Loading"
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: dotCount }).map((_, i) => {
            const angle = (i * 360) / dotCount;
            const rad = (angle * Math.PI) / 180;
            const opacity = 0.2 + (i / dotCount) * 0.8;
            return (
              <Circle
                key={i}
                cx={cx + orbitRadius * Math.cos(rad)}
                cy={cy + orbitRadius * Math.sin(rad)}
                r={dotRadius}
                fill={color}
                opacity={opacity}
              />
            );
          })}
        </Svg>
      </View>
    </Animated.View>
  );
}
