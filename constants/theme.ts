export const theme = {
  colors: {
    ground: "#f4f7f5",
    surface: "#ffffff",
    ink: "#111827",
    muted: "#566273",
    signal: "#16785b",
    signalSoft: "#e8f2ed",
    line: "#dfe8e2",
    danger: "#b42318",
    warning: "#a15c07",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    display: 30,
    title: 22,
    body: 15,
    caption: 12,
  },
} as const;

export type Theme = typeof theme;