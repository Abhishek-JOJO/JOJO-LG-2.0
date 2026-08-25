import type { Config } from "tailwindcss";

/** Raw palette from `app/globals.css` — utilities: `text-theme_1`, `bg-theme_9`, `border-theme_9`, … */
export const themeColors = {
  theme_1: "var(--theme_1)",
  theme_1_15: "var(--theme_1_15)",
  theme_1_40: "var(--theme_1_40)",
  theme_2_same_colour: "var(--theme_2_same_colour)",
  theme_2_same_colour_20: "var(--theme_2_same_colour_20)",
  theme_3: "var(--theme_3)",
  theme_4: "var(--theme_4)",
  theme_5: "var(--theme_5)",
  theme_5_50: "var(--theme_5_50)",
  theme_6: "var(--theme_6)",
  theme_7: "var(--theme_7)",
  theme_8: "var(--theme_8)",
  theme_9: "var(--theme_9)",
  theme_10: "var(--theme_10)",
  theme_10_50: "var(--theme_10_50)",
  theme_10_80: "var(--theme_10_80)",
  theme_11_samecolour: "var(--theme_11_samecolour)",
  theme_11_60: "var(--theme_11_60)",
  theme_12: "var(--theme_12)",
  theme_12_60: "var(--theme_12_60)",
  theme_12_90: "var(--theme_12_90)",
  theme_13: "var(--theme_13)",
  theme_13_samecolour: "var(--theme_13_samecolour)",
  theme_13_50: "var(--theme_13_50)",
  theme_13_80: "var(--theme_13_80)",
  theme_13_60: "var(--theme_13_60)",
  theme_13_18: "var(--theme_13_18)",
  theme_14_samecolour: "var(--theme_14_samecolour)",
  gold_1: "var(--gold_1)",
  tabs_disable: "var(--tabs_disable)",
  "orange-500": "var(--theme_13, #F26E21)"
} as const;

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./features/**/*.{js,ts,jsx,tsx}",
    "./enums/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1440px",
      "2xl": "1920px",
    },
    extend: {
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
      },
      colors: {
        ...themeColors,
      },
      borderRadius: {
        pill: "999px",
        card: "20px",
        "card-lg": "24px",
      },
      backdropBlur: {
        card: "10px",
        hero: "18px",
      },
      maxWidth: {
        card: "440px",
        "card-lg": "480px",
      },
    },
  },
  plugins: [],
} satisfies Config;
