import { FONTS } from "./fonts";

/**
 * @file typography.ts
 * Predefined typography styles for the entire app.
 */
export const TYPOGRAPHY = {
  h1: { 
    fontFamily: FONTS.heading, 
    fontSize: 32,
    lineHeight: 40,
  },
  h1Italic: { 
    fontFamily: FONTS.headingItalic, 
    fontSize: 32,
    lineHeight: 40,
  },
  h2: { 
    fontFamily: FONTS.heading, 
    fontSize: 26,
    lineHeight: 34,
  },
  h3: { 
    fontFamily: FONTS.subheading, 
    fontSize: 20,
    lineHeight: 28,
  },
  body: { 
    fontFamily: FONTS.body, 
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: { 
    fontFamily: FONTS.bodyBold, 
    fontSize: 16,
    lineHeight: 24,
  },
  button: { 
    fontFamily: FONTS.button, 
    fontSize: 16,
    letterSpacing: 0.5,
  },
  small: { 
    fontFamily: FONTS.body, 
    fontSize: 13,
    lineHeight: 18,
  },
  ui: { 
    fontFamily: FONTS.ui, 
    fontSize: 15,
  }
};
