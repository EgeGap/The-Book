import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";

interface ScreenshotUploaderProps {
  value: string[];
  onChange: (uris: string[]) => void;
  max?: number;
}

/** Pick from the library, downscale + JPEG-compress, then store the local URI. */
export function ScreenshotUploader({
  value,
  onChange,
  max = 4,
}: ScreenshotUploaderProps) {
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (busy || value.length >= max) return;
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin gerekli", "Ekran görüntüsü eklemek için fotoğraf erişimine izin ver.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (res.canceled || !res.assets[0]) return;
      const manipulated = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onChange([...value, manipulated.uri]);
    } catch {
      Alert.alert("Görsel eklenemedi", "Fotoğraf seçilirken bir sorun oluştu.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (uri: string) => onChange(value.filter((u) => u !== uri));

  return (
    <View className="flex-row flex-wrap gap-2">
      {value.map((uri) => (
        <View key={uri} className="h-24 w-24 overflow-hidden rounded-xl">
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          <Pressable
            onPress={() => remove(uri)}
            className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70"
          >
            <Ionicons name="close" size={14} color="white" />
          </Pressable>
        </View>
      ))}
      {value.length < max ? (
        <Pressable
          onPress={add}
          disabled={busy}
          className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700"
        >
          <Ionicons name={busy ? "hourglass-outline" : "camera-outline"} size={22} color="#8E8E93" />
          <AppText variant="muted" className="mt-1">
            {busy ? "…" : "Ekle"}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
