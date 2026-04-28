import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, useUpsertTransaction } from "@/hooks/useFinanceData";
import type { Category, Transaction } from "@/types/db";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  description: z.string().trim().min(1, "Required").max(120),
  amount: z.number().positive("Must be > 0").max(1_000_000_000),
  category_id: z.string().uuid(),
  occurred_on: z.string().min(1),
  notes: z.string().max(500).optional(),
});

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
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [categoryId, setCategoryId] = useState<string | undefined>(editing?.category_id ?? defaultCategoryId);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (open) setCategoryId(editing?.category_id ?? defaultCategoryId);
  }, [open, editing, defaultCategoryId]);

  const filteredCats = useMemo(
    () => (defaultKind ? cats.filter((c) => c.kind === defaultKind) : cats),
    [cats, defaultKind]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!categoryId) return toast.error("Pick a category");
    const parsed = schema.safeParse({
      description: fd.get("description"),
      amount: Number(fd.get("amount")),
      category_id: categoryId,
      occurred_on: fd.get("occurred_on"),
      notes: (fd.get("notes") as string) || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!user) return;

    try {
      const { description, amount, category_id, occurred_on, notes } = parsed.data;
      await upsert.mutateAsync({
        id: editing?.id,
        user_id: user.id,
        description,
        amount,
        category_id,
        occurred_on,
        notes: notes ?? null,
      });
      toast.success(editing ? "Updated" : "Saved");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tx-desc">Description</Label>
            <Input id="tx-desc" name="description" defaultValue={editing?.description ?? ""} placeholder="e.g. Claude Code subscription" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-amount">Amount (USD)</Label>
              <Input id="tx-amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={editing?.amount ?? ""} required />
            </div>
            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" name="occurred_on" type="date" defaultValue={editing?.occurred_on ?? defaultDate ?? today} required />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {(["income", "expense"] as const).map((kind) => {
                  const list = filteredCats.filter((c: Category) => c.kind === kind);
                  if (!list.length) return null;
                  return (
                    <div key={kind}>
                      <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">{kind}</div>
                      {list.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tx-notes">Notes (optional)</Label>
            <Textarea id="tx-notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""} placeholder="Any extra detail…" />
          </div>
          <Button type="submit" className="w-full" disabled={upsert.isPending}>
            {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Save transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
