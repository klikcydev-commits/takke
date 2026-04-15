import { useTheme } from "@/hooks/use-theme";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Skeleton } from "./skeleton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CarouselProps {
  images: ImageSourcePropType[];
  height?: number;
  borderRadius?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  isLoading?: boolean;
}

export function Carousel({
  images,
  height = 200,
  borderRadius = 16,
  autoPlay = true,
  autoPlayInterval = 3000,
  isLoading = false,
}: CarouselProps) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const timerId = setInterval(() => {
      if (isDragging.current) return;
      const nextIndex = (activeIndex + 1) % images.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
    }, autoPlayInterval);

    return () => clearInterval(timerId);
  }, [activeIndex, autoPlay, autoPlayInterval, images.length]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < images.length) {
      setActiveIndex(index);
    }
  };

  const slideHeight = height - 10;
  // isLoading = true;
  return (
    <View style={[styles.container, { height: height + 30 }]}>
      <View style={{ height: slideHeight }}>
        {isLoading ? (
          <View style={[styles.slide, { height: slideHeight }]}>
            <Skeleton
              width={SCREEN_WIDTH - 40}
              height={slideHeight}
              borderRadius={borderRadius}
            />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => {
              isDragging.current = true;
            }}
            onScrollEndDrag={() => {
              isDragging.current = false;
            }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={{ height: slideHeight }}
          >
            {images.map((img, index) => (
              <View key={index} style={[styles.slide, { height: slideHeight }]}>
                <Image
                  source={img}
                  style={[styles.image, { borderRadius, height: slideHeight }]}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Pill Indicator - Moved under the banners with gap */}
      <View style={[styles.indicatorWrapper, { marginTop: 8 }]}>
        {images.map((_, index) => (
          <View key={index} style={styles.pill}>
            {isLoading ? (
              <Skeleton width="100%" height="100%" borderRadius={1.5} />
            ) : (
              <View
                style={[
                  styles.pillFill,
                  {
                    backgroundColor: colors.textPrimary,
                    opacity: index === activeIndex ? 1 : 0.25,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    resizeMode: "cover",
  },
  indicatorWrapper: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    height: 3,
    width: 12,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  pillFill: {
    flex: 1,
    borderRadius: 1.5,
  },
});
