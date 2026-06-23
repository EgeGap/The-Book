import { useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppText } from "./ui/Text";
import { clamp } from "@/lib/utils";

interface SwipeToConfirmProps {
  label: string;
  busyLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  confirming?: boolean;
}

const THUMB = 48;
const PAD = 4;
const HEIGHT = THUMB + PAD * 2;

/**
 * One-gesture discipline confirm (replaces the multi-checkbox gate). Built on
 * PanResponder + Animated — no reanimated worklets, so it behaves on web too.
 */
export function SwipeToConfirm({
  label,
  busyLabel,
  onConfirm,
  disabled = false,
  confirming = false,
}: SwipeToConfirmProps) {
  const [trackW, setTrackW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const maxX = Math.max(0, trackW - THUMB - PAD * 2);
  const locked = disabled || confirming;

  const reset = () =>
    Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => !locked && Math.abs(g.dx) > 4,
      onPanResponderMove: (_e, g) => {
        if (locked) return;
        x.setValue(clamp(g.dx, 0, maxX));
      },
      onPanResponderRelease: (_e, g) => {
        if (locked) return;
        if (g.dx >= maxX * 0.82 && maxX > 0) {
          Animated.timing(x, {
            toValue: maxX,
            duration: 120,
            useNativeDriver: false,
          }).start(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
              () => {},
            );
            onConfirm();
            setTimeout(() => x.setValue(0), 300);
          });
        } else {
          reset();
        }
      },
    }),
  ).current;

  const labelOpacity = x.interpolate({
    inputRange: [0, Math.max(1, maxX * 0.6)],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={{ height: HEIGHT }}
      className={`justify-center overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800 ${locked ? "opacity-50" : ""}`}
    >
      {/* progress fill */}
      <Animated.View
        style={{
          width: Animated.add(x, new Animated.Value(THUMB + PAD)),
          backgroundColor: "rgba(22,199,132,0.25)",
        }}
        className="absolute left-0 top-0 h-full rounded-2xl"
      />
      <Animated.Text
        style={{ opacity: labelOpacity }}
        className="text-center text-base font-semibold text-neutral-700 dark:text-neutral-200"
      >
        {confirming ? busyLabel : label}
      </Animated.Text>

      <Animated.View
        {...responder.panHandlers}
        style={{ transform: [{ translateX: x }], left: PAD, width: THUMB, height: THUMB }}
        className="absolute items-center justify-center rounded-xl bg-win"
      >
        {confirming ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="arrow-forward" size={22} color="white" />
        )}
      </Animated.View>
    </View>
  );
}
