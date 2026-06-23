import { ReactNode } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { AppText } from "./Text";

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string | null;
  hint?: string;
  required?: boolean;
}

/** Labeled form row with inline error/hint. */
export function Field({ label, children, error, hint, required }: FieldProps) {
  return (
    <View className="mb-4">
      <AppText variant="label" className="mb-2">
        {label}
        {required ? <AppText className="text-loss"> *</AppText> : null}
      </AppText>
      {children}
      {error ? (
        <AppText className="mt-1 text-xs text-loss">{error}</AppText>
      ) : hint ? (
        <AppText variant="muted" className="mt-1">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

interface TextFieldProps extends TextInputProps {
  invalid?: boolean;
}

/** Themed text input. Pass keyboardType="decimal-pad" for numerics. */
export function TextField({ invalid, className = "", ...rest }: TextFieldProps) {
  return (
    <TextInput
      placeholderTextColor="#8E8E93"
      className={`rounded-xl border bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 ${
        invalid
          ? "border-loss"
          : "border-neutral-200 dark:border-neutral-700"
      } ${className}`}
      {...rest}
    />
  );
}
