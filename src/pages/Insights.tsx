import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories, useTransactionsByMonth, useTransactionsByYear } from "@/hooks/useFinanceData";
import { fmtCurrency, MONTHS } from "@/lib/format";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";

export default function Insights() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const { data: cats = [] } = useCategories();
  const { data: monthTxs = [] } = useTransactionsByMonth(year, month0);
  const { data: yearTxs = [] } = useTransactionsByYear(year);
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const expensePie = useMemo(() => {
    const m = new Map<string, { value: number; color: string }>();
    for (const t of monthTxs) {
      const c = catById.get(t.category_id);
      if (!c || c.kind !== "expense") continue;
      const g = c.group_name || c.name;
      const b = m.get(g) ?? { value: 0, color: c.color };
      b.value += Number(t.amount);
      m.set(g, b);
    }
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value);
  }, [monthTxs, catById]);

  const trend = useMemo(() => {
    const arr = MONTHS.map((m) => ({ month: m, income: 0, expense: 0 }));
    for (const t of yearTxs) {
      const c = catById.get(t.category_id);
      if (!c) continue;
      const i = new Date(t.occurred_on).getMonth();
      if (c.kind === "income") arr[i].income += Number(t.amount);
      else arr[i].expense += Number(t.amount);
    }
    return arr;
  }, [yearTxs, catById]);

  const goPrev = () => month0 === 0 ? (setYear((y) => y - 1), setMonth0(11)) : setMonth0((m) => m - 1);
  const goNext = () => month0 === 11 ? (setYear((y) => y + 1), setMonth0(0)) : setMonth0((m) => m + 1);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
          <p className="text-muted-foreground text-sm mt-1">Charts and trends across your finances</p>
        </div>
        <div className="flex items-center gap-1 surface-card px-2 py-1">
          <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium px-3 num min-w-[110px] text-center">{MONTHS[month0]} {year}</span>
          <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 surface-card">
          <h3 className="font-medium mb-4">Expense breakdown — {MONTHS[month0]}</h3>
          {expensePie.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No expenses this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expensePie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {expensePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }} formatter={(v: number) => fmtCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 surface-card">
          <h3 className="font-medium mb-4">Income vs Expenses — {year}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }} formatter={(v: number) => fmtCurrency(v)} />
              <Legend />
              <Bar dataKey="income" fill="hsl(var(--income))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 surface-card lg:col-span-2">
          <h3 className="font-medium mb-4">Net cash trend — {year}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend.map((t) => ({ month: t.month, net: t.income - t.expense }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }} formatter={(v: number) => fmtCurrency(v, { signed: true })} />
              <Line type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
