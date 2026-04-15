import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#fdfcfb",
        foreground: "#1a1a1a",
        primary: {
          DEFAULT: "#1a1a1a",
          foreground: "#fdfcfb",
        },
        secondary: {
          DEFAULT: "#f4f1ee",
          foreground: "#1a1a1a",
        },
        accent: {
          DEFAULT: "#d4c9b9",
          foreground: "#1a1a1a",
        },
        muted: {
          DEFAULT: "#f4f1ee",
          foreground: "#71717a",
        },
        border: "#e8e4e1",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
