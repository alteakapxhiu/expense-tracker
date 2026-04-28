import { useMemo, useState } from "react";
import { useCategories, useTransactionsByMonth, useDeleteTransaction, useBudgets } from "@/hooks/useFinanceData";
import { fmtCurrency, MONTHS } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, AlertTriangle, Trash2, Pencil, StickyNote } from "lucide-react";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { CategoryDrilldown } from "@/components/finance/CategoryDrilldown";
import type { Category, Transaction } from "@/types/db";
import { toast } from "sonner";

export default function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [drilldown, setDrilldown] = useState<{ kind: "income" | "expense"; group: string } | null>(null);

  const { data: cats = [] } = useCategories();
  const { data: txs = [] } = useTransactionsByMonth(year, month0);
  const { data: budgets = [] } = useBudgets();
  const del = useDeleteTransaction();

  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of txs) {
      const c = catById.get(t.category_id);
      if (!c) continue;
      if (c.kind === "income") income += Number(t.amount);
      else expense += Number(t.amount);
    }
    return { income, expense, net: income - expense };
  }, [txs, catById]);

  // Group totals by group_name within each kind
  const groupBreakdown = useMemo(() => {
    const groups: Record<"income" | "expense", Map<string, { total: number; cats: Category[] }>> = {
      income: new Map(),
      expense: new Map(),
    };
    for (const c of cats) {
      const g = c.group_name || c.name;
      const bucket = groups[c.kind].get(g) ?? { total: 0, cats: [] };
      bucket.cats.push(c);
      groups[c.kind].set(g, bucket);
    }
    for (const t of txs) {
      const c = catById.get(t.category_id);
      if (!c) continue;
      const g = c.group_name || c.name;
      const bucket = groups[c.kind].get(g);
      if (bucket) bucket.total += Number(t.amount);
    }
    return groups;
  }, [cats, txs, catById]);

  const expensePieData = useMemo(() => {
    const entries: { name: string; value: number; color: string }[] = [];
    for (const [g, info] of groupBreakdown.expense) {
      if (info.total > 0) entries.push({ name: g, value: info.total, color: info.cats[0]?.color ?? "#888" });
    }
    return entries.sort((a, b) => b.value - a.value);
  }, [groupBreakdown]);

  // Last 6 months trend
  const trendData = useMemo(() => {
    const arr: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month0 - i, 1);
      arr.push({ month: MONTHS[d.getMonth()], income: 0, expense: 0 });
    }
    return arr;
  }, [year, month0]);

  // Budget alerts
  const budgetAlerts = useMemo(() => {
    return budgets
      .map((b) => {
        const c = catById.get(b.category_id);
        if (!c) return null;
        const spent = txs.filter((t) => t.category_id === b.category_id).reduce((s, t) => s + Number(t.amount), 0);
        const pct = b.monthly_limit > 0 ? spent / Number(b.monthly_limit) : 0;
        return { cat: c, spent, limit: Number(b.monthly_limit), pct };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.pct >= 0.8)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, txs, catById]);

  const goPrev = () => {
    if (month0 === 0) { setYear((y) => y - 1); setMonth0(11); } else setMonth0((m) => m - 1);
  };
  const goNext = () => {
    if (month0 === 11) { setYear((y) => y + 1); setMonth0(0); } else setMonth0((m) => m + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your monthly money snapshot</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 surface-card px-2 py-1">
            <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium px-3 num min-w-[110px] text-center">{MONTHS[month0]} {year}</span>
            <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <AddTransactionDialog defaultDate={`${year}-${String(month0 + 1).padStart(2, "0")}-15`} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Income" value={totals.income} icon={<TrendingUp className="h-5 w-5" />} tone="income" />
        <KpiCard label="Expenses" value={totals.expense} icon={<TrendingDown className="h-5 w-5" />} tone="expense" />
        <KpiCard label="Net (cash short/extra)" value={totals.net} icon={<Wallet className="h-5 w-5" />} tone={totals.net >= 0 ? "income" : "expense"} signed />
      </div>

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="p-4 surface-card border-warning/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h3 className="font-medium">Budget alerts</h3>
              {budgetAlerts.map((a) => (
                <div key={a.cat.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.cat.color }} />
                    {a.cat.name}
                  </span>
                  <span className={a.pct >= 1 ? "text-expense font-medium num" : "text-warning num"}>
                    {fmtCurrency(a.spent)} / {fmtCurrency(a.limit)} ({Math.round(a.pct * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Group breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GroupSection
          title="Income"
          kind="income"
          groups={groupBreakdown.income}
          onClickGroup={(g) => setDrilldown({ kind: "income", group: g })}
        />
        <GroupSection
          title="Expenses"
          kind="expense"
          groups={groupBreakdown.expense}
          onClickGroup={(g) => setDrilldown({ kind: "expense", group: g })}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 surface-card">
          <h3 className="font-medium mb-4">Expense breakdown</h3>
          {expensePieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No expenses yet this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expensePieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {expensePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => fmtCurrency(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 surface-card">
          <h3 className="font-medium mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[{ month: MONTHS[month0], income: totals.income, expense: totals.expense }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Bar dataKey="income" fill="hsl(var(--income))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="p-5 surface-card">
        <h3 className="font-medium mb-4">All transactions this month</h3>
        {txs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nothing logged yet — add your first transaction above.</p>
        ) : (
          <div className="space-y-1">
            {txs.map((t: Transaction) => {
              const c = catById.get(t.category_id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c?.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{c?.name} · {new Date(t.occurred_on).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium num ${c?.kind === "income" ? "text-income" : "text-expense"}`}>
                      {c?.kind === "income" ? "+" : "-"}{fmtCurrency(Number(t.amount))}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-muted-foreground hover:text-expense">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {drilldown && (
        <CategoryDrilldown
          open={!!drilldown}
          onOpenChange={(o) => !o && setDrilldown(null)}
          group={drilldown.group}
          kind={drilldown.kind}
          year={year}
          month0={month0}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, tone, signed }: { label: string; value: number; icon: React.ReactNode; tone: "income" | "expense"; signed?: boolean }) {
  const bg = tone === "income" ? "bg-gradient-income" : "bg-gradient-expense";
  const color = tone === "income" ? "text-income" : "text-expense";
  return (
    <Card className={`p-5 surface-card relative overflow-hidden ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className={`text-3xl font-semibold tracking-tight num ${color}`}>{fmtCurrency(value, { signed })}</p>
    </Card>
  );
}

function GroupSection({ title, kind, groups, onClickGroup }: {
  title: string;
  kind: "income" | "expense";
  groups: Map<string, { total: number; cats: Category[] }>;
  onClickGroup: (g: string) => void;
}) {
  const entries = Array.from(groups.entries()).sort((a, b) => b[1].total - a[1].total);
  const total = entries.reduce((s, [, info]) => s + info.total, 0);
  const color = kind === "income" ? "text-income" : "text-expense";

  return (
    <Card className="p-5 surface-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{title}</h3>
        <span className={`text-sm font-medium num ${color}`}>{fmtCurrency(total)}</span>
      </div>
      <div className="space-y-1">
        {entries.map(([g, info]) => (
          <button
            key={g}
            onClick={() => onClickGroup(g)}
            className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-accent transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: info.cats[0]?.color }} />
              {g}
            </span>
            <span className="text-sm num text-muted-foreground">{fmtCurrency(info.total)}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
