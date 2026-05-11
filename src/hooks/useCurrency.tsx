import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type CurrencyCode = "USD" | "EUR" | "ALL" | "GBP" | "CHF" | "CAD" | "AUD" | "JPY";

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "ALL", symbol: "L", label: "Albanian Lek" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
];

// Reasonable fallback rates from 1 USD (used until live rates load / offline)
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  ALL: 92,
  GBP: 0.79,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.51,
  JPY: 156,
};

// Module-level mirror so fmtCurrency (used everywhere) can read it without prop drilling
export const currencyStore: { code: CurrencyCode; rate: number; symbol: string } = {
  code: (localStorage.getItem("currency") as CurrencyCode) || "USD",
  rate: 1,
  symbol: CURRENCIES.find((c) => c.code === ((localStorage.getItem("currency") as CurrencyCode) || "USD"))?.symbol || "$",
};

type Ctx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: Record<string, number>;
  rate: number;
  convert: (usdAmount: number) => number;
};

const CurrencyContext = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(currencyStore.code);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = localStorage.getItem("fx_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < 6 * 60 * 60 * 1000) {
            if (!cancelled) setRates({ ...FALLBACK_RATES, ...parsed.rates });
            return;
          }
        }
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const j = await r.json();
        if (j?.rates && !cancelled) {
          setRates({ ...FALLBACK_RATES, ...j.rates });
          localStorage.setItem("fx_cache", JSON.stringify({ ts: Date.now(), rates: j.rates }));
        }
      } catch {
        /* fallback rates already set */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    localStorage.setItem("currency", c);
    setCurrencyState(c);
  };

  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;

  useEffect(() => {
    currencyStore.code = currency;
    currencyStore.rate = rate;
    currencyStore.symbol = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";
    // Force any consumers using fmtCurrency to re-render via a tiny global event
    window.dispatchEvent(new Event("currency-changed"));
  }, [currency, rate]);

  const value = useMemo<Ctx>(() => ({
    currency,
    setCurrency,
    rates,
    rate,
    convert: (usd: number) => usd * rate,
  }), [currency, rates, rate]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: currencyStore.code,
      setCurrency: () => {},
      rates: FALLBACK_RATES as Record<string, number>,
      rate: currencyStore.rate,
      convert: (usd: number) => usd * currencyStore.rate,
    } satisfies Ctx;
  }
  return ctx;
}

// Hook to subscribe components that use fmtCurrency() to currency changes
export function useCurrencyTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener("currency-changed", h);
    return () => window.removeEventListener("currency-changed", h);
  }, []);
}
