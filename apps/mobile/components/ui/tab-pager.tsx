import React, { useState, useEffect } from 'react';
import { Dimensions, ScrollView, View as RNView, StyleProp, ViewStyle } from 'react-native';
import { View } from './view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabPagerProps {
  /** The data array to map over (e.g., TABS). */
  data: any[];
  /** Function to render content for each tab. */
  renderItem: (item: any, index: number) => React.ReactNode;
  /** Callback for scroll events, useful for syncing with tab headers. */
  onScroll?: (event: any) => void;
  /** Optional ref for programmatic scrolling control from parent. */
  scrollRef?: React.RefObject<ScrollView | null>;
  /** Style for each inner content container. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** The active tab index to control lazy rendering */
  activeTab?: number;
}

/**
 * A reusable horizontal pager component for tabbed content.
 * It handles paging, scroll events, and uniform item widths based on screen dimensions.
 */
export function TabPager({ 
  data, 
  renderItem, 
  onScroll, 
  scrollRef, 
  contentContainerStyle,
  activeTab = 0,
}: TabPagerProps) {
  // Keep track of which tabs have been rendered to avoid re-rendering heavy lists
  const [renderedTabs, setRenderedTabs] = useState<Set<number>>(new Set([activeTab]));

  useEffect(() => {
    setRenderedTabs((prev) => {
      const next = new Set(prev);
      next.add(activeTab);
      // Pre-render adjacent tabs for smoother swiping
      if (activeTab > 0) next.add(activeTab - 1);
      if (activeTab < data.length - 1) next.add(activeTab + 1);
      
      // Only update state if we actually added a new tab to avoid unnecessary renders
      return next.size > prev.size ? next : prev;
    });
  }, [activeTab, data.length]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      bounces={false}
    >
      {data.map((item, index) => (
        <RNView key={index} style={{ width: SCREEN_WIDTH }}>
          <View style={contentContainerStyle} variant="none">
            {renderedTabs.has(index) ? renderItem(item, index) : null}
          </View>
        </RNView>
      ))}
    </ScrollView>
  );
}
