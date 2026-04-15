import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].textSecondary,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].surface,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowRadius: 0,
          height: 74 + insets.bottom,
          paddingBottom: insets.bottom + 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'NunitoSans_600SemiBold',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(180, 159, 149, 0.12)' }
            ]}>
              <IconSymbol size={26} name="house.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: "Store",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(180, 159, 149, 0.12)' }
            ]}>
              <IconSymbol size={26} name="store" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(180, 159, 149, 0.12)' }
            ]}>
              <IconSymbol size={26} name="bag" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(180, 159, 149, 0.12)' }
            ]}>
              <IconSymbol size={26} name="heart" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(180, 159, 149, 0.12)' }
            ]}>
              <IconSymbol size={26} name="person.fill" color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    padding: 8,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
