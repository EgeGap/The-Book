import { Platform } from "react-native";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?from=USD&to=TRY";

/**
 * Fetches live USD → TRY rate from frankfurter.dev (free, no key; the old
 * frankfurter.app host now 301-redirects here). Browsers
 * block this host directly (no Access-Control-Allow-Origin), so web routes
 * through the local `scripts/cors-proxy.js` sidecar; native RN fetch has no
 * CORS to work around.
 */
export async function fetchUsdToTry(): Promise<number | null> {
  try {
    const url =
      Platform.OS === "web"
        ? `http://localhost:8788/proxy?url=${encodeURIComponent(FRANKFURTER_URL)}`
        : FRANKFURTER_URL;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { TRY?: number } };
    const rate = data?.rates?.TRY;
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}
