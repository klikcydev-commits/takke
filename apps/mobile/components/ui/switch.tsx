import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: ViewStyle;
}

export function Switch({ value, onValueChange, style }: SwitchProps) {
  const { colors } = useTheme();
  // Animation value for position (from 0 to 1)
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 100,
    }).start();
  }, [value]);

  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18], // Position within the 40px track
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary + '40'],
  });

  return (
    <Pressable 
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        style,
        { opacity: pressed ? 0.9 : 1 }
      ]}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View 
          style={[
            styles.thumb, 
            { 
              transform: [{ translateX: thumbTranslateX }],
              backgroundColor: value ? colors.primary : '#FFFFFF',
            }
          ]} 
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    // NO SHADOW
    shadowColor: 'transparent',
    elevation: 0,
  },
});
