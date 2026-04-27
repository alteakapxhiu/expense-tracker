export const fmtCurrency = (n: number, opts: { signed?: boolean } = {}) => {
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  if (opts.signed) return n < 0 ? `-${s}` : `+${s}`;
  return n < 0 ? `-${s}` : s;
};

export const fmtCompact = (n: number) =>
  Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, notation: "compact" });

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
