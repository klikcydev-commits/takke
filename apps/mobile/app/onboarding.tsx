import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/ctx/AuthContext";
import { patchCustomerProfile } from "@/utils/marketplaceAuth";
import { supabase } from "@/utils/supabase";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

export default function OnboardingScreen() {
  const [name, setName] = useState("");
  const { colors, spacing } = useTheme();

  const { refreshProfile } = useAuth();

  const handleBack = () => {
    router.back();
  };

  const isNextEnabled = () => {
    return name.trim().length > 0;
  };

  const saveProfile = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");

      await patchCustomerProfile(session.access_token, {
        display_name: name.trim(),
        onboarding_completed: true,
      });

      await refreshProfile();

      router.replace("/home");
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Failed to save your profile. Is the vendor API running?");
    }
  };

  const handleContinue = () => {
    saveProfile();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `100%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.mainContent}>
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={{ flex: 1 }}
            >
              <View style={[styles.stepContainer, { gap: spacing.md }]}>
                <Text type="title">
                  What should we call you?
                </Text>
                <Text type="muted">
                  Your name will be used to personalize your experience.
                </Text>

                <Input
                  placeholder="Your Name"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  icon={<HugeiconsIcon icon={UserIcon} size={18} color={colors.textSecondary} />}
                  size="lg"
                />
              </View>
            </Animated.View>
          </View>

          <View style={styles.footer}>
            <Button
              label="Get Started"
              onPress={handleContinue}
              disabled={!isNextEnabled()}
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>


      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 60,
  },
  backButton: {
    marginRight: 16,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  mainContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stepContainer: {
    flex: 1,
  },
  footer: {
    padding: 24,
  },
});
