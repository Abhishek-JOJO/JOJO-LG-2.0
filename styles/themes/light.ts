import { colors } from "../tokens/colors";
import { typography } from "../tokens/typography";

export const lightTheme = {
  colors: {
    background:       colors.theme[12].light,     // #FFFFFF
    surface:          colors.theme[10].light,     // #EAEAEA
    surfaceHover:     colors.theme[9].light,      // #E2E2E2
    overlay:          colors.theme["12_60"].light, // rgba(255,255,255,0.60)

    text:             colors.theme[1].light,      // #050505
    textSecondary:    colors.theme[3].light,      // #191919
    textMuted:        colors.theme[5].light,      // #3D3D3D
    textSubtle:       colors.theme[6].light,      // #7B7A79
    textDisabled:     colors.theme["1_40"].light, // rgba(5,5,5,0.40)

    border:           colors.theme[9].light,      // #E2E2E2
    borderSubtle:     colors.theme[10].light,     // #EAEAEA

    primary:          colors.theme[13].light,     // #F26E21
    primaryMuted:     colors.primary.muted,       // rgba(242,110,33,0.15)
    destructive:      colors.theme[14].light,     // #F43728
    gold:             colors.theme.gold.light,    // #FFD691
  },
  typography,
} as const;

export type LightTheme = typeof lightTheme;
