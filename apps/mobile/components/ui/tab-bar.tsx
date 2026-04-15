import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import React, { useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface TabBarProps {
  /** Array of string labels for the tabs. */
  tabs: string[];
  /** The currently active tab index. */
  activeTab: number;
  /** Callback when a tab is pressed. */
  onTabPress: (index: number) => void;
}

/**
 * A reusable horizontal tab bar with auto-centering functionality.
 */
export function TabBar({ tabs, activeTab, onTabPress }: TabBarProps) {
  const { colors } = useTheme();
  const tabScrollRef = useRef<ScrollView>(null);
  
  // Track layouts for centering the active tab
  const tabPositions = useRef<{ [key: number]: number }>({});
  const tabWidths = useRef<{ [key: number]: number }>({});

  useEffect(() => {
    // Scroll the tab bar to keep the active tab visible with centering
    const posX = tabPositions.current[activeTab] || 0;
    const tabW = tabWidths.current[activeTab] || 0;
    const scrollX = Math.max(0, posX - (width / 2) + (tabW / 2));
    tabScrollRef.current?.scrollTo({ x: scrollX, animated: true });
  }, [activeTab]);

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContent}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => onTabPress(index)}
              onLayout={(e) => {
                tabPositions.current[index] = e.nativeEvent.layout.x;
                tabWidths.current[index] = e.nativeEvent.layout.width;
              }}
              style={[
                styles.tab,
                isActive && { backgroundColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.tabText,
                isActive && { color: colors.buttonText, fontFamily: 'NunitoSans_700Bold' }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    zIndex: 10,
    paddingVertical: 12,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 99,
    marginRight: 8,
  },
  tabText: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'NunitoSans_600SemiBold',
  },
});
