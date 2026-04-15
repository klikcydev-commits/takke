import { supabase } from "@/utils/supabase";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { toast } from "sonner-native";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Text } from "../ui/text";
import { useTheme } from "@/hooks/use-theme";

const redirectTo = "marketplace://";

export default function EmailAuth({
  onBack,
  menuContentAnimatedStyle,
}: {
  onBack: () => void;
  menuContentAnimatedStyle: any;
}) {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const signInWithEmail = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        toast.error(error.message);
        throw error;
      } else {
        toast.success("Check your email for the login link");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.viewContainer, menuContentAnimatedStyle]}>
      <View style={styles.emailHeader}>
        <TouchableOpacity onPress={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.titleContainer, { gap: spacing.xs }]}>
        <Text style={[styles.emailMainTitle, { color: colors.textPrimary }]} type="title">
          Enter your email address.
        </Text>
        <Text style={[styles.emailSubtitle, { color: colors.textSecondary }]} type="muted">
          We will send you a magic link to sign in.
        </Text>
      </View>

      <View style={[styles.formContainer, { gap: spacing.md }]}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          icon={<HugeiconsIcon icon={Mail01Icon} size={18} color={colors.textSecondary} />}
        />

        <Button
          label="Send magic link"
          onPress={signInWithEmail}
          loading={loading}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    flex: 1,
  },
  emailHeader: {
    paddingTop: 0,
    paddingBottom: 8,
    marginBottom: 0,
    alignItems: "flex-start",
  },
  titleContainer: {
    marginBottom: 24,
  },
  emailMainTitle: {
    color: "white",
  },
  emailSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  formContainer: {},
});
