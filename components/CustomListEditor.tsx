import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";
import { TextField } from "./ui/Field";

interface CustomListEditorProps {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
}

/** Add / remove user-defined setup types or confluences. */
export function CustomListEditor({
  items,
  onAdd,
  onRemove,
  placeholder,
}: CustomListEditorProps) {
  const [value, setValue] = useState("");
  const add = () => {
    if (value.trim().length === 0) return;
    onAdd(value);
    setValue("");
  };

  return (
    <View>
      <View className="mb-2 flex-row gap-2">
        <TextField
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          className="flex-1"
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable
          onPress={add}
          className="h-12 w-12 items-center justify-center rounded-xl bg-accent"
        >
          <Ionicons name="add" size={22} color="white" />
        </Pressable>
      </View>
      {items.length === 0 ? (
        <AppText variant="muted">Henüz eklenmedi.</AppText>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {items.map((item) => (
            <View
              key={item}
              className="flex-row items-center gap-1 rounded-full bg-neutral-200 px-3 py-1.5 dark:bg-neutral-800"
            >
              <AppText variant="body">{item}</AppText>
              <Pressable onPress={() => onRemove(item)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
