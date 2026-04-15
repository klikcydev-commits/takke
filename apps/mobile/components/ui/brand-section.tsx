import { BRANDS } from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";
import { useIsFocused } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  AppState,
  AppStateStatus,
  InteractionManager,
  LayoutChangeEvent,
  View as RNView,
  StyleSheet,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { IconSymbol } from "./icon-symbol";
import { Skeleton } from "./skeleton";
import { Text } from "./text";

const DUPLICATION_COUNT = 10;

interface MarqueeRowProps {
  items: typeof BRANDS;
  speed: number;
  reverse?: boolean;
}

function MarqueeRow({ items, speed, reverse = false }: MarqueeRowProps) {
  const { colors } = useTheme();
  const offset = useSharedValue(0);
  const [contentWidth, setContentWidth] = useState(0);

  const isFocused = useIsFocused();

  // Repeat sufficiently to cover any screen width and allow seamless looping.
  // We need at least (screenWidth / contentWidth) + 1 copies.
  // Using 10x is safe for almost any realistic content and screen size.
  const duplicatedItems = useMemo(() => {
    return Array(DUPLICATION_COUNT).fill(items).flat();
  }, [items]);

  const startLoop = (distance: number) => {
    "worklet";
    const start = reverse ? -distance : 0;
    const end = reverse ? 0 : -distance;

    cancelAnimation(offset);
    offset.value = start;
    offset.value = withRepeat(
      withTiming(end, {
        duration: distance * speed,
        easing: Easing.linear,
      }),
      -1, // infinite
      false, // no reverse
    );
  };

  const resumeAnimation = () => {
    if (contentWidth <= 0) return;

    // Calculate current progress to resume seamlessly
    const end = reverse ? 0 : -contentWidth;
    const distanceLeft = Math.abs(end - offset.value);

    // If it's practically at the end, restart loop
    if (distanceLeft <= 0.5) {
      startLoop(contentWidth);
      return;
    }

    const durationLeft = distanceLeft * speed;

    offset.value = withTiming(
      end,
      { duration: durationLeft, easing: Easing.linear },
      (isFinished) => {
        if (isFinished) {
          startLoop(contentWidth);
        }
      },
    );
  };

  const pauseAnimation = () => {
    const currentValue = offset.value;
    cancelAnimation(offset);
    offset.value = currentValue;
  };

  useEffect(() => {
    if (contentWidth > 0) {
      if (isFocused) {
        resumeAnimation();
      } else {
        pauseAnimation();
      }
    }
    return () => {
      cancelAnimation(offset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentWidth, isFocused, reverse, speed]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && isFocused && contentWidth > 0) {
          resumeAnimation();
        } else if (nextAppState.match(/inactive|background/)) {
          pauseAnimation();
        }
      },
    );

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentWidth, isFocused, reverse, speed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleTouchStart = () => {
    pauseAnimation();
  };

  const handleTouchEnd = () => {
    if (isFocused && AppState.currentState === "active") {
      resumeAnimation();
    }
  };

  return (
    <RNView
      style={styles.rowWrapper}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 
          Hidden row for precise layout measurement of one dataset.
          Uses absolute position to not interfere with the actual marquee,
          and alignSelf: 'flex-start' to ensure it doesn't get capped by parent width.
      */}
      <RNView
        style={[
          styles.rowContainer,
          styles.measureRow,
          { opacity: 0, position: "absolute", alignSelf: "flex-start" },
        ]}
        onLayout={(e: LayoutChangeEvent) => {
          const width = e.nativeEvent.layout.width;
          if (width > 0 && Math.abs(width - contentWidth) > 0.1) {
            setContentWidth(width);
          }
        }}
      >
        {items.map((brand: (typeof BRANDS)[0], index: number) => (
          <RNView
            key={`measure-${brand.id}-${index}`}
            style={[
              styles.blockItem,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {brand.icon ? (
              <Image
                source={brand.icon}
                style={{
                  width: 16,
                  height: 16,
                  tintColor: colors.textPrimary,
                }}
                contentFit="contain"
              />
            ) : (
              <IconSymbol
                name="3d-rotate"
                size={16}
                color={colors.textPrimary}
              />
            )}
            <Text style={[styles.blockText, { color: colors.textPrimary }]}>
              {brand.name}
            </Text>
          </RNView>
        ))}
      </RNView>

      {/* Render the continuous moving track once measured */}
      {contentWidth > 0 && (
        <Animated.View
          style={[
            styles.rowContainer,
            animatedStyle,
            { alignSelf: "flex-start" },
          ]}
        >
          {duplicatedItems.map((brand: (typeof BRANDS)[0], index: number) => (
            <RNView
              key={`brand-${brand.id}-${index}`}
              style={[
                styles.blockItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {brand.icon ? (
                <Image
                  source={brand.icon}
                  style={{
                    width: 16,
                    height: 16,
                    tintColor: colors.textPrimary,
                  }}
                  contentFit="contain"
                />
              ) : (
                <IconSymbol
                  name="3d-rotate"
                  size={16}
                  color={colors.textPrimary}
                />
              )}
              <Text style={[styles.blockText, { color: colors.textPrimary }]}>
                {brand.name}
              </Text>
            </RNView>
          ))}
        </Animated.View>
      )}
    </RNView>
  );
}

interface BrandSectionProps {
  isLoading?: boolean;
}

export function BrandSection({ isLoading: propIsLoading }: BrandSectionProps) {
  const { colors, colorScheme } = useTheme();
  const [internalLoaded, setInternalLoaded] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setInternalLoaded(true);
    });
    return () => task.cancel();
  }, []);

  const isLoaded =
    propIsLoading !== undefined ? !propIsLoading : internalLoaded;

  // Split brands into two independent marquee rows
  const { topRowBrands, bottomRowBrands } = useMemo(() => {
    const midpoint = Math.ceil(BRANDS.length / 2);
    return {
      topRowBrands: BRANDS.slice(0, midpoint),
      bottomRowBrands: BRANDS.slice(midpoint),
    };
  }, []);

  const bgColor = colors.background;
  const transparentBg =
    colorScheme === "dark" ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)";

  if (!isLoaded) {
    return (
      <RNView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <RNView style={{ flexDirection: "row", paddingLeft: 24, gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={`row1-${i}`}
              width={i % 2 === 0 ? 120 : 90}
              height={38}
              borderRadius={8}
            />
          ))}
        </RNView>
        <RNView style={{ flexDirection: "row", paddingLeft: 40, gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={`row2-${i}`}
              width={i % 2 === 0 ? 95 : 110}
              height={38}
              borderRadius={8}
            />
          ))}
        </RNView>
      </RNView>
    );
  }

  return (
    <RNView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top row moves leftwards, bottom row moves rightwards slightly faster */}
      <MarqueeRow items={topRowBrands} speed={30} reverse={false} />
      <MarqueeRow items={bottomRowBrands} speed={25} reverse={true} />

      {/* Protective Edge Fading Masks */}
      <RNView style={styles.leftFade} pointerEvents="none">
        <LinearGradient
          colors={[bgColor, transparentBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </RNView>
      <RNView style={styles.rightFade} pointerEvents="none">
        <LinearGradient
          colors={[transparentBg, bgColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    position: "relative",
    overflow: "hidden",
    gap: 12,
  },
  rowWrapper: {
    width: "100%",
    height: 38, // Match skeleton height to prevent layout jump during measurement
  },
  rowContainer: {
    flexDirection: "row",
  },
  measureRow: {
    // No longer absolute/hidden to show content immediately while measuring
    zIndex: -1,
  },
  blockItem: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  blockText: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    letterSpacing: 0.5,
  },
  leftFade: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 48,
    zIndex: 10,
  },
  rightFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    zIndex: 10,
  },
});
