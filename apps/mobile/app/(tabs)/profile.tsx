import { Paywall } from "@/components/subscription/Paywall";
import { Button } from "@/components/ui/button";
import { CartButton } from "@/components/ui/cart-button";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { useAuth } from "@/ctx/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useLayoutStore } from "@/store/useLayoutStore";
import { supabase } from "@/utils/supabase";
import {
  ArrowRight01Icon,
  BankIcon,
  CloudUploadIcon,
  Edit02Icon,
  Home01Icon,
  Image01Icon,
  Location01Icon,
  Logout01Icon,
  Notification01Icon,
  Shield01Icon,
  Shield02Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  Ticket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { toast } from "sonner-native";

const SettingsMenuTile = ({
  icon: IconComponent,
  title,
  subTitle,
  trailing,
  onPress,
}: any) => {
  const { colors } = useTheme();

  const content = (
    <>
      <View style={styles.menuItemLeft} variant="none">
        {IconComponent && (
          <HugeiconsIcon
            icon={IconComponent}
            size={28}
            color={colors.primary}
          />
        )}
        <View style={styles.menuItemTextContainer} variant="none">
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subTitle && (
            <Text style={styles.menuItemSubTitle} type="muted">
              {subTitle}
            </Text>
          )}
        </View>
      </View>
      {trailing
        ? trailing
        : onPress && (
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="#8e8e93" />
          )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.menuItem} variant="none">
      {content}
    </View>
  );
};

export default function ProfileContent() {
  const { profile, user } = useAuth();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { colors, spacing } = useTheme();
  const [useLocation, setUseLocation] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const [hdImage, setHdImage] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { topInset, leftInset, rightInset } = useLayoutStore();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        await supabase.auth.signOut({ scope: "local" });
        toast.success("Signed out successfully");
        return;
      } else {
        toast.success("Signed out successfully");
      }
    } catch {
      try {
        await supabase.auth.signOut({ scope: "local" });
        toast.success("Signed out successfully");
      } catch {
        toast.error("Failed to sign out. Please restart the app.");
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View variant="none" style={{ flex: 1, backgroundColor: colors.primary }}>
      <View
        variant="none"
        style={{
          flex: 1,
          paddingTop: topInset,
          paddingLeft: leftInset,
          paddingRight: rightInset,
        }}
      >
        {/* Header container styled like TPrimaryHeaderContainer */}
        <View
          style={[styles.headerContainer, { backgroundColor: colors.primary }]}
        >
          <View style={styles.headerTopRow} variant="none">
            <Text style={styles.headerTitle}>Account</Text>
            <CartButton color="#fff" />
          </View>

          <TouchableOpacity
            style={styles.userProfileTile}
            onPress={() => toast.info("Edit Profile")}
          >
            <View style={styles.avatarContainer} variant="none">
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={styles.profileInfo} variant="none">
              <Text style={styles.userName} type="large">
                {profile?.full_name ?? "User"}
              </Text>
              <Text style={styles.userEmail} type="muted">
                {user?.email}
              </Text>
            </View>
            <HugeiconsIcon icon={Edit02Icon} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Sheet paddingTop={spacing.lg}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Account Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} type="small">
                Account Settings
              </Text>

              <SettingsMenuTile
                icon={Home01Icon}
                title="My Addresses"
                subTitle="Set shopping delivery address"
                onPress={() => toast.info("Navigate to Addresses")}
              />
              <SettingsMenuTile
                icon={ShoppingCart01Icon}
                title="My Cart"
                subTitle="Add, remove products and move to checkout."
                onPress={() => toast.info("Navigate to Cart")}
              />
              <SettingsMenuTile
                icon={ShoppingBag01Icon}
                title="My Orders"
                subTitle="In-progress and Completed Orders"
                onPress={() => toast.info("Navigate to Orders")}
              />
              <SettingsMenuTile
                icon={BankIcon}
                title="Bank Account"
                subTitle="Withdraw balance to registered bank account"
                onPress={() => toast.info("Navigate to Bank")}
              />
              <SettingsMenuTile
                icon={Ticket01Icon}
                title="My Coupons"
                subTitle="List of all the discounted coupons"
                onPress={() => toast.info("Navigate to Coupons")}
              />
              <SettingsMenuTile
                icon={Notification01Icon}
                title="Notifications"
                subTitle="Set any kind of notification message"
                onPress={() => toast.info("Navigate to Notifications")}
              />
              <SettingsMenuTile
                icon={Shield01Icon}
                title="Account Privacy"
                subTitle="Manage data usage and connected accounts"
                onPress={() => toast.info("Navigate to Privacy")}
              />
            </View>

            {/* App Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} type="small">
                App Settings
              </Text>

              <SettingsMenuTile
                icon={CloudUploadIcon}
                title="Load Data"
                subTitle="Upload Data to your Cloud Firebase"
                onPress={() => toast.info("Load Data")}
              />
              <SettingsMenuTile
                icon={Location01Icon}
                title="Geolocation"
                subTitle="Set recommendation based on location"
                trailing={
                  <Switch value={useLocation} onValueChange={setUseLocation} />
                }
              />
              <SettingsMenuTile
                icon={Shield02Icon}
                title="Safe Mode"
                subTitle="Search result is safe for all ages"
                trailing={
                  <Switch value={safeMode} onValueChange={setSafeMode} />
                }
              />
              <SettingsMenuTile
                icon={Image01Icon}
                title="HD Image Quality"
                subTitle="Set image quality to be seen"
                trailing={<Switch value={hdImage} onValueChange={setHdImage} />}
              />
            </View>

            <Button
              variant="outline"
              label="Logout"
              onPress={handleSignOut}
              loading={isSigningOut}
              icon={
                <HugeiconsIcon
                  icon={Logout01Icon}
                  size={18}
                  color={colors.textPrimary}
                />
              }
              style={styles.signOutButton}
            />
          </ScrollView>
        </Sheet>

        <Paywall
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTopRow: {
    height: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 34,
    color: "#fff",
  },
  userProfileTile: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "NunitoSans_700Bold",
    color: "#fff",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    color: "#fff",
    marginBottom: 4,
  },
  userEmail: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  scrollContainer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 32,
    height: "auto",
  },
  premiumLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    color: "#fff",
  },
  premiumSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: "NunitoSans_700Bold",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 16,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    marginBottom: 2,
  },
  menuItemSubTitle: {
    fontSize: 13,
  },
  signOutButton: {
    marginTop: 8,
  },
});
