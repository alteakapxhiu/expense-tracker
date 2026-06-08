import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown, PauseCircle, Banknote, HandCoins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, useUpsertTransaction } from "@/hooks/useFinanceData";
import { useCurrency, CURRENCIES } from "@/hooks/useCurrency";
import type { Category, Transaction } from "@/types/db";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "expense" | "income" | "hold";

type Props = {
  defaultCategoryId?: string;
  defaultKind?: "income" | "expense";
  defaultDate?: string;
  trigger?: React.ReactNode;
  editing?: Transaction | null;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
};

export function AddTransactionDialog({
  defaultCategoryId,
  defaultKind,
  defaultDate,
  trigger,
  editing,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const { user } = useAuth();
  const { data: cats = [] } = useCategories();
  const upsert = useUpsertTransaction();
  const qc = useQueryClient();
  const { currency, rate } = useCurrency();
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();

  // Resolve initial kind: from editing's category, defaultKind, or "expense"
  const editingCat = editing ? cats.find((c) => c.id === editing.category_id) : null;
  const [kind, setKind] = useState<Mode>(editingCat?.kind ?? defaultKind ?? "expense");
  const [holdKind, setHoldKind] = useState<"withdrawn" | "lent">("withdrawn");
  const [categoryId, setCategoryId] = useState<string | undefined>(editing?.category_id ?? defaultCategoryId);
  const [amountInput, setAmountInput] = useState<string>(
    editing ? (Number(editing.amount) * rate).toFixed(currency === "ALL" || currency === "JPY" ? 0 : 2) : ""
  );
  const [description, setDescription] = useState(editing?.description ?? "");
  const [occurredOn, setOccurredOn] = useState(editing?.occurred_on ?? defaultDate ?? today);
  const [notes, setNotes] = useState(editing?.notes ?? "");

  useEffect(() => {
    if (!open) return;
    const ec = editing ? cats.find((c) => c.id === editing.category_id) : null;
    setKind(ec?.kind ?? defaultKind ?? "expense");
    setCategoryId(editing?.category_id ?? defaultCategoryId);
    setAmountInput(editing ? (Number(editing.amount) * rate).toFixed(currency === "ALL" || currency === "JPY" ? 0 : 2) : "");
    setDescription(editing?.description ?? "");
    setOccurredOn(editing?.occurred_on ?? defaultDate ?? today);
    setNotes(editing?.notes ?? "");
  }, [open, editing, defaultCategoryId, defaultKind, defaultDate]);

  const filteredCats = useMemo(() => cats.filter((c) => c.kind === (kind === "hold" ? "expense" : kind)), [cats, kind]);

  // Reset categoryId when switching kind if it doesn't belong anymore
  useEffect(() => {
    if (kind === "hold") return;
    if (categoryId && !filteredCats.find((c) => c.id === categoryId)) setCategoryId(undefined);
  }, [kind, filteredCats, categoryId]);

  const usdPreview = useMemo(() => {
    const n = parseFloat(amountInput.replace(",", "."));
    if (!isFinite(n) || n <= 0 || rate === 0) return null;
    return n / rate;
  }, [amountInput, rate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const n = parseFloat(amountInput.replace(",", "."));
    if (!isFinite(n) || n <= 0) return toast.error("Enter an amount");
    if (!description.trim()) return toast.error("Add a short description");
    if (rate === 0) return toast.error("Currency rate unavailable");
    const usdAmount = n / rate;

    try {
      if (kind === "hold") {
        const { error } = await supabase.from("holds").insert({
          user_id: user.id,
          title: description.trim(),
          amount: Number(usdAmount.toFixed(4)),
          kind: holdKind,
          notes: notes.trim() || null,
          occurred_on: occurredOn,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["holds"] });
        toast.success("Added to On Hold");
      } else {
        if (!categoryId) return toast.error("Pick a category");
        await upsert.mutateAsync({
          id: editing?.id,
          user_id: user.id,
          description: description.trim(),
          amount: Number(usdAmount.toFixed(4)),
          category_id: categoryId,
          occurred_on: occurredOn,
          notes: notes.trim() || null,
        });
        toast.success(editing ? "Updated" : "Saved");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add transaction
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md p-0 gap-0 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-2 sm:px-5 sm:pt-5 sm:pb-3">
          <DialogTitle className="text-base sm:text-xl">{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3 sm:space-y-5">
          {/* Kind segmented toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/60">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 sm:py-2.5 rounded-lg text-sm font-medium transition-colors",
                kind === "expense" ? "bg-background shadow-sm text-expense" : "text-muted-foreground"
              )}
            >
              <TrendingDown className="h-4 w-4" /> Expense
            </button>
            <button
              type="button"
              onClick={() => setKind("income")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 sm:py-2.5 rounded-lg text-sm font-medium transition-colors",
                kind === "income" ? "bg-background shadow-sm text-income" : "text-muted-foreground"
              )}
            >
              <TrendingUp className="h-4 w-4" /> Income
            </button>
          </div>

          {/* Amount big input */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">Amount ({currency})</Label>
              {usdPreview !== null && currency !== "USD" && (
                <span className="text-[10px] sm:text-xs text-muted-foreground num">≈ ${usdPreview.toFixed(2)}</span>
              )}
            </div>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-semibold text-muted-foreground pointer-events-none">
                {symbol}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value.replace(/[^\d.,]/g, ""))}
                className="h-12 sm:h-16 text-xl sm:text-3xl font-semibold pl-10 sm:pl-12 pr-3 num text-right tracking-tight"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="tx-desc" className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">What for?</Label>
            <Input
              id="tx-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Groceries at Spar"
              className="h-10 sm:h-12 mt-1"
              autoComplete="off"
            />
          </div>

          {/* Category chips */}
          <div>
            <Label className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 sm:max-h-none overflow-y-auto">
              {filteredCats.map((c: Category) => {
                const active = categoryId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-2 rounded-full border text-xs sm:text-sm transition-all",
                      active
                        ? "border-primary bg-primary/10 text-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                );
              })}
              {filteredCats.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No {kind} categories yet.</p>
              )}
            </div>
          </div>

          {/* Date with quick chips */}
          <div>
            <Label htmlFor="tx-date" className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">When</Label>
            <div className="flex gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setOccurredOn(today)}
                className={cn(
                  "px-2.5 h-10 sm:h-12 rounded-lg text-xs sm:text-sm border transition-colors",
                  occurredOn === today ? "border-primary bg-primary/10" : "border-border"
                )}
              >Today</button>
              <button
                type="button"
                onClick={() => setOccurredOn(yesterday)}
                className={cn(
                  "px-2.5 h-10 sm:h-12 rounded-lg text-xs sm:text-sm border transition-colors",
                  occurredOn === yesterday ? "border-primary bg-primary/10" : "border-border"
                )}
              >Yest.</button>
              <Input
                id="tx-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="h-10 sm:h-12 flex-1 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <details className="group">
            <summary className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground cursor-pointer list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▸</span> Notes (optional)
            </summary>
            <Textarea
              id="tx-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra detail…"
              className="mt-1.5"
            />
          </details>

          <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={upsert.isPending}>
            {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Save transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
