import { colors } from "../tokens/colors";
import { typography } from "../tokens/typography";

export const darkTheme = {
  colors: {
    background:       colors.theme[12].dark,      // #050505
    surface:          colors.theme[10].dark,      // #191919
    surfaceHover:     colors.theme[9].dark,       // #2B2B2B
    overlay:          colors.theme["12_60"].dark,  // rgba(5,5,5,0.60)

    text:             colors.theme[1].dark,       // #FFFFFF
    textSecondary:    colors.theme[3].dark,       // #EAEAEA
    textMuted:        colors.theme[5].dark,       // #ABABAB
    textSubtle:       colors.theme[6].dark,       // #9C9C9C
    textDisabled:     colors.theme["1_40"].dark,  // rgba(255,255,255,0.40)

    border:           colors.theme[9].dark,       // #2B2B2B
    borderSubtle:     colors.theme[10].dark,      // #191919

    primary:          colors.theme[13].dark,      // #F26E21
    primaryMuted:     colors.primary.muted,       // rgba(242,110,33,0.15)
    destructive:      colors.theme[14].dark,      // #F43728
    gold:             colors.theme.gold.dark,     // #FFD691
  },
  typography,
} as const;

export type DarkTheme = typeof darkTheme;
