import React from "react";
import { StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { View } from "@/components/ui/view";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { Store, Truck, User, ChevronRight, ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountTypeChoiceScreen() {
  const { colors, spacing } = useTheme();

  const options = [
    {
      id: "customer",
      title: "Customer",
      description: "Discover and shop the finest luxury items.",
      icon: User,
      route: "/",
    },
    {
      id: "store",
      title: "Store Owner",
      description: "List your boutique and reach global clients.",
      icon: Store,
      route: "/auth/register-store",
    },
    {
      id: "driver",
      title: "Delivery Driver",
      description: "Join our elite fleet and earn on every trip.",
      icon: Truck,
      route: "/auth/register-driver",
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header} variant="none">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleSection} variant="none">
          <Text style={styles.title} type="h1">Join Marketplace</Text>
          <Text style={styles.subtitle} type="muted">
            Select the type of account that matches your journey with us.
          </Text>
        </View>

        <View style={styles.optionsContainer} variant="none">
          {options.map((option) => (
            <TouchableOpacity 
              key={option.id}
              onPress={() => router.push(option.route as any)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]} variant="none">
                <option.icon size={28} color={colors.primary} />
              </View>
              <View style={styles.cardContent} variant="none">
                <Text style={styles.cardTitle} type="h3">{option.title}</Text>
                <Text style={styles.cardDescription} type="muted">{option.description}</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer} variant="none">
          <Text style={styles.footerText} type="muted">
            Already have an account?{" "}
            <Text 
              style={{ color: colors.primary, fontWeight: "600" }} 
              onPress={() => router.push("/")}
            >
              Sign In
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: 60,
    alignItems: "center",
  },
  footerText: {
    fontSize: 15,
  },
});
