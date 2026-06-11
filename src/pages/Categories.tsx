import { useState } from "react";
import { useCategories, useInvalidateData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { Category } from "@/types/db";
import { toast } from "sonner";
import { z } from "zod";

const PALETTE = ["#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#eab308", "#22c55e", "#a855f7", "#64748b", "#ef4444"];

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(["income", "expense", "hold"]),
  group_name: z.string().trim().max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export default function Categories() {
  const { user } = useAuth();
  const { data: cats = [] } = useCategories();
  const invalidate = useInvalidateData();
  const [color, setColor] = useState(PALETTE[0]);
  const [kind, setKind] = useState<"income" | "expense" | "hold">("expense");

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      kind,
      group_name: (fd.get("group_name") as string) || undefined,
      color,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      group_name: parsed.data.group_name ?? parsed.data.name,
      color: parsed.data.color,
    });
    if (error) return toast.error(error.message);
    toast.success("Category added");
    (e.target as HTMLFormElement).reset();
    invalidate();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidate();
  };

  const grouped = (k: "income" | "expense") => cats.filter((c) => c.kind === k);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize your buckets — defaults are seeded for you.</p>
      </div>

      <Card className="p-5 surface-card">
        <h3 className="font-medium mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> New category</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" name="name" placeholder="e.g. Coffee" required />
          </div>
          <div>
            <Label htmlFor="cat-group">Group (optional)</Label>
            <Input id="cat-group" name="group_name" placeholder="e.g. Personal" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110" : ""}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <Button type="submit" className="md:col-span-5">Add category</Button>
        </form>
      </Card>

      {(["income", "expense"] as const).map((k) => (
        <Card key={k} className="p-5 surface-card">
          <h3 className="font-medium mb-3 capitalize">{k} categories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {grouped(k).map((c: Category) => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-border/60 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.group_name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-muted-foreground hover:text-expense">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
