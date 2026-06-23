import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { format } from "date-fns";
import type { Trade } from "./types";

/** Pretty JSON of every trade (pure / testable). */
export function tradesToJSON(trades: Trade[]): string {
  return JSON.stringify(trades, null, 2);
}

const CSV_COLUMNS: (keyof Trade)[] = [
  "id", "symbol", "direction", "status", "session", "htfBias", "biasTimeframe",
  "entryTimeframe", "setupType", "zone", "entry", "stopLoss", "takeProfit",
  "riskPercent", "plannedRR", "realizedRR", "pnl", "result", "exitPrice",
  "confluences", "mistakes", "entryReason", "notes", "createdAt", "closedAt",
];

function csvCell(value: unknown): string {
  if (value == null) return "";
  const raw = Array.isArray(value) ? value.join("; ") : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** Flat CSV with array fields joined by "; " (pure / testable). */
export function tradesToCSV(trades: Trade[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = trades.map((t) =>
    CSV_COLUMNS.map((col) => csvCell(t[col])).join(","),
  );
  return [header, ...rows].join("\n");
}

/** Write the export to a temp file and open the OS share sheet. */
export async function exportTrades(
  trades: Trade[],
  fmt: "json" | "csv",
): Promise<void> {
  const stamp = format(new Date(), "yyyyMMdd-HHmm");
  const filename = `smc-journal-${stamp}.${fmt}`;
  const uri = FileSystem.cacheDirectory + filename;
  const content = fmt === "json" ? tradesToJSON(trades) : tradesToCSV(trades);
  await FileSystem.writeAsStringAsync(uri, content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: fmt === "json" ? "application/json" : "text/csv",
      dialogTitle: "Export trades",
    });
  }
}
