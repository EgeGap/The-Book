import { Text, TextProps } from "react-native";

type Variant = "title" | "heading" | "body" | "muted" | "label" | "mono";

const VARIANTS: Record<Variant, string> = {
  title: "text-2xl font-bold text-neutral-900 dark:text-neutral-50",
  heading: "text-base font-semibold text-neutral-900 dark:text-neutral-100",
  body: "text-sm text-neutral-800 dark:text-neutral-200",
  muted: "text-xs text-neutral-500 dark:text-neutral-400",
  label:
    "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400",
  mono: "text-sm text-neutral-900 dark:text-neutral-100 font-mono",
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

/** Themed Text with a few semantic presets. */
export function AppText({
  variant = "body",
  className = "",
  ...rest
}: AppTextProps) {
  return <Text className={`${VARIANTS[variant]} ${className}`} {...rest} />;
}
