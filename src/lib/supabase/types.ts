export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DealStatus = "pending" | "sealing" | "confirmed" | "voided";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          is_pro: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          is_pro?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          is_pro?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          public_id: string;
          creator_id: string;
          recipient_id: string | null;
          recipient_name: string | null;
          recipient_email: string | null;
          title: string;
          description: string | null;
          template_id: string | null;
          terms: Json;
          status: DealStatus;
          deal_seal: string | null;
          signature_url: string | null;
          created_at: string;
          confirmed_at: string | null;
          voided_at: string | null;
          viewed_at: string | null;
        };
        Insert: {
          id?: string;
          public_id: string;
          creator_id: string;
          recipient_id?: string | null;
          recipient_name?: string | null;
          recipient_email?: string | null;
          title: string;
          description?: string | null;
          template_id?: string | null;
          terms: Json;
          status?: DealStatus;
          deal_seal?: string | null;
          signature_url?: string | null;
          created_at?: string;
          confirmed_at?: string | null;
          voided_at?: string | null;
          viewed_at?: string | null;
        };
        Update: {
          id?: string;
          public_id?: string;
          creator_id?: string;
          recipient_id?: string | null;
          recipient_name?: string | null;
          recipient_email?: string | null;
          title?: string;
          description?: string | null;
          template_id?: string | null;
          terms?: Json;
          status?: DealStatus;
          deal_seal?: string | null;
          signature_url?: string | null;
          created_at?: string;
          confirmed_at?: string | null;
          voided_at?: string | null;
          viewed_at?: string | null;
        };
      };
      access_tokens: {
        Row: {
          id: string;
          deal_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          deal_id: string;
          event_type: string;
          actor_id: string | null;
          actor_type: "creator" | "recipient" | "system";
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          event_type: string;
          actor_id?: string | null;
          actor_type: "creator" | "recipient" | "system";
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          event_type?: string;
          actor_id?: string | null;
          actor_type?: "creator" | "recipient" | "system";
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      deal_status: DealStatus;
      actor_type: "creator" | "recipient" | "system";
    };
  };
}
