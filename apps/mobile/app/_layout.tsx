import IntroScreen from "@/components/auth/IntroScreen";
import { Spinner } from "@/components/ui/spinner";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/ctx/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeepLinking } from "@/hooks/useDeepLinking";
import AuthProvider from "@/providers/AuthProvider";
import { useLayoutStore } from "@/store/useLayoutStore";
import {
  NunitoSans_400Regular,
  NunitoSans_400Regular_Italic,
  NunitoSans_600SemiBold,
  NunitoSans_600SemiBold_Italic,
  NunitoSans_700Bold,
  NunitoSans_700Bold_Italic,
  NunitoSans_800ExtraBold,
  NunitoSans_800ExtraBold_Italic,
} from "@expo-google-fonts/nunito-sans";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutNav() {
  const { session, loading, profile } = useAuth();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const setInsets = useLayoutStore((state) => state.setInsets);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (insets.top > 0 || insets.bottom > 0) {
      setInsets(insets);
    }
  }, [insets, setInsets]);

  const [loaded, error] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_400Regular_Italic,
    NunitoSans_600SemiBold,
    NunitoSans_600SemiBold_Italic,
    NunitoSans_700Bold,
    NunitoSans_700Bold_Italic,
    NunitoSans_800ExtraBold,
    NunitoSans_800ExtraBold_Italic,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const themeProviderValue = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: Colors[colorScheme ?? "light"].primary,
      background: Colors[colorScheme ?? "light"].background,
      card: Colors[colorScheme ?? "light"].surface,
      text: Colors[colorScheme ?? "light"].textPrimary,
      border: Colors[colorScheme ?? "light"].border,
    },
  };

  // Handle deep linking for magic links
  useDeepLinking();

  useEffect(() => {
    if (!loading && session) {
      if (!profile || !profile.onboarding_completed) {
        const inOnboarding = segments[0] === "onboarding";

        if (!inOnboarding) {
          router.replace("/onboarding");
        }
      }
    }
  }, [session, loading, profile, segments]);

  if (!loaded || loading) {
    const bgColor =
      colorScheme === "dark" ? Colors.dark.background : Colors.light.background;
    const spinnerColor = colorScheme === "dark" ? "#FFFFFF" : "#000000";

    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <Spinner size={40} color={spinnerColor} />
      </View>
    );
  }

  return (
    <ThemeProvider value={themeProviderValue}>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.container}>
          {!session ? (
            <IntroScreen />
          ) : (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
            </Stack>
          )}
          <Toaster
            position="top-center"
            offset={42}
            theme={colorScheme === "dark" ? "dark" : "light"}
            toastOptions={{
              style: {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: Colors[colorScheme ?? "light"].border,
              },
              titleStyle: {
                fontFamily: "NunitoSans_600SemiBold",
                color: Colors[colorScheme ?? "light"].textPrimary,
                fontSize: 14,
                includeFontPadding: false,
              },
              descriptionStyle: {
                fontFamily: "NunitoSans_400Regular",
                color: Colors[colorScheme ?? "light"].textSecondary,
                fontSize: 12,
              },
            }}
          />
        </View>
      </GestureHandlerRootView>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
