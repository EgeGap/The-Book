import { ReactNode } from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
}

/** Standard surface used throughout the app. */
export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
