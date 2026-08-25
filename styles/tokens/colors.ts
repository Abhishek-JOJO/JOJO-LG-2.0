// ─── Design Token Colors ─────────────────────────────────────────────────────
// Single source of truth — mirrors globals.css CSS custom properties exactly.
// "samecolour" = identical value in dark & light mode.

export const colors = {
  // ── Raw palette tokens ────────────────────────────────────────────────────
  theme: {
    // theme_1          dark: #FFFFFF        light: #050505
    1: { dark: "#FFFFFF", light: "#050505" },
    // theme_1_15       dark: #FFFFFF @15%   light: #050505 @15%
    "1_15": { dark: "rgba(255,255,255,0.15)", light: "rgba(5,5,5,0.15)" },
    // theme_1_40       dark: #FFFFFF @40%   light: #050505 @40%
    "1_40": { dark: "rgba(255,255,255,0.40)", light: "rgba(5,5,5,0.40)" },
    // theme_2_samecolour  both: #FFFFFF
    "2": { dark: "#FFFFFF", light: "#FFFFFF" },
    // theme_2_samecolour_20  both: #FFFFFF @20%
    "2_20": { dark: "rgba(255,255,255,0.20)", light: "rgba(255,255,255,0.20)" },
    // theme_3          dark: #EAEAEA        light: #191919
    3: { dark: "#EAEAEA", light: "#191919" },
    // theme_4          dark: #E2E2E2        light: #2B2B2B
    4: { dark: "#E2E2E2", light: "#2B2B2B" },
    // theme_5          dark: #ABABAB        light: #3D3D3D
    5: { dark: "#ABABAB", light: "#3D3D3D" },
    // theme_5_50       dark: #ABABAB @50%   light: #3D3D3D @50%
    "5_50": { dark: "rgba(171,171,171,0.50)", light: "rgba(61,61,61,0.50)" },
    // theme_6          dark: #9C9C9C        light: #7B7A79
    6: { dark: "#9C9C9C", light: "#7B7A79" },
    // theme_7          dark: #7B7A79        light: #9C9C9C
    7: { dark: "#7B7A79", light: "#9C9C9C" },
    // theme_8          dark: #3D3D3D        light: #ABABAB
    8: { dark: "#3D3D3D", light: "#ABABAB" },
    // theme_9          dark: #2B2B2B        light: #E2E2E2
    9: { dark: "#2B2B2B", light: "#E2E2E2" },
    // theme_10         dark: #191919        light: #EAEAEA
    10: { dark: "#191919", light: "#EAEAEA" },
    // theme_10_50      dark: #191919 @50%   light: #EAEAEA @50%
    "10_50": { dark: "rgba(25,25,25,0.50)", light: "rgba(234,234,234,0.50)" },
    // theme_10_80      dark: #191919 @80%   light: #EAEAEA @80%
    "10_80": { dark: "rgba(25,25,25,0.80)", light: "rgba(234,234,234,0.80)" },
    // theme_11_samecolour  both: #191919
    11: { dark: "#191919", light: "#191919" },
    // theme_12         dark: #050505        light: #FFFFFF
    12: { dark: "#050505", light: "#FFFFFF" },
    // theme_12_60      dark: #050505 @60%   light: #FFFFFF @60%
    "12_60": { dark: "rgba(5,5,5,0.60)", light: "rgba(255,255,255,0.60)" },
    // theme_12_90      dark: #050505 @90%   light: #FFFFFF @90%
    "12_90": { dark: "rgba(5,5,5,0.90)", light: "rgba(255,255,255,0.90)" },
    // theme_13_samecolour  both: #F26E21
    13: { dark: "#F26E21", light: "#F26E21" },
    // theme_14_samecolour  both: #F43728
    14: { dark: "#F43728", light: "#F43728" },
    // gold_1           both: #FFD691
    gold: { dark: "#FFD691", light: "#FFD691" },
  },

  // ── Semantic aliases ──────────────────────────────────────────────────────
  primary: { DEFAULT: "#F26E21", muted: "rgba(242,110,33,0.15)" },
  destructive: { DEFAULT: "#F43728" },
  gold: { DEFAULT: "#FFD691" },
  status: {
    success: "#46D369",
    warning: "#E87C03",
    error: "#F43728",
    info: "#60A5FA",
  },
} as const;

export type Colors = typeof colors;
