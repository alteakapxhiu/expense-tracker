import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, useUpsertTransaction } from "@/hooks/useFinanceData";
import type { Category } from "@/types/db";
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
};

export function AddTransactionDialog({ defaultCategoryId, defaultKind, defaultDate, trigger }: Props) {
  const { user } = useAuth();
  const { data: cats = [] } = useCategories();
  const upsert = useUpsertTransaction();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(defaultCategoryId);
  const today = new Date().toISOString().slice(0, 10);

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
        user_id: user.id,
        description,
        amount,
        category_id,
        occurred_on,
        notes: notes ?? null,
      });
      toast.success("Saved");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tx-desc">Description</Label>
            <Input id="tx-desc" name="description" placeholder="e.g. Claude Code subscription" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-amount">Amount (USD)</Label>
              <Input id="tx-amount" name="amount" type="number" step="0.01" min="0.01" required />
            </div>
            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" name="occurred_on" type="date" defaultValue={defaultDate ?? today} required />
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
            <Input id="tx-notes" name="notes" />
          </div>
          <Button type="submit" className="w-full" disabled={upsert.isPending}>
            {upsert.isPending ? "Saving…" : "Save transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
