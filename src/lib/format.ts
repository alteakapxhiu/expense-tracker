import { currencyStore } from "@/hooks/useCurrency";

export const fmtCurrency = (usdAmount: number, opts: { signed?: boolean; raw?: boolean } = {}) => {
  const { code, rate, symbol } = currencyStore;
  // opts.raw means amount is already in the target currency, don't convert
  const converted = opts.raw ? usdAmount : usdAmount * rate;
  const abs = Math.abs(converted);
  const useNoDecimals = code === "ALL" || code === "JPY";
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: useNoDecimals ? 0 : 2,
    maximumFractionDigits: useNoDecimals ? 0 : 2,
  });
  const withSymbol = code === "ALL" ? `${formatted} L` : code === "CHF" ? `CHF ${formatted}` : `${symbol}${formatted}`;
  if (opts.signed) return converted < 0 ? `-${withSymbol}` : `+${withSymbol}`;
  return converted < 0 ? `-${withSymbol}` : withSymbol;
};

export const fmtCompact = (usdAmount: number) => {
  const { code, rate, symbol } = currencyStore;
  const converted = usdAmount * rate;
  const formatted = Math.abs(converted).toLocaleString("en-US", { maximumFractionDigits: 0, notation: "compact" });
  return code === "ALL" ? `${formatted} L` : code === "CHF" ? `CHF ${formatted}` : `${symbol}${formatted}`;
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export const monthKey = (year: number, month0: number) =>
  `${year}-${String(month0 + 1).padStart(2, "0")}`;

export const monthRange = (year: number, month0: number) => {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};
