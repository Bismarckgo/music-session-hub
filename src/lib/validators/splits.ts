export type SplitSumResult = { sum: number; valid: boolean; error?: string };
export type SplitRangeResult = { valid: boolean; error?: string };

export function validateSplitSum(shares: Array<number | string>): SplitSumResult {
  const nums = shares.map((s) => Number(s ?? 0));
  if (nums.some((n) => !isFinite(n) || isNaN(n))) {
    return { sum: NaN, valid: false, error: "Algunos splits no son numéricos" };
  }
  const rawSum = nums.reduce((a, b) => a + b, 0);
  const sum = Math.round(rawSum * 100) / 100; // round to 2 decimals for display
  const valid = Math.abs(sum - 100) < 0.01; // allow minor floating point error
  return valid ? { sum, valid } : { sum, valid: false, error: `Los splits suman ${sum}% (deben sumar 100%)` };
}

export function validateSplitRange(share: number | string): SplitRangeResult {
  const n = Number(share);
  if (!isFinite(n) || isNaN(n)) return { valid: false, error: "Split no es numérico" };
  if (n < 0) return { valid: false, error: "Split no puede ser negativo" };
  if (n > 100) return { valid: false, error: "Split no puede exceder 100%" };
  // Optional: restrict precision to 2 decimals
  const decimals = String(n).split(".")[1];
  if (decimals && decimals.length > 2) return { valid: false, error: "Split no puede tener más de 2 decimales" };
  return { valid: true };
}
