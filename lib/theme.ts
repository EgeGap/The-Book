import { useColorScheme } from "nativewind";

/** Hex palette for places that can't use Tailwind classes (charts, SVG, icons). */
export interface Palette {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  grid: string;
}

export const DARK: Palette = {
  bg: "#0A0A0B",
  card: "#161618",
  cardAlt: "#1F1F23",
  border: "#262629",
  text: "#F5F5F7",
  textMuted: "#8E8E93",
  accent: "#7C5CFC",
  grid: "#2A2A2E",
};

export const LIGHT: Palette = {
  bg: "#F7F7F8",
  card: "#FFFFFF",
  cardAlt: "#F0F0F3",
  border: "#E5E5EA",
  text: "#111114",
  textMuted: "#6B7280",
  accent: "#7C5CFC",
  grid: "#E8E8EC",
};

export function useColors(): Palette {
  const { colorScheme } = useColorScheme();
  return colorScheme === "light" ? LIGHT : DARK;
}
