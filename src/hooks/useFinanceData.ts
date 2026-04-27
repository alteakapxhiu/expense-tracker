import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Transaction, Budget } from "@/types/db";

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("kind", { ascending: false })
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

export const useTransactionsByMonth = (year: number, month0: number) =>
  useQuery({
    queryKey: ["transactions", year, month0],
    queryFn: async () => {
      const start = new Date(year, month0, 1).toISOString().slice(0, 10);
      const end = new Date(year, month0 + 1, 1).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("occurred_on", start)
        .lt("occurred_on", end)
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
  });

export const useTransactionsByYear = (year: number) =>
  useQuery({
    queryKey: ["transactions-year", year],
    queryFn: async () => {
      const start = `${year}-01-01`;
      const end = `${year + 1}-01-01`;
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("occurred_on", start)
        .lt("occurred_on", end);
      if (error) throw error;
      return data as Transaction[];
    },
  });

export const useBudgets = () =>
  useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*");
      if (error) throw error;
      return data as Budget[];
    },
  });

export const useInvalidateData = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["transactions-year"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["budgets"] });
  };
};

export const useUpsertTransaction = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: async (tx: Partial<Transaction> & { user_id: string; category_id: string; description: string; amount: number; occurred_on: string }) => {
      if (tx.id) {
        const { error } = await supabase.from("transactions").update({
          description: tx.description, amount: tx.amount, occurred_on: tx.occurred_on, category_id: tx.category_id, notes: tx.notes ?? null,
        }).eq("id", tx.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert({
          user_id: tx.user_id, category_id: tx.category_id, description: tx.description, amount: tx.amount, occurred_on: tx.occurred_on, notes: tx.notes ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
};

export const useDeleteTransaction = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
};
