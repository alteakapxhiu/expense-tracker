import { useMemo, useState } from "react";
import { useCategories, useBudgets, useInvalidateData, useTransactionsByMonth } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtCurrency } from "@/lib/format";
import { toast } from "sonner";

export default function Budgets() {
  const { user } = useAuth();
  const { data: cats = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const now = new Date();
  const { data: txs = [] } = useTransactionsByMonth(now.getFullYear(), now.getMonth());
  const invalidate = useInvalidateData();

  const budgetByCat = useMemo(() => new Map(budgets.map((b) => [b.category_id, Number(b.monthly_limit)])), [budgets]);
  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txs) m.set(t.category_id, (m.get(t.category_id) ?? 0) + Number(t.amount));
    return m;
  }, [txs]);

  const expenseCats = cats.filter((c) => c.kind === "expense");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const save = async (categoryId: string) => {
    if (!user) return;
    const raw = drafts[categoryId] ?? "";
    const limit = Number(raw);
    if (!Number.isFinite(limit) || limit < 0) return toast.error("Enter a valid number");

    if (limit === 0) {
      const { error } = await supabase.from("budgets").delete().eq("category_id", categoryId).eq("user_id", user.id);
      if (error) return toast.error(error.message);
      toast.success("Budget removed");
    } else {
      const { error } = await supabase
        .from("budgets")
        .upsert({ user_id: user.id, category_id: categoryId, monthly_limit: limit }, { onConflict: "user_id,category_id" });
      if (error) return toast.error(error.message);
      toast.success("Budget saved");
    }
    setDrafts((d) => { const n = { ...d }; delete n[categoryId]; return n; });
    invalidate();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Monthly budgets</h1>
        <p className="text-muted-foreground text-sm mt-1">Set a cap per expense category. Set to 0 to remove.</p>
      </div>

      <Card className="surface-card divide-y divide-border/60">
        {expenseCats.map((c) => {
          const limit = budgetByCat.get(c.id) ?? 0;
          const spent = spentByCat.get(c.id) ?? 0;
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const draft = drafts[c.id] ?? (limit ? String(limit) : "");
          const over = limit > 0 && spent > limit;
          const warn = limit > 0 && pct >= 80 && !over;
          return (
            <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 md:w-56 shrink-0">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.group_name}</p>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={over ? "text-expense font-medium" : warn ? "text-warning" : "text-muted-foreground"}>
                    {fmtCurrency(spent)} {limit > 0 ? `/ ${fmtCurrency(limit)}` : ""}
                  </span>
                  {limit > 0 && <span className="num text-muted-foreground">{Math.round((spent / limit) * 100)}%</span>}
                </div>
                <Progress value={pct} className={over ? "[&>div]:bg-expense" : warn ? "[&>div]:bg-warning" : ""} />
              </div>
              <div className="flex gap-2 md:w-56">
                <Input
                  type="number" min="0" step="1" placeholder="No limit"
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                />
                <Button onClick={() => save(c.id)} size="sm">Save</Button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
