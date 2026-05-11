import { useMemo, useState } from "react";
import { useCurrencyTick } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useCategories, useTransactionsByMonth, useDeleteTransaction } from "@/hooks/useFinanceData";
import { fmtCurrency, MONTHS } from "@/lib/format";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  group: string;
  kind: "income" | "expense";
  year: number;
  month0: number;
};

export function CategoryDrilldown({ open, onOpenChange, group, kind, year, month0 }: Props) {
  const { data: cats = [] } = useCategories();
  const { data: txs = [] } = useTransactionsByMonth(year, month0);
  const del = useDeleteTransaction();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const groupCats = useMemo(
    () => cats.filter((c) => c.kind === kind && (c.group_name || c.name) === group),
    [cats, kind, group]
  );

  const catItems = useMemo(() => {
    const map = new Map<string, { total: number; items: typeof txs }>();
    for (const c of groupCats) map.set(c.id, { total: 0, items: [] });
    for (const t of txs) {
      const bucket = map.get(t.category_id);
      if (!bucket) continue;
      bucket.items.push(t);
      bucket.total += Number(t.amount);
    }
    return map;
  }, [txs, groupCats]);

  const groupTotal = Array.from(catItems.values()).reduce((s, b) => s + b.total, 0);
  const color = kind === "income" ? "text-income" : "text-expense";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-baseline justify-between gap-4">
            <span>{group}</span>
            <span className={`text-sm font-medium num ${color}`}>{fmtCurrency(groupTotal)} · {MONTHS[month0]} {year}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Click a category to see line items, or add new ones.</p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {groupCats.map((c) => {
            const bucket = catItems.get(c.id)!;
            const isActive = activeCat === c.id;
            return (
              <div key={c.id} className="border border-border/60 rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveCat(isActive ? null : c.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors"
                >
                  <span className="flex items-center gap-2 font-medium text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                    <span className="text-xs text-muted-foreground font-normal">({bucket.items.length} items)</span>
                  </span>
                  <span className={`text-sm font-medium num ${color}`}>{fmtCurrency(bucket.total)}</span>
                </button>

                {isActive && (
                  <div className="border-t border-border/60 bg-secondary/30 px-4 py-3 space-y-2">
                    {bucket.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No items yet.</p>
                    ) : (
                      bucket.items.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <p className="truncate">{t.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(t.occurred_on).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="num font-medium">{fmtCurrency(Number(t.amount))}</span>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense"
                              onClick={async () => {
                                try { await del.mutateAsync(t.id); toast.success("Deleted"); }
                                catch (e: any) { toast.error(e.message); }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="pt-2">
                      <AddTransactionDialog
                        defaultCategoryId={c.id}
                        defaultKind={kind}
                        defaultDate={`${year}-${String(month0 + 1).padStart(2, "0")}-15`}
                        trigger={<Button variant="outline" size="sm" className="w-full">+ Add item to {c.name}</Button>}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
