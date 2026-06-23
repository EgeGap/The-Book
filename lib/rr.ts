import type { Direction } from "./constants";

export interface RRInputs {
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
}

export interface RRValidation {
  ok: boolean;
  /** Field-level messages keyed for inline display. */
  errors: { stopLoss?: string; takeProfit?: string };
}

const isNum = (n: number) => Number.isFinite(n) && !Number.isNaN(n);

/**
 * Validate that SL/TP sit on the correct side of entry for the direction.
 * Long  -> SL below entry, TP above entry.
 * Short -> SL above entry, TP below entry.
 */
export function validateLevels(i: RRInputs): RRValidation {
  const errors: RRValidation["errors"] = {};
  if (!isNum(i.entry) || i.entry <= 0) {
    return { ok: false, errors: { stopLoss: "Enter a valid entry price first" } };
  }
  if (isNum(i.stopLoss)) {
    if (i.direction === "long" && i.stopLoss >= i.entry) {
      errors.stopLoss = "For a long, stop loss must be BELOW entry";
    }
    if (i.direction === "short" && i.stopLoss <= i.entry) {
      errors.stopLoss = "For a short, stop loss must be ABOVE entry";
    }
  }
  if (isNum(i.takeProfit)) {
    if (i.direction === "long" && i.takeProfit <= i.entry) {
      errors.takeProfit = "For a long, take profit must be ABOVE entry";
    }
    if (i.direction === "short" && i.takeProfit >= i.entry) {
      errors.takeProfit = "For a short, take profit must be BELOW entry";
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Per-unit risk distance (always positive when levels are valid). */
export function riskDistance(i: Omit<RRInputs, "takeProfit">): number {
  return i.direction === "long" ? i.entry - i.stopLoss : i.stopLoss - i.entry;
}

/**
 * Planned reward:risk. Returns 0 when inputs are incomplete or invalid so the
 * UI can render a stable number while the user is still typing.
 */
export function plannedRR(i: RRInputs): number {
  if (!isNum(i.entry) || !isNum(i.stopLoss) || !isNum(i.takeProfit)) return 0;
  const risk = riskDistance(i);
  if (risk <= 0) return 0;
  const reward =
    i.direction === "long" ? i.takeProfit - i.entry : i.entry - i.takeProfit;
  if (reward <= 0) return 0;
  return round2(reward / risk);
}

/**
 * Realized R achieved at the given exit price (can be negative).
 * Returns null when the trade math is not computable.
 */
export function realizedRR(
  i: Omit<RRInputs, "takeProfit">,
  exitPrice: number,
): number | null {
  if (!isNum(exitPrice)) return null;
  const risk = riskDistance(i);
  if (risk <= 0) return null;
  const move =
    i.direction === "long" ? exitPrice - i.entry : i.entry - exitPrice;
  return round2(move / risk);
}

/**
 * Convert realized R into account-currency P&L.
 * Model: 1R == riskPercent of the starting balance.
 */
export function pnlFromR(
  rMultiple: number,
  riskPercent: number,
  startingBalance: number,
): number {
  const riskAmount = (riskPercent / 100) * startingBalance;
  return round2(rMultiple * riskAmount);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
