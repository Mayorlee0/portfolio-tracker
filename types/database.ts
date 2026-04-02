export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          currency?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          asset_type: string;
          exchange: string;
          currency: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name: string;
          asset_type: string;
          exchange: string;
          currency: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [];
      };
      holdings: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          asset_id: string;
          quantity: string;
          avg_buy_price: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          asset_id: string;
          quantity?: string;
          avg_buy_price?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["holdings"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          account_id: string;
          type: string;
          quantity: string;
          price: string;
          fee: string;
          currency: string;
          ts: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          account_id: string;
          type: string;
          quantity?: string;
          price?: string;
          fee?: string;
          currency: string;
          ts?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      price_cache: {
        Row: {
          id: string;
          symbol: string;
          price: string;
          currency: string;
          source: string;
          last_updated: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          price: string;
          currency: string;
          source: string;
          last_updated?: string;
        };
        Update: Partial<Database["public"]["Tables"]["price_cache"]["Insert"]>;
        Relationships: [];
      };
      fx_rates: {
        Row: {
          id: string;
          base_currency: string;
          target_currency: string;
          rate: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          base_currency: string;
          target_currency: string;
          rate: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fx_rates"]["Insert"]>;
        Relationships: [];
      };
      portfolio_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          net_worth_usd: string;
          net_worth_ngn: string;
          net_worth_ghs: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date: string;
          net_worth_usd: string;
          net_worth_ngn: string;
          net_worth_ghs: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["portfolio_snapshots"]["Insert"]>;
        Relationships: [];
      };
      portfolio_summary_cache: {
        Row: {
          user_id: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          payload: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["portfolio_summary_cache"]["Insert"]>;
        Relationships: [];
      };
      fx_overrides: {
        Row: {
          id: string;
          user_id: string;
          base_currency: string;
          target_currency: string;
          rate: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          base_currency: string;
          target_currency: string;
          rate: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fx_overrides"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
