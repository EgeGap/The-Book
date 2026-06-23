import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Field, TextField } from "@/components/ui/Field";
import { useAuthStore } from "@/store/useAuthStore";

export default function SignInScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const submit = () => {
    setError(null);
    const res = mode === "signin" ? signIn(email, password) : signUp(email, password);
    if (!res.ok) setError(res.error);
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="mt-12 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <Ionicons name="trending-up" size={32} color="white" />
          </View>
          <AppText variant="title" className="mt-4">
            SMC Journal
          </AppText>
          <AppText variant="muted" className="mt-1 text-center">
            Her işlemi kaydet. Para kazandıranı bul. Kaybettireni ele.
          </AppText>
        </View>

        <View className="mt-10">
          <Field label="E-posta">
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </Field>
          <Field label="Şifre" hint="En az 6 karakter (bu cihazda lokal saklanır)">
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </Field>

          {error ? (
            <AppText className="mb-3 text-sm text-loss">{error}</AppText>
          ) : null}

          <Button
            label={mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
            onPress={submit}
            icon="log-in"
          />

          <Pressable
            className="mt-4 items-center"
            onPress={() => {
              setError(null);
              setMode((m) => (m === "signin" ? "signup" : "signin"));
            }}
          >
            <AppText variant="muted">
              {mode === "signin"
                ? "Hesabın yok mu? Oluştur"
                : "Zaten hesabın var mı? Giriş yap"}
            </AppText>
          </Pressable>

          <View className="my-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
            <AppText variant="muted">veya</AppText>
            <View className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
          </View>

          <Button
            label="Misafir olarak devam et"
            variant="secondary"
            onPress={continueAsGuest}
            icon="person-outline"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
