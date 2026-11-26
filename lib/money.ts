export const CURRENCIES = ["usd", "eur", "gbp"] as const;
export type Currency = (typeof CURRENCIES)[number];

const SYMBOLS: Record<string, string> = {
  usd: "$",
  eur: "€",
  gbp: "£",
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? "";
}

export function formatMoney(minor: number, currency = "usd"): string {
  const amount = minor / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? "-" : "";
  const symbol = currencySymbol(currency);
  return currency === "eur" || currency === "gbp"
    ? `${sign}${symbol}${formatted}`
    : `${sign}${symbol}${formatted}`;
}

export function formatCompactMinor(minor: number, currency = "usd"): string {
  return `${currencySymbol(currency)}${(minor / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export function allocateMinor(totalMinor: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const scale = 10_000n;
  const scaled = weights.map((weight) => {
    const n = Number.isFinite(weight) ? weight : 0;
    return BigInt(Math.round(Math.max(n, 0) * Number(scale)));
  });
  const weightSum = scaled.reduce((sum, value) => sum + value, 0n);
  const negative = totalMinor < 0;
  const magnitude = BigInt(Math.abs(Math.trunc(totalMinor)));

  if (weightSum === 0n) {
    const base = magnitude / BigInt(scaled.length);
    let left = magnitude - base * BigInt(scaled.length);
    const result = scaled.map(() => Number(base));
    for (let i = 0; i < result.length && left > 0n; i += 1, left -= 1n) {
      result[i] += 1;
    }
    return negative ? result.map((value) => -value) : result;
  }

  const shares = scaled.map((value) => (magnitude * value) / weightSum);
  const remainders = scaled.map((value) => (magnitude * value) % weightSum);
  let left = magnitude - shares.reduce((sum, value) => sum + value, 0n);

  const order = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
    );

  const result = shares.map((value) => Number(value));
  for (const { index } of order) {
    if (left <= 0n) break;
    result[index] += 1;
    left -= 1n;
  }

  return negative ? result.map((value) => -value) : result;
}

export function monthlyAmountMinor(
  unitAmountMinor: number,
  interval: string,
): number {
  if (interval === "year") return Math.round(unitAmountMinor / 12);
  if (interval === "month") return unitAmountMinor;
  return 0;
}
