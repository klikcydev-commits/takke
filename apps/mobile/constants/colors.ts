/**
 * @file colors.ts
 * soft, editorial-style color palettes for Light and Dark modes.
 */

export const TColors = {
  // App theme colors
  primary: "#B49F95",
  secondary: "#FFE24B",
  accent: "#B09C91",

  // Text colors
  textPrimary: "#333333",
  textSecondary: "#6C757D",
  textWhite: "#FFFFFF",

  // Background colors
  light: "#F8F8F8",
  dark: "#161616",
  primaryBackground: "#F3F5FF",

  // Background Container colors
  lightContainer: "#F6F6F6",
  darkContainer: "rgba(255, 255, 255, 0.1)",

  // Button colors
  buttonPrimary: "#B09C91",
  buttonSecondary: "#6C757D",
  buttonDisabled: "#C4C4C4",

  // Border colors
  borderPrimary: "#D9D9D9",
  borderSecondary: "#E6E6E6",

  // Error and validation colors
  error: "#D32F2F",
  success: "#388E3C",
  warning: "#F57C00",
  info: "#1976D2",

  // Neutral Shades
  black: "#232323",
  darkerGrey: "#4F4F4F",
  darkGrey: "#939393",
  grey: "#E0E0E0",
  softGrey: "#F4F4F4",
  lightGrey: "#F9F9F9",
  white: "#FFFFFF",
  verified: "#1D9BF0",
};

export const LightColors = {
  background: TColors.light,
  surface: "#FFFFFF", // High-contrast cards on off-white background
  imageBackground: "rgba(0, 0, 0, 0.05)",
  primaryTransparent: "rgba(180, 159, 149, 0.15)",
  primaryBorder: "rgba(180, 159, 149, 0.3)",
  primary: TColors.primary,
  textPrimary: TColors.textPrimary,
  textSecondary: TColors.textSecondary,
  border: "#EDEDED",
  accent: TColors.accent,
  buttonPrimary: TColors.buttonPrimary,
  buttonText: TColors.textWhite,
};

export const DarkColors = {
  background: TColors.dark,
  surface: "#242424", // Lighter for elevation
  imageBackground: "rgba(255, 255, 255, 0.05)",
  primaryTransparent: "rgba(180, 159, 149, 0.15)",
  primaryBorder: "rgba(180, 159, 149, 0.3)",
  primary: TColors.primary,
  textPrimary: "#F2F2F2",
  textSecondary: "#9E9E9E",
  border: "#333333",
  accent: TColors.accent,
  buttonPrimary: TColors.buttonPrimary,
  buttonText: TColors.textWhite,
};
