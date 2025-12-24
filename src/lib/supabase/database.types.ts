export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      access_tokens: {
        Row: {
          created_at: string | null;
          deal_id: string;
          expires_at: string;
          id: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          deal_id: string;
          expires_at: string;
          id?: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          deal_id?: string;
          expires_at?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "access_tokens_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          actor_id: string | null;
          actor_type: Database["public"]["Enums"]["actor_type"];
          created_at: string | null;
          deal_id: string;
          event_type: Database["public"]["Enums"]["audit_event_type"];
          id: string;
          ip_address: unknown;
          metadata: Json | null;
          user_agent: string | null;
        };
        Insert: {
          actor_id?: string | null;
          actor_type: Database["public"]["Enums"]["actor_type"];
          created_at?: string | null;
          deal_id: string;
          event_type: Database["public"]["Enums"]["audit_event_type"];
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          user_agent?: string | null;
        };
        Update: {
          actor_id?: string | null;
          actor_type?: Database["public"]["Enums"]["actor_type"];
          created_at?: string | null;
          deal_id?: string;
          event_type?: Database["public"]["Enums"]["audit_event_type"];
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          confirmed_at: string | null;
          created_at: string | null;
          creator_id: string;
          deal_seal: string | null;
          description: string | null;
          id: string;
          public_id: string;
          recipient_email: string | null;
          recipient_id: string | null;
          recipient_name: string | null;
          signature_url: string | null;
          status: Database["public"]["Enums"]["deal_status"] | null;
          template_id: string | null;
          terms: Json;
          title: string;
          viewed_at: string | null;
          voided_at: string | null;
        };
        Insert: {
          confirmed_at?: string | null;
          created_at?: string | null;
          creator_id: string;
          deal_seal?: string | null;
          description?: string | null;
          id?: string;
          public_id: string;
          recipient_email?: string | null;
          recipient_id?: string | null;
          recipient_name?: string | null;
          signature_url?: string | null;
          status?: Database["public"]["Enums"]["deal_status"] | null;
          template_id?: string | null;
          terms?: Json;
          title: string;
          viewed_at?: string | null;
          voided_at?: string | null;
        };
        Update: {
          confirmed_at?: string | null;
          created_at?: string | null;
          creator_id?: string;
          deal_seal?: string | null;
          description?: string | null;
          id?: string;
          public_id?: string;
          recipient_email?: string | null;
          recipient_id?: string | null;
          recipient_name?: string | null;
          signature_url?: string | null;
          status?: Database["public"]["Enums"]["deal_status"] | null;
          template_id?: string | null;
          terms?: Json;
          title?: string;
          viewed_at?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deals_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          currency: string | null;
          email: string;
          id: string;
          is_pro: boolean | null;
          job_title: string | null;
          location: string | null;
          name: string | null;
          signature_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          currency?: string | null;
          email: string;
          id: string;
          is_pro?: boolean | null;
          job_title?: string | null;
          location?: string | null;
          name?: string | null;
          signature_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          currency?: string | null;
          email?: string;
          id?: string;
          is_pro?: boolean | null;
          job_title?: string | null;
          location?: string | null;
          name?: string | null;
          signature_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          notes: string | null;
          is_hidden: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string | null;
          notes?: string | null;
          is_hidden?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string | null;
          notes?: string | null;
          is_hidden?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          notify_deal_viewed: boolean | null;
          notify_deal_signed: boolean | null;
          notify_deal_expiring: boolean | null;
          notify_deal_comments: boolean | null;
          notify_messages: boolean | null;
          notify_mentions: boolean | null;
          notify_deadlines: boolean | null;
          notify_followups: boolean | null;
          notify_security: boolean | null;
          notify_product_updates: boolean | null;
          email_frequency: string | null;
          channel_email: boolean | null;
          channel_push: boolean | null;
          channel_mobile: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          notify_deal_viewed?: boolean | null;
          notify_deal_signed?: boolean | null;
          notify_deal_expiring?: boolean | null;
          notify_deal_comments?: boolean | null;
          notify_messages?: boolean | null;
          notify_mentions?: boolean | null;
          notify_deadlines?: boolean | null;
          notify_followups?: boolean | null;
          notify_security?: boolean | null;
          notify_product_updates?: boolean | null;
          email_frequency?: string | null;
          channel_email?: boolean | null;
          channel_push?: boolean | null;
          channel_mobile?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          notify_deal_viewed?: boolean | null;
          notify_deal_signed?: boolean | null;
          notify_deal_expiring?: boolean | null;
          notify_deal_comments?: boolean | null;
          notify_messages?: boolean | null;
          notify_mentions?: boolean | null;
          notify_deadlines?: boolean | null;
          notify_followups?: boolean | null;
          notify_security?: boolean | null;
          notify_product_updates?: boolean | null;
          email_frequency?: string | null;
          channel_email?: boolean | null;
          channel_push?: boolean | null;
          channel_mobile?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_deal_with_token:
        | {
            Args: {
              p_deal_id: string;
              p_deal_seal: string;
              p_recipient_email?: string;
              p_recipient_id?: string;
              p_signature_data: string;
              p_token: string;
            };
            Returns: {
              confirmed_at: string | null;
              created_at: string | null;
              creator_id: string;
              deal_seal: string | null;
              description: string | null;
              id: string;
              public_id: string;
              recipient_email: string | null;
              recipient_id: string | null;
              recipient_name: string | null;
              signature_url: string | null;
              status: Database["public"]["Enums"]["deal_status"] | null;
              template_id: string | null;
              terms: Json;
              title: string;
              viewed_at: string | null;
              voided_at: string | null;
            };
            SetofOptions: {
              from: "*";
              to: "deals";
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: {
              p_confirmed_at?: string;
              p_deal_id: string;
              p_deal_seal: string;
              p_recipient_email?: string;
              p_recipient_id?: string;
              p_signature_data: string;
              p_token: string;
            };
            Returns: {
              confirmed_at: string | null;
              created_at: string | null;
              creator_id: string;
              deal_seal: string | null;
              description: string | null;
              id: string;
              public_id: string;
              recipient_email: string | null;
              recipient_id: string | null;
              recipient_name: string | null;
              signature_url: string | null;
              status: Database["public"]["Enums"]["deal_status"] | null;
              template_id: string | null;
              terms: Json;
              title: string;
              viewed_at: string | null;
              voided_at: string | null;
            };
            SetofOptions: {
              from: "*";
              to: "deals";
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      get_access_token_for_deal: {
        Args: { p_deal_id: string };
        Returns: string;
      };
      get_deal_by_public_id: { Args: { p_public_id: string }; Returns: Json };
      get_token_status_for_deal: { Args: { p_deal_id: string }; Returns: Json };
      validate_access_token: {
        Args: { p_deal_id: string; p_token: string };
        Returns: boolean;
      };
    };
    Enums: {
      actor_type: "creator" | "recipient" | "system";
      audit_event_type:
        | "deal_created"
        | "deal_viewed"
        | "deal_signed"
        | "deal_confirmed"
        | "deal_voided"
        | "email_sent"
        | "pdf_generated";
      deal_status: "pending" | "sealing" | "confirmed" | "voided";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      actor_type: ["creator", "recipient", "system"],
      audit_event_type: [
        "deal_created",
        "deal_viewed",
        "deal_signed",
        "deal_confirmed",
        "deal_voided",
        "email_sent",
        "pdf_generated",
      ],
      deal_status: ["pending", "sealing", "confirmed", "voided"],
    },
  },
} as const;
