/**
 * @file theme.ts
 * Centralized theme system for the application.
 */

import { LightColors, DarkColors, TColors } from './colors';
import { TYPOGRAPHY } from './typography';
import { FONTS } from './fonts';

export type Spacing = typeof spacing;
export type Typography = typeof TYPOGRAPHY;
export type Colors = typeof LightColors;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

export const theme = {
  light: {
    colors: LightColors,
    typography: TYPOGRAPHY,
    spacing,
    fonts: FONTS,
  },
  dark: {
    colors: DarkColors,
    typography: TYPOGRAPHY,
    spacing,
    fonts: FONTS,
  },
};

// For backward compatibility during migration
export const Colors = {
  light: LightColors,
  dark: DarkColors,
};

export const Fonts = FONTS;
export { TColors };
