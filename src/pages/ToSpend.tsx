import { useState, useMemo } from "react";
import { useCurrencyTick } from "@/hooks/useCurrency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useFinanceData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Calendar as CalendarIcon, Wallet } from "lucide-react";
import { fmtCurrency } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PlannedExpense = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  amount: number;
  priority: "low" | "medium" | "high";
  target_date: string | null;
  notes: string | null;
  status: "planned" | "done" | "skipped";
  created_at: string;
};

const usePlanned = () =>
  useQuery({
    queryKey: ["planned"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planned_expenses" as any)
        .select("*")
        .order("status")
        .order("target_date", { nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PlannedExpense[];
    },
  });

const priorityStyles: Record<string, string> = {
  high: "bg-expense/15 text-expense border-expense/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-primary/15 text-primary border-primary/30",
};

export default function ToSpend() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: cats = [] } = useCategories();
  const { data: items = [] } = usePlanned();
  const [open, setOpen] = useState(false);

  const expenseCats = useMemo(() => cats.filter((c) => c.kind === "expense"), [cats]);

  const planned = items.filter((i) => i.status === "planned");
  const done = items.filter((i) => i.status === "done");
  const totalPlanned = planned.reduce((s, i) => s + Number(i.amount), 0);
  const highPriority = planned.filter((i) => i.priority === "high").length;

  const create = useMutation({
    mutationFn: async (payload: Partial<PlannedExpense>) => {
      const { error } = await supabase.from("planned_expenses" as any).insert({
        ...payload,
        user_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planned"] });
      toast.success("Added to your To Spend list");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PlannedExpense> }) => {
      const { error } = await supabase.from("planned_expenses" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planned"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planned_expenses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planned"] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    const amount = Number(fd.get("amount"));
    if (!title || !amount || amount <= 0) return toast.error("Title and amount required");
    create.mutate({
      title,
      amount,
      priority: (fd.get("priority") as any) || "medium",
      target_date: (fd.get("target_date") as string) || null,
      notes: (fd.get("notes") as string) || null,
      category_id: (fd.get("category_id") as string) || null,
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">To Spend</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan future or pending expenses you haven't paid yet.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add planned expense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="p-title">What do you plan to buy?</Label>
                <Input id="p-title" name="title" placeholder="e.g. New laptop, dentist visit" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="p-amount">Amount (USD)</Label>
                  <Input id="p-amount" name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div>
                  <Label htmlFor="p-date">Target date (optional)</Label>
                  <Input id="p-date" name="target_date" type="date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low — nice to have</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High — must do</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category (optional)</Label>
                  <Select name="category_id">
                    <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                    <SelectContent>
                      {expenseCats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="p-notes">Notes (optional)</Label>
                <Textarea id="p-notes" name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add to list"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryCard label="Items planned" value={String(planned.length)} icon={<Wallet className="h-4 w-4" />} />
        <SummaryCard label="Total planned" value={fmtCurrency(totalPlanned)} accent />
        <SummaryCard label="High priority" value={String(highPriority)} icon={<CalendarIcon className="h-4 w-4" />} />
      </div>

      <section className="surface-card p-4 md:p-6 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Planned</h2>
        {planned.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nothing planned yet. Click <strong>New plan</strong> to add an upcoming expense.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {planned.map((p) => {
              const cat = cats.find((c) => c.id === p.category_id);
              return (
                <li key={p.id} className="py-3 flex items-start gap-3">
                  <button
                    onClick={() => update.mutate({ id: p.id, patch: { status: "done" } })}
                    className="mt-1 h-5 w-5 rounded-md border border-border hover:border-primary hover:bg-primary/10 flex items-center justify-center transition"
                    title="Mark as paid"
                  >
                    <Check className="h-3 w-3 opacity-0 hover:opacity-100" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-medium truncate">{p.title}</p>
                      <Badge variant="outline" className={cn("text-[10px] uppercase", priorityStyles[p.priority])}>{p.priority}</Badge>
                      {cat && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                      {p.target_date && <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {new Date(p.target_date).toLocaleDateString()}</span>}
                      {p.notes && <span className="truncate">{p.notes}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="num font-semibold text-expense">{fmtCurrency(Number(p.amount))}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => del.mutate(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="surface-card p-4 md:p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Completed</h2>
          <ul className="divide-y divide-border/60">
            {done.map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm line-through text-muted-foreground truncate">{p.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="num text-sm text-muted-foreground">{fmtCurrency(Number(p.amount))}</span>
                  <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: p.id, patch: { status: "planned" } })}>Undo</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => del.mutate(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent, icon }: { label: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={cn("surface-card p-4 flex items-center justify-between", accent && "bg-gradient-primary text-primary-foreground border-transparent")}>
      <div>
        <p className={cn("text-xs uppercase tracking-wide", accent ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</p>
        <p className="text-2xl font-semibold num mt-1">{value}</p>
      </div>
      {icon && <div className={cn("opacity-70", accent && "text-primary-foreground")}>{icon}</div>}
    </div>
  );
}
