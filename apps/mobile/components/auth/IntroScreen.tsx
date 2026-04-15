import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/utils/supabase";
import { AppleIcon, GoogleIcon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { BlurView } from "expo-blur";
import { VideoView, useVideoPlayer } from "expo-video";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  View as RNView,
  StyleSheet,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { View } from "../ui/view";
import EmailAuth from "./EmailAuth";

const { width, height } = Dimensions.get("window");
const videoSource = require("../../assets/videos/auth.mp4");

const MENU_HEIGHT = 280;
const PEEK_MENU_HEIGHT = 60;
const CLOSED_POSITION = MENU_HEIGHT - PEEK_MENU_HEIGHT;

WebBrowser.maybeCompleteAuthSession();

export default function IntroScreen() {
  const { colors, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const mainTextOpacity = useSharedValue(0);
  const scriptTextOpacity = useSharedValue(0);
  const menuContentOpacity = useSharedValue(1);
  const menuTranslateY = useSharedValue(0); // Expanded by default
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [currentView, setCurrentView] = useState<"login" | "email">("login");

  const mainTextWords: string[] = ["Your", "Next", "Perfect", "Look", "Awaits"];
  const scriptPhrases: string[] = [
    "Discovering",
    "Thrifting",
    "Styling",
    "Authenticating",
  ];

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const mainTextAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      mainTextOpacity.value,
      [0, 1],
      [30, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity: mainTextOpacity.value,
      transform: [{ translateY }],
    };
  });

  const scriptTextAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scriptTextOpacity.value,
      [0, 1],
      [20, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity: scriptTextOpacity.value,
      transform: [{ translateY }],
    };
  });

  const menuAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: menuTranslateY.value }],
    };
  });

  const menuContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: menuContentOpacity.value,
    };
  });

  const panGesture = Gesture.Pan().onEnd((event) => {
    "worklet";
    const swipeThreshold = 50;
    const isUpSwipe = event.translationY < -swipeThreshold;
    const isDownSwipe = event.translationY > swipeThreshold;

    if (isUpSwipe) {
      // Open menu
      menuTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 200,
        mass: 1,
      });
    } else if (isDownSwipe) {
      // Close menu
      menuTranslateY.value = withSpring(CLOSED_POSITION, {
        damping: 30,
        stiffness: 200,
        mass: 1,
      });
    }
  });

  const animateTextIn = useCallback(() => {
    mainTextOpacity.value = withTiming(1, { duration: 1200 });
    scriptTextOpacity.value = withDelay(800, withTiming(1, { duration: 800 }));
  }, [mainTextOpacity, scriptTextOpacity]);

  const animateScriptOut = useCallback(() => {
    scriptTextOpacity.value = withTiming(0, { duration: 500 });
  }, [scriptTextOpacity]);

  const animateScriptIn = useCallback(() => {
    scriptTextOpacity.value = withTiming(1, { duration: 600 });
  }, [scriptTextOpacity]);

  const animateMenu = (open: boolean) => {
    menuTranslateY.value = withSpring(open ? 0 : CLOSED_POSITION, {
      damping: 30,
      stiffness: 200,
      mass: 1,
    });
  };

  const animateToEmailView = (to: "email" | "login") => {
    menuContentOpacity.value = withTiming(0, { duration: 200 });

    setTimeout(() => {
      setCurrentView(to);
      menuContentOpacity.value = withTiming(1, { duration: 300 });
    }, 200);
  };

  const handlePress = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    animateMenu(newState);
  };

  const [activeLoading, setActiveLoading] = useState<
    "apple" | "google" | "email" | null
  >(null);

  const extractParamsFromUrl = (url: string) => {
    const parsedUrl = new URL(url);
    const hash = parsedUrl.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
    };
  };

  const signInWithGoogle = async () => {
    try {
      setActiveLoading("google");
      const redirectTo = "marketplace://";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: "consent" },
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No OAuth URL returned");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
        { showInRecents: true },
      );

      if (result.type === "success") {
        const params = extractParamsFromUrl(result.url);
        if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) throw sessionError;
        }
      }
    } catch (error: any) {
      console.error("Google login error:", error.message);
    } finally {
      setActiveLoading(null);
    }
  };

  const signInWithApple = async () => {
    try {
      setActiveLoading("apple");

      if (Platform.OS === "ios") {
        // Native Apple Sign-In on iOS
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (credential.identityToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "apple",
            token: credential.identityToken,
          });
          if (error) throw error;
        } else {
          throw new Error("No identity token received from Apple");
        }
      } else {
        // OAuth fallback for Android
        const redirectTo = "marketplace://";

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;
        if (!data.url) throw new Error("No OAuth URL returned");

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          { showInRecents: true },
        );

        if (result.type === "success") {
          const params = extractParamsFromUrl(result.url);
          if (params.access_token && params.refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }
      }
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User cancelled — do nothing
        return;
      }
      console.error("Apple login error:", error.message);
    } finally {
      setActiveLoading(null);
    }
  };

  useEffect(() => {
    player.play();

    const timeout = setTimeout(() => {
      animateTextIn();
    }, 300);

    const cycleInterval = setInterval(() => {
      animateScriptOut();
      setTimeout(() => {
        setCurrentPhraseIndex((prev) => {
          const nextIndex = (prev + 1) % scriptPhrases.length;

          if (nextIndex === 0) {
            setTimeout(() => animateScriptIn(), 150);
          }

          return nextIndex;
        });
      }, 500);
    }, 3500);

    // warmUp/coolDown are native-only and crash on web.
    if (Platform.OS !== "web") {
      WebBrowser.warmUpAsync();
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(cycleInterval);
      if (Platform.OS !== "web") {
        WebBrowser.coolDownAsync();
      }
    };
  }, [
    player,
    animateTextIn,
    animateScriptOut,
    animateScriptIn,
    scriptPhrases.length,
  ]);

  useEffect(() => {
    if (currentPhraseIndex > 0) {
      const timeout = setTimeout(() => {
        animateScriptIn();
      }, 150);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [currentPhraseIndex, animateScriptIn]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      },
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (event) => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const renderLoginView = () => (
    <Animated.View style={[styles.viewContainer, menuContentAnimatedStyle]}>
      <View style={styles.logoSection} variant="none">
        <View style={styles.logoContainer} variant="none">
          {/* <Image source={logoSource} style={styles.logo} /> */}
          <Text style={[styles.appName, { color: colors.primary }]} type="h3">
            Marketplace
          </Text>
        </View>
        {/* <View style={styles.statsContainer} variant="none">
          <Text
            style={[styles.rating, { color: colors.textSecondary }]}
            type="defaultSemiBold"
          >
            START TODAY
          </Text>
        </View> */}
      </View>

      <View
        style={[
          styles.buttonsContainer,
          { gap: spacing.md, flex: 1, justifyContent: "center" },
        ]}
        variant="none"
      >
        <Button
          variant="primary"
          onPress={signInWithApple}
          loading={activeLoading === "apple"}
          icon={
            <HugeiconsIcon
              icon={AppleIcon}
              size={18}
              color={colors.buttonText}
            />
          }
          label="Continue with Apple"
        />
        <Button
          variant="primary"
          onPress={signInWithGoogle}
          loading={activeLoading === "google"}
          icon={
            <HugeiconsIcon
              icon={GoogleIcon}
              size={18}
              color={colors.buttonText}
            />
          }
          label="Continue with Google"
        />
        <Button
          variant="outline"
          onPress={() => animateToEmailView("email")}
          icon={
            <HugeiconsIcon
              icon={Mail01Icon}
              size={18}
              color={colors.textPrimary}
            />
          }
          label="Continue with Email"
        />
      </View>
    </Animated.View>
  );

  const renderEmailView = () => (
    <EmailAuth
      onBack={() => animateToEmailView("login")}
      menuContentAnimatedStyle={menuContentAnimatedStyle}
    />
  );

  const dynamicMenuHeight =
    keyboardHeight > 0
      ? MENU_HEIGHT + keyboardHeight + spacing.xl
      : MENU_HEIGHT + (insets.bottom > 0 ? 0 : spacing.lg);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }} variant="none">
      <VideoView
        nativeControls={false}
        player={player}
        style={[StyleSheet.absoluteFill, { width, height }]}
        contentFit="cover"
      />

      {/* Overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0, 0, 0, 0.4)", zIndex: 20 },
        ]}
      />

      {/* Hero Text Section */}
      <RNView style={styles.heroTextContainer}>
        <Animated.View
          style={[styles.mainTextContainer, mainTextAnimatedStyle]}
        >
          <Text style={styles.heroTextMain}>{mainTextWords.join(" ")}</Text>
        </Animated.View>

        <Animated.View style={scriptTextAnimatedStyle}>
          <Text style={styles.heroTextScript}>
            {scriptPhrases[currentPhraseIndex]}
          </Text>
        </Animated.View>
      </RNView>

      {/* Sliding menu with dynamic height */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.menuContainer,
            menuAnimatedStyle,
            {
              height: dynamicMenuHeight + insets.bottom,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              backgroundColor: isDark
                ? "rgba(20, 20, 20, 0.75)"
                : "rgba(255, 255, 255, 0.8)",
              overflow: "hidden",
              borderTopWidth: 0,
            },
          ]}
        >
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={styles.handleContainer} onPress={handlePress}>
            <RNView
              style={[
                styles.handle,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.12)",
                },
              ]}
            />
          </Pressable>

          <View style={styles.menuContent} variant="none">
            {currentView === "login" ? renderLoginView() : renderEmailView()}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 30,
  },
  handleContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 10,
  },
  menuContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  viewContainer: {
    flex: 1,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 0,
    marginBottom: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  appName: {
    fontSize: 20,
    color: "white",
  },
  statsContainer: {
    alignItems: "center",
  },
  rating: {
    fontSize: 12,
    letterSpacing: 1.2,
    opacity: 0.8,
  },
  buttonsContainer: {
    gap: 12,
  },
  icon: {
    marginRight: 12,
  },
  heroTextContainer: {
    position: "absolute",
    top: height * 0.15,
    left: 30,
    right: 30,
    zIndex: 25,
  },
  mainTextContainer: {
    marginBottom: 8, // Added space between main and script text
  },
  heroTextMain: {
    fontSize: 48,
    color: "#FFFFFF",
    lineHeight: 52, // Prevent cutting off
  },
  heroTextScript: {
    fontSize: 56,
    lineHeight: 72,
    paddingBottom: 8,
  },
});
