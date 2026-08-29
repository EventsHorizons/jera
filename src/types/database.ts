export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AccountWithBalance = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  nature: "asset" | "liability";
  institution: string | null;
  currency: string;
  initial_balance: number;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  current_balance: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          timezone: string;
          status: "active" | "suspended";
          onboarding_completed: boolean;
          terms_accepted_at: string;
          terms_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          timezone?: string;
          status?: "active" | "suspended";
          onboarding_completed?: boolean;
          terms_accepted_at: string;
          terms_version?: string;
        };
        Update: {
          display_name?: string;
          timezone?: string;
          status?: "active" | "suspended";
          onboarding_completed?: boolean;
        };
        Relationships: [];
      };
      financial_accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          nature: "asset" | "liability";
          institution: string | null;
          currency: string;
          initial_balance: number;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          type: string;
          nature: "asset" | "liability";
          currency?: string;
          initial_balance?: number;
          institution?: string | null;
          status?: "active" | "archived";
        };
        Update: {
          name?: string;
          type?: string;
          nature?: "asset" | "liability";
          currency?: string;
          initial_balance?: number;
          institution?: string | null;
          status?: "active" | "archived";
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: "income" | "expense";
          is_system: boolean;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          kind: "income" | "expense";
          is_system?: boolean;
          parent_id?: string | null;
        };
        Update: {
          name?: string;
          kind?: "income" | "expense";
          parent_id?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense" | "transfer" | "adjustment";
          amount: number;
          occurred_on: string;
          description: string | null;
          note: string | null;
          category_id: string | null;
          account_id: string | null;
          counterparty_account_id: string | null;
          transfer_group_id: string | null;
          adjustment_reason: string | null;
          adjustment_direction: "increase" | "decrease" | null;
          reimburses_transaction_id: string | null;
          is_settlement: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          type: "income" | "expense" | "transfer" | "adjustment";
          amount: number;
          occurred_on?: string;
          description?: string | null;
          note?: string | null;
          category_id?: string | null;
          account_id?: string | null;
          counterparty_account_id?: string | null;
          transfer_group_id?: string | null;
          adjustment_reason?: string | null;
          adjustment_direction?: "increase" | "decrease" | null;
          reimburses_transaction_id?: string | null;
          is_settlement?: boolean;
        };
        Update: {
          type?: "income" | "expense" | "transfer" | "adjustment";
          amount?: number;
          occurred_on?: string;
          description?: string | null;
          note?: string | null;
          category_id?: string | null;
          account_id?: string | null;
          counterparty_account_id?: string | null;
          adjustment_reason?: string | null;
          adjustment_direction?: "increase" | "decrease" | null;
          reimburses_transaction_id?: string | null;
          is_settlement?: boolean;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount_limit: number;
          period_month: number;
          period_year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          category_id: string;
          amount_limit: number;
          period_month: number;
          period_year: number;
        };
        Update: {
          category_id?: string;
          amount_limit?: number;
          period_month?: number;
          period_year?: number;
        };
        Relationships: [];
      };
      saving_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          status: "active" | "completed" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          status?: "active" | "completed" | "archived";
        };
        Update: {
          name?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          status?: "active" | "completed" | "archived";
        };
        Relationships: [];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          creditor: string | null;
          original_amount: number;
          paid_amount: number;
          installment_amount: number | null;
          next_payment_date: string | null;
          notes: string | null;
          status: "active" | "paid" | "archived";
          linked_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          creditor?: string | null;
          original_amount: number;
          paid_amount?: number;
          installment_amount?: number | null;
          next_payment_date?: string | null;
          notes?: string | null;
          status?: "active" | "paid" | "archived";
          linked_account_id?: string | null;
        };
        Update: {
          name?: string;
          creditor?: string | null;
          original_amount?: number;
          paid_amount?: number;
          installment_amount?: number | null;
          next_payment_date?: string | null;
          notes?: string | null;
          status?: "active" | "paid" | "archived";
          linked_account_id?: string | null;
        };
        Relationships: [];
      };
      debt_payments: {
        Row: {
          id: string;
          user_id: string;
          debt_id: string;
          amount: number;
          paid_on: string;
          transaction_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          debt_id: string;
          amount: number;
          paid_on?: string;
          transaction_id?: string | null;
          note?: string | null;
        };
        Update: {
          amount?: number;
          paid_on?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      goal_contributions: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          amount: number;
          contributed_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          goal_id: string;
          amount: number;
          contributed_on?: string;
          note?: string | null;
        };
        Update: {
          amount?: number;
          note?: string | null;
        };
        Relationships: [];
      };
      recurring_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense" | "transfer";
          amount: number;
          account_id: string;
          counterparty_account_id: string | null;
          category_id: string | null;
          description: string | null;
          note: string | null;
          frequency: "daily" | "weekly" | "monthly" | "yearly";
          next_occurrence: string;
          end_date: string | null;
          status: "active" | "paused" | "cancelled";
          last_generated_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          type: "income" | "expense" | "transfer";
          amount: number;
          account_id: string;
          counterparty_account_id?: string | null;
          category_id?: string | null;
          description?: string | null;
          note?: string | null;
          frequency: "daily" | "weekly" | "monthly" | "yearly";
          next_occurrence: string;
          end_date?: string | null;
          status?: "active" | "paused" | "cancelled";
        };
        Update: {
          amount?: number;
          account_id?: string;
          counterparty_account_id?: string | null;
          category_id?: string | null;
          description?: string | null;
          note?: string | null;
          frequency?: "daily" | "weekly" | "monthly" | "yearly";
          next_occurrence?: string;
          end_date?: string | null;
          status?: "active" | "paused" | "cancelled";
          last_generated_on?: string | null;
        };
        Relationships: [];
      };
      recurring_generations: {
        Row: {
          id: string;
          recurring_id: string;
          user_id: string;
          occurred_on: string;
          transaction_id: string;
          created_at: string;
        };
        Insert: {
          recurring_id: string;
          user_id: string;
          occurred_on: string;
          transaction_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_own_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      get_account_balance: {
        Args: { p_account_id: string };
        Returns: number;
      };
      get_accounts_with_balance: {
        Args: Record<PropertyKey, never>;
        Returns: AccountWithBalance[];
      };
      create_own_financial_account: {
        Args: {
          p_name: string;
          p_type: Database["public"]["Enums"]["account_type"];
          p_institution?: string | null;
          p_currency?: string;
          p_initial_balance?: number;
        };
        Returns: Database["public"]["Tables"]["financial_accounts"]["Row"];
      };
      set_own_financial_account_status: {
        Args: {
          p_id: string;
          p_status: Database["public"]["Enums"]["account_status"];
        };
        Returns: Database["public"]["Tables"]["financial_accounts"]["Row"];
      };
      pay_debt: {
        Args: {
          p_debt_id: string;
          p_account_id: string;
          p_amount: number;
          p_paid_on: string;
          p_note?: string | null;
        };
        Returns: string;
      };
      generate_due_recurring_transactions: {
        Args: { p_as_of?: string };
        Returns: number;
      };
    };
    Enums: {
      account_type:
        | "bank"
        | "savings"
        | "cash"
        | "credit_card"
        | "wallet"
        | "loan"
        | "other";
      account_status: "active" | "archived";
      account_nature: "asset" | "liability";
      category_kind: "income" | "expense";
      transaction_type: "income" | "expense" | "transfer" | "adjustment";
      adjustment_direction: "increase" | "decrease";
      goal_status: "active" | "completed" | "archived";
      debt_status: "active" | "paid" | "archived";
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly";
      recurring_status: "active" | "paused" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type AccountWithBalanceRow = AccountWithBalance;
