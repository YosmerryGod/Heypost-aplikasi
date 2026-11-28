import { Appearance } from "react-native";

// [MODIFIED] Satu sumber token visual HeyPost untuk seluruh halaman dan komponen.
export const getTheme = (isDark: boolean) => ({
  colors: {
    // Surface hierarchy
    ground: isDark ? "#090909" : "#F7F8F7",
    surface: isDark ? "#171717" : "#FFFFFF",
    surfaceElevated: isDark ? "#202020" : "#FFFFFF",
    surfaceSubtle: isDark ? "#111111" : "#F1F3F1",

    // Text hierarchy
    ink: isDark ? "#FFFFFF" : "#111713",
    muted: isDark ? "#A3A3A3" : "#68736C",
    subtle: isDark ? "#858585" : "#89938D",
    disabled: isDark ? "#666666" : "#AAB2AC",
    inverse: "#FFFFFF",

    // HeyPost brand accent
    signal: "#F5B900",
    signalSoft: isDark ? "#332900" : "#FFF5D6",
    signalStrong: "#D99D00",
    signalInk: "#765500",

    // Borders and separators
    line: isDark ? "#292929" : "#E5E9E6",
    lineStrong: isDark ? "#3A3A3A" : "#D6DDD8",

    // Semantic feedback
    success: isDark ? "#55C99A" : "#16835E",
    successSoft: isDark ? "#123326" : "#E7F5ED",
    warning: "#F5B900",
    warningSoft: isDark ? "#332900" : "#FFF5D6",
    danger: isDark ? "#FF817A" : "#B42318",
    dangerSoft: isDark ? "#351B1B" : "#FCEDEC",
    info: isDark ? "#82B7F4" : "#315F91",
    infoSoft: isDark ? "#17283B" : "#EAF1FA",

    // Overlay and interaction
    overlay: isDark ? "rgba(0,0,0,0.72)" : "rgba(16,31,24,0.42)",
    pressed: isDark ? "#292929" : "#F0F3F1",
    focus: "#F5B900",

    // [MODIFIED] Compatibility aliases for existing screens.
    darkGround: "#090909",
    darkSurface: "#171717",
    darkInk: "#FFFFFF",
    darkMuted: "#A3A3A3",
    darkLine: "#292929",
    isDark,
  },
  // [MODIFIED] Nilai token lama dipertahankan agar tidak menggeser layout yang sudah ada.
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 20,
    '2xl': 24,
    pill: 999,
  },
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  },
  typography: {
    display: 30,
    title: 22,
    heading: 18,
    subheading: 16,
    body: 15,
    bodySmall: 13,
    caption: 12,
    overline: 10,
  },
  fontFamily: {
    body: "Figtree-Regular",
    medium: "Figtree-Medium",
    semibold: "Figtree-SemiBold",
    bold: "Figtree-Bold",
    display: "Archivo-Bold",
    displayMedium: "Archivo-Medium",
  },
  elevation: {
    none: 0,
    sm: 2,
    md: 4,
    lg: 8,
    xl: 16,
  },
});

export type ThemeColors = ReturnType<typeof getTheme>["colors"];
export type ThemeTokens = ReturnType<typeof getTheme>;

// [MODIFIED] API tema statis dipertahankan untuk kompatibilitas; layar baru wajib memakai getTheme(useColorScheme()).
export const theme = getTheme(Appearance.getColorScheme() === "dark");
export type Theme = typeof theme;
