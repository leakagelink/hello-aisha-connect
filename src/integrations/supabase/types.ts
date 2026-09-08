export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          attempts: number
          created_at: string
          email: string | null
          id: string
          last_error: string | null
          processed_at: string | null
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email?: string | null
          id?: string
          last_error?: string | null
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string | null
          id?: string
          last_error?: string | null
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          accepted_at: string | null
          blocked_by_user: boolean
          closed_at: string | null
          created_at: string
          id: string
          last_message_at: string | null
          listener_id: string | null
          requested_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          blocked_by_user?: boolean
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          listener_id?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          blocked_by_user?: boolean
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          listener_id?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          id: string
          mood: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          author_id: string | null
          conversation_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          author_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      listener_availability: {
        Row: {
          display_name: string
          id: string
          is_primary: boolean
          listener_id: string
          status: Database["public"]["Enums"]["availability_status"]
          updated_at: string
        }
        Insert: {
          display_name?: string
          id?: string
          is_primary?: boolean
          listener_id: string
          status?: Database["public"]["Enums"]["availability_status"]
          updated_at?: string
        }
        Update: {
          display_name?: string
          id?: string
          is_primary?: boolean
          listener_id?: string
          status?: Database["public"]["Enums"]["availability_status"]
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          is_system: boolean
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          is_system?: boolean
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          is_system?: boolean
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string | null
          id: string
          muted_until: string | null
          notifications_enabled: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          id: string
          muted_until?: string | null
          notifications_enabled?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          id?: string
          muted_until?: string | null
          notifications_enabled?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          conversation_id: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      retained_safety_records: {
        Row: {
          created_at: string
          id: string
          occurred_at: string
          reason: string | null
          record_type: string
          retain_until: string
          subject_ref: string
        }
        Insert: {
          created_at?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          record_type: string
          retain_until?: string
          subject_ref: string
        }
        Update: {
          created_at?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          record_type?: string
          retain_until?: string
          subject_ref?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_adult_confirmed: boolean
          peer_support_acknowledged: boolean
          selected_reasons: string[]
          terms_accepted: boolean
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_adult_confirmed?: boolean
          peer_support_acknowledged?: boolean
          selected_reasons?: string[]
          terms_accepted?: boolean
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_adult_confirmed?: boolean
          peer_support_acknowledged?: boolean
          selected_reasons?: string[]
          terms_accepted?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_conversation: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      create_conversation: { Args: { _topic?: string }; Returns: string }
      guard_bypassed: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      purge_expired_safety_records: { Args: never; Returns: number }
      purge_user_data: { Args: { _user_id: string }; Returns: undefined }
      record_deletion_failure: {
        Args: { _error: string; _user_id: string }
        Returns: undefined
      }
      request_account_deletion: {
        Args: { _reason?: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status:
        | "active"
        | "warned"
        | "muted"
        | "suspended"
        | "banned"
        | "deletion_requested"
      app_role: "user" | "listener" | "admin"
      availability_status: "available" | "away" | "not_accepting"
      conversation_status:
        | "requested"
        | "waiting"
        | "active"
        | "closed"
        | "declined"
      moderation_status: "allowed" | "flagged" | "blocked" | "under_review"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: [
        "active",
        "warned",
        "muted",
        "suspended",
        "banned",
        "deletion_requested",
      ],
      app_role: ["user", "listener", "admin"],
      availability_status: ["available", "away", "not_accepting"],
      conversation_status: [
        "requested",
        "waiting",
        "active",
        "closed",
        "declined",
      ],
      moderation_status: ["allowed", "flagged", "blocked", "under_review"],
    },
  },
} as const
