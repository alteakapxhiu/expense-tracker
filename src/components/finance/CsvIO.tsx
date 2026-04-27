import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, useTransactionsByYear, useInvalidateData } from "@/hooks/useFinanceData";
import { toast } from "sonner";

export function CsvIO({ year }: { year: number }) {
  const { user } = useAuth();
  const { data: cats = [] } = useCategories();
  const { data: txs = [] } = useTransactionsByYear(year);
  const invalidate = useInvalidateData();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportCsv = () => {
    const catById = new Map(cats.map((c) => [c.id, c]));
    const header = "date,category,kind,description,amount,notes";
    const rows = txs.map((t) => {
      const c = catById.get(t.category_id);
      const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
      return [t.occurred_on, esc(c?.name ?? ""), c?.kind ?? "", esc(t.description), Number(t.amount).toFixed(2), esc(t.notes ?? "")].join(",");
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledgerly-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    if (!user) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return toast.error("Empty CSV");
    const [, ...rows] = lines;
    const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]));
    const inserts: any[] = [];
    let skipped = 0;

    const parseRow = (line: string) => {
      const out: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') inQ = false;
          else cur += ch;
        } else {
          if (ch === ",") { out.push(cur); cur = ""; }
          else if (ch === '"') inQ = true;
          else cur += ch;
        }
      }
      out.push(cur);
      return out;
    };

    for (const line of rows) {
      const [date, name, , description, amountStr, notes] = parseRow(line);
      const c = catByName.get((name ?? "").toLowerCase());
      const amount = Number(amountStr);
      if (!c || !date || !description || !Number.isFinite(amount)) { skipped++; continue; }
      inserts.push({ user_id: user.id, category_id: c.id, occurred_on: date, description, amount, notes: notes || null });
    }

    if (!inserts.length) return toast.error(`No valid rows (skipped ${skipped})`);
    const { error } = await supabase.from("transactions").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${inserts.length} rows${skipped ? ` (skipped ${skipped})` : ""}`);
    invalidate();
  };

  return (
    <>
      <input
        ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }}
      />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4 mr-1.5" /> Import
      </Button>
      <Button variant="outline" size="sm" onClick={exportCsv}>
        <Download className="h-4 w-4 mr-1.5" /> Export
      </Button>
    </>
  );
}
