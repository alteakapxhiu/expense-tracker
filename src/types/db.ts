export type CategoryKind = "income" | "expense";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  group_name: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string;
  description: string;
  amount: number;
  occurred_on: string;
  notes: string | null;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
};
