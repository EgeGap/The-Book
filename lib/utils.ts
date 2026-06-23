/** Collision-resistant id without pulling in a uuid dependency. */
export function uid(prefix = "t"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/** Format an R-multiple with a leading sign, e.g. "+2.31R" / "-1.00R". */
export function formatR(r: number | null | undefined): string {
  if (r == null || Number.isNaN(r)) return "—";
  const sign = r > 0 ? "+" : "";
  return `${sign}${r.toFixed(2)}R`;
}

/** Format account-currency money with a sign and thousands separators. */
export function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

export function formatPercent(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

/** Format an amount with its currency code, e.g. "9.99 USD" / "330 TRY". */
export function formatAmount(amount: number, currency: string): string {
  const n = amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${n} ${currency}`;
}

/** Clamp a parsed numeric input; returns NaN for empty so callers can branch. */
export function parseNum(value: string): number {
  if (value.trim() === "") return NaN;
  return Number(value.replace(",", "."));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
