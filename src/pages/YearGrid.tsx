import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories, useTransactionsByYear } from "@/hooks/useFinanceData";
import { fmtCurrency, MONTHS } from "@/lib/format";
import { CategoryDrilldown } from "@/components/finance/CategoryDrilldown";
import type { Category } from "@/types/db";
import { CsvIO } from "@/components/finance/CsvIO";

export default function YearGrid() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [drill, setDrill] = useState<{ group: string; kind: "income" | "expense"; month0: number } | null>(null);
  const { data: cats = [] } = useCategories();
  const { data: txs = [] } = useTransactionsByYear(year);

  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  // Group cats by kind+group_name
  const groupedCats = useMemo(() => {
    const out: Record<"income" | "expense", Map<string, Category[]>> = { income: new Map(), expense: new Map() };
    for (const c of cats) {
      const g = c.group_name || c.name;
      const list = out[c.kind].get(g) ?? [];
      list.push(c);
      out[c.kind].set(g, list);
    }
    return out;
  }, [cats]);

  // Totals: { groupKey: [12 numbers] }
  const groupTotals = useMemo(() => {
    const map: Record<string, number[]> = {};
    const init = () => Array(12).fill(0);
    for (const kind of ["income", "expense"] as const) {
      for (const [g] of groupedCats[kind]) map[`${kind}:${g}`] = init();
    }
    for (const t of txs) {
      const c = catById.get(t.category_id);
      if (!c) continue;
      const m = new Date(t.occurred_on).getMonth();
      const key = `${c.kind}:${c.group_name || c.name}`;
      if (!map[key]) map[key] = init();
      map[key][m] += Number(t.amount);
    }
    return map;
  }, [txs, catById, groupedCats]);

  const monthlyTotals = useMemo(() => {
    const inc = Array(12).fill(0), exp = Array(12).fill(0);
    for (const t of txs) {
      const c = catById.get(t.category_id);
      if (!c) continue;
      const m = new Date(t.occurred_on).getMonth();
      if (c.kind === "income") inc[m] += Number(t.amount);
      else exp[m] += Number(t.amount);
    }
    return { inc, exp, net: inc.map((v, i) => v - exp[i]) };
  }, [txs, catById]);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Year grid</h1>
          <p className="text-muted-foreground text-sm mt-1">Spreadsheet view — click any total to drill in</p>
        </div>
        <div className="flex items-center gap-2">
          <CsvIO year={year} />
          <div className="flex items-center gap-1 surface-card px-2 py-1">
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium px-3 num">{year}</span>
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Card className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/40">
              <th className="text-left font-medium px-4 py-3 sticky left-0 bg-secondary/40 z-10 min-w-[200px]">Category</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right font-medium px-3 py-3 min-w-[90px]">{m}</th>
              ))}
              <th className="text-right font-medium px-4 py-3 min-w-[110px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Income block */}
            <SectionHeader label="Revenue" />
            {Array.from(groupedCats.income.entries()).map(([g]) => {
              const arr = groupTotals[`income:${g}`] ?? Array(12).fill(0);
              const sum = arr.reduce((a, b) => a + b, 0);
              return (
                <tr key={`i-${g}`} className="border-b border-border/40 hover:bg-accent/40 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-card z-10 font-medium">{g}</td>
                  {arr.map((v, i) => (
                    <td key={i} className="text-right px-3 py-2.5 num">
                      <button
                        className={v > 0 ? "text-income hover:underline" : "text-muted-foreground/40"}
                        onClick={() => setDrill({ group: g, kind: "income", month0: i })}
                      >
                        {v > 0 ? fmtCurrency(v) : "—"}
                      </button>
                    </td>
                  ))}
                  <td className="text-right px-4 py-2.5 num font-medium text-income">{fmtCurrency(sum)}</td>
                </tr>
              );
            })}
            <TotalsRow label="Income total" arr={monthlyTotals.inc} tone="income" />

            <SectionHeader label="Expenses" />
            {Array.from(groupedCats.expense.entries()).map(([g]) => {
              const arr = groupTotals[`expense:${g}`] ?? Array(12).fill(0);
              const sum = arr.reduce((a, b) => a + b, 0);
              return (
                <tr key={`e-${g}`} className="border-b border-border/40 hover:bg-accent/40 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-card z-10 font-medium">{g}</td>
                  {arr.map((v, i) => (
                    <td key={i} className="text-right px-3 py-2.5 num">
                      <button
                        className={v > 0 ? "text-expense hover:underline" : "text-muted-foreground/40"}
                        onClick={() => setDrill({ group: g, kind: "expense", month0: i })}
                      >
                        {v > 0 ? fmtCurrency(v) : "—"}
                      </button>
                    </td>
                  ))}
                  <td className="text-right px-4 py-2.5 num font-medium text-expense">{fmtCurrency(sum)}</td>
                </tr>
              );
            })}
            <TotalsRow label="Expense total" arr={monthlyTotals.exp} tone="expense" />

            <tr className="bg-secondary/60 border-t-2 border-border">
              <td className="px-4 py-3 sticky left-0 bg-secondary/60 z-10 font-semibold">Net (cash short/extra)</td>
              {monthlyTotals.net.map((v, i) => (
                <td key={i} className={`text-right px-3 py-3 num font-semibold ${v >= 0 ? "text-income" : "text-expense"}`}>
                  {v === 0 ? "—" : fmtCurrency(v, { signed: true })}
                </td>
              ))}
              <td className={`text-right px-4 py-3 num font-semibold ${monthlyTotals.net.reduce((a, b) => a + b, 0) >= 0 ? "text-income" : "text-expense"}`}>
                {fmtCurrency(monthlyTotals.net.reduce((a, b) => a + b, 0), { signed: true })}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {drill && (
        <CategoryDrilldown
          open={!!drill}
          onOpenChange={(o) => !o && setDrill(null)}
          group={drill.group}
          kind={drill.kind}
          year={year}
          month0={drill.month0}
        />
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-secondary/30">
      <td colSpan={14} className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground sticky left-0 bg-secondary/30">
        {label}
      </td>
    </tr>
  );
}

function TotalsRow({ label, arr, tone }: { label: string; arr: number[]; tone: "income" | "expense" }) {
  const sum = arr.reduce((a, b) => a + b, 0);
  const color = tone === "income" ? "text-income" : "text-expense";
  return (
    <tr className="bg-accent/30 border-b border-border/60">
      <td className="px-4 py-2.5 sticky left-0 bg-accent/60 z-10 font-medium">{label}</td>
      {arr.map((v, i) => (
        <td key={i} className={`text-right px-3 py-2.5 num font-medium ${v > 0 ? color : "text-muted-foreground/40"}`}>
          {v > 0 ? fmtCurrency(v) : "—"}
        </td>
      ))}
      <td className={`text-right px-4 py-2.5 num font-semibold ${color}`}>{fmtCurrency(sum)}</td>
    </tr>
  );
}
