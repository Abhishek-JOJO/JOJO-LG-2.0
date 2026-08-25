// Typography tokens — mirrors the CSS custom properties in globals.css

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs:   "0.75rem",    // 12px  — --text-xs
    sm:   "0.875rem",   // 14px  — --text-sm
    base: "1rem",       // 16px  — --text-base
    lg:   "1.125rem",   // 18px  — --text-lg
    xl:   "1.25rem",    // 20px  — --text-xl
    "2xl":"1.5rem",     // 24px  — --text-2xl
    "3xl":"1.875rem",   // 30px  — --text-3xl
    "4xl":"2.25rem",    // 36px  — --text-4xl
    "5xl":"3rem",       // 48px  — --text-5xl
  },
  fontWeight: {
    normal:   "400",  // --font-normal
    medium:   "500",  // --font-medium
    semibold: "600",  // --font-semibold
    bold:     "700",  // --font-bold
    black:    "900",  // --font-black
  },
  lineHeight: {
    tight:   "1.25",  // --leading-tight
    normal:  "1.5",   // --leading-normal
    relaxed: "1.75",  // --leading-relaxed
  },
  letterSpacing: {
    tight:  "-0.02em", // --tracking-tight
    normal: "0em",     // --tracking-normal
    wide:   "0.05em",  // --tracking-wide
    wider:  "0.1em",   // --tracking-wider
  },
} as const;

export type Typography = typeof typography;
