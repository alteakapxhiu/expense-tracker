import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency } from "@/lib/format";
import { Trash2, Check, Undo2, PauseCircle, HandCoins, Banknote } from "lucide-react";
import { toast } from "sonner";

type Hold = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  kind: "withdrawn" | "lent";
  notes: string | null;
  occurred_on: string;
  status: "active" | "released";
};

const useHolds = () =>
  useQuery({
    queryKey: ["holds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holds")
        .select("*")
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      return data as Hold[];
    },
  });

export default function OnHold() {
  const { user } = useAuth();
  const { rate, currency } = useCurrency();
  const qc = useQueryClient();
  const { data: holds = [] } = useHolds();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["holds"] });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"withdrawn" | "lent">("withdrawn");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const value = Number(amount);
      if (!title.trim() || !Number.isFinite(value) || value <= 0) throw new Error("Enter a title and amount");
      const usd = value / (rate || 1);
      const { error } = await supabase.from("holds").insert({
        user_id: user.id,
        title: title.trim(),
        amount: usd,
        kind,
        notes: notes.trim() || null,
        occurred_on: date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added to On Hold");
      setTitle(""); setAmount(""); setNotes("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (h: Hold) => {
      const { error } = await supabase
        .from("holds")
        .update({ status: h.status === "active" ? "released" : "active" })
        .eq("id", h.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("holds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  const active = holds.filter((h) => h.status === "active");
  const released = holds.filter((h) => h.status === "released");
  const activeTotal = active.reduce((s, h) => s + Number(h.amount), 0);
  const withdrawn = active.filter((h) => h.kind === "withdrawn").reduce((s, h) => s + Number(h.amount), 0);
  const lent = active.filter((h) => h.kind === "lent").reduce((s, h) => s + Number(h.amount), 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <PauseCircle className="h-7 w-7 text-warning" /> On Hold
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Money that's out of your wallet but not spent yet — cash you withdrew and haven't used, or money you lent out. Reduces your overall balance but never counts as a real expense.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 surface-card">
          <p className="text-xs text-muted-foreground">Total on hold</p>
          <p className="text-2xl font-semibold num text-warning mt-1">{fmtCurrency(activeTotal)}</p>
        </Card>
        <Card className="p-4 surface-card">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" /> Withdrawn cash</p>
          <p className="text-xl font-semibold num mt-1">{fmtCurrency(withdrawn)}</p>
        </Card>
        <Card className="p-4 surface-card">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><HandCoins className="h-3 w-3" /> Lent out</p>
          <p className="text-xl font-semibold num mt-1">{fmtCurrency(lent)}</p>
        </Card>
      </div>

      <Card className="p-5 surface-card space-y-3">
        <h3 className="font-medium">Add hold</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cash from ATM, Loan to Ana" />
          </div>
          <div>
            <Label>Amount ({currency})</Label>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="withdrawn">Withdrawn cash</SelectItem>
                <SelectItem value="lent">Lent out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" rows={2} />
          </div>
        </div>
        <Button onClick={() => add.mutate()} disabled={add.isPending} className="w-full sm:w-auto">
          Add to On Hold
        </Button>
      </Card>

      <Card className="p-5 surface-card">
        <h3 className="font-medium mb-3">Active</h3>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nothing on hold.</p>
        ) : (
          <div className="space-y-2">
            {active.map((h) => <HoldRow key={h.id} h={h} onToggle={() => toggle.mutate(h)} onDelete={() => remove.mutate(h.id)} releaseLabel="Mark as resolved" />)}
          </div>
        )}
      </Card>

      {released.length > 0 && (
        <Card className="p-5 surface-card">
          <h3 className="font-medium mb-3 text-muted-foreground">Resolved</h3>
          <div className="space-y-2">
            {released.map((h) => <HoldRow key={h.id} h={h} onToggle={() => toggle.mutate(h)} onDelete={() => remove.mutate(h.id)} releaseLabel="Reopen" muted />)}
          </div>
        </Card>
      )}
    </div>
  );
}

function HoldRow({ h, onToggle, onDelete, releaseLabel, muted }: {
  h: Hold; onToggle: () => void; onDelete: () => void; releaseLabel: string; muted?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0 ${muted ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{h.title}</p>
          <Badge variant="outline" className="text-[10px] py-0">
            {h.kind === "withdrawn" ? "Cash" : "Lent"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{new Date(h.occurred_on).toLocaleDateString()}</p>
        {h.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{h.notes}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-sm font-medium num text-warning mr-1">{fmtCurrency(Number(h.amount))}</span>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8" title={releaseLabel}>
          {muted ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-expense">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
