import { useTheme } from "@/hooks/use-theme";
import React from "react";
import {
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
  type TouchableOpacityProps,
} from "react-native";
import { Spinner } from "./spinner";
import { Text } from "./text";

export type ButtonVariant =
  | "primary"
  | "outline"
  | "ghost"
  | "destructive"
  | "accent";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  label?: string;
  labelStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  style,
  variant = "primary",
  size = "default",
  loading = false,
  label,
  labelStyle,
  icon,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { colors, spacing } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "primary":
        return colors.buttonPrimary;
      case "accent":
        return colors.accent;
      case "destructive":
        return "#ef4444"; // Red for destructive, can be moved to palette if needed
      case "outline":
      case "ghost":
        return "transparent";
      default:
        return colors.buttonPrimary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return colors.buttonText;
      case "accent":
        return colors.buttonText;
      case "destructive":
        return "#FFFFFF";
      case "outline":
      case "ghost":
        return colors.textPrimary;
      default:
        return colors.buttonText;
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") return colors.border;
    return "transparent";
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: size === "lg" ? 32 : size === "sm" ? 17 : 24,
      borderWidth: variant === "outline" ? 1.5 : 0,
      opacity: disabled || loading ? 0.6 : 1,
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      gap: spacing.md, // Increased gap for better spacing
    };

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      default: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        minHeight: 40,
      },
      sm: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        minHeight: 34,
      },
      lg: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
        minHeight: 52,
      },
      icon: { padding: spacing.sm, width: 40, height: 40, borderRadius: 20 },
    };

    return { ...baseStyle, ...sizeStyles[size] };
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <Spinner size={20} color={textColor} />
      ) : (
        icon && <React.Fragment>{icon}</React.Fragment>
      )}

      {label && (
        <Text
          style={[
            styles.label,
            { color: textColor },
            size === "sm" && styles.smLabel,
            size === "lg" && styles.lgLabel,
            labelStyle,
          ]}
          type="button"
        >
          {label}
        </Text>
      )}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: {
    textAlign: "center",
  },
  smLabel: {
    fontSize: 14,
  },
  lgLabel: {
    fontSize: 18,
  },
});
