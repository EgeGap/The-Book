import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { format } from "date-fns";
import type { Expense } from "./types";

function csvCell(value: unknown): string {
  if (value == null) return "";
  const raw = Array.isArray(value) ? value.join("; ") : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

const mimeFor = (fmt: "json" | "csv") =>
  fmt === "json" ? "application/json" : "text/csv";

/**
 * Save + share the content. On web we trigger a browser download (Blob); on
 * native we write a temp file and open the OS share sheet.
 */
async function saveAndShare(filename: string, content: string, mime: string): Promise<void> {
  if (Platform.OS === "web") {
    const g = globalThis as any;
    const blob = new g.Blob([content], { type: mime });
    const url = g.URL.createObjectURL(blob);
    const a = g.document.createElement("a");
    a.href = url;
    a.download = filename;
    g.document.body.appendChild(a);
    a.click();
    a.remove();
    g.URL.revokeObjectURL(url);
    return;
  }
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: filename });
  }
}

// ── Expenses ────────────────────────────────────────────────────────────────

export function expensesToJSON(expenses: Expense[]): string {
  return JSON.stringify(expenses, null, 2);
}

const EXPENSE_CSV_COLUMNS: (keyof Expense)[] = [
  "id", "name", "amount", "currency", "category", "cycle", "billingDay",
  "paymentMethod", "active", "notes", "startedAt", "createdAt",
];

export function expensesToCSV(expenses: Expense[]): string {
  const header = EXPENSE_CSV_COLUMNS.join(",");
  const rows = expenses.map((e) =>
    EXPENSE_CSV_COLUMNS.map((col) => csvCell(e[col])).join(","),
  );
  return [header, ...rows].join("\n");
}

/** Export all expenses (web download / native share sheet). */
export async function exportExpenses(expenses: Expense[], fmt: "json" | "csv"): Promise<void> {
  const stamp = format(new Date(), "yyyyMMdd-HHmm");
  const content = fmt === "json" ? expensesToJSON(expenses) : expensesToCSV(expenses);
  await saveAndShare(`smc-giderler-${stamp}.${fmt}`, content, mimeFor(fmt));
}
