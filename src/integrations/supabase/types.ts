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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      players: {
        Row: {
          banned: boolean
          contact: string
          created_at: string
          device_token_hash: string
          id: string
          ip_hash: string | null
          nickname: string
        }
        Insert: {
          banned?: boolean
          contact: string
          created_at?: string
          device_token_hash: string
          id?: string
          ip_hash?: string | null
          nickname: string
        }
        Update: {
          banned?: boolean
          contact?: string
          created_at?: string
          device_token_hash?: string
          id?: string
          ip_hash?: string | null
          nickname?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          id: string
          ip_hash: string | null
          max_combo: number
          needs_review: boolean
          perfects: number
          player_id: string | null
          reject_reason: string | null
          score: number
          seed: number
          started_at: string
          status: string
          submitted_at: string | null
          tap_ticks: number[]
          total_ticks: number
          week_key: string
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          max_combo?: number
          needs_review?: boolean
          perfects?: number
          player_id?: string | null
          reject_reason?: string | null
          score?: number
          seed: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          tap_ticks?: number[]
          total_ticks?: number
          week_key?: string
        }
        Update: {
          id?: string
          ip_hash?: string | null
          max_combo?: number
          needs_review?: boolean
          perfects?: number
          player_id?: string | null
          reject_reason?: string | null
          score?: number
          seed?: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          tap_ticks?: number[]
          total_ticks?: number
          week_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_best: {
        Row: {
          achieved_at: string
          player_id: string
          run_id: string | null
          score: number
          week_key: string
        }
        Insert: {
          achieved_at?: string
          player_id: string
          run_id?: string | null
          score: number
          week_key: string
        }
        Update: {
          achieved_at?: string
          player_id?: string
          run_id?: string | null
          score?: number
          week_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_best_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      weekly_winners_admin: {
        Row: {
          contact: string | null
          needs_review: boolean | null
          nickname: string | null
          rank_no: number | null
          run_id: string | null
          score: number | null
          week_key: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_week_key: { Args: never; Returns: string }
      finalize_run: {
        Args: {
          p_max_combo: number
          p_needs_review: boolean
          p_perfects: number
          p_player_id: string
          p_run_id: string
          p_score: number
          p_tap_ticks: number[]
          p_total_ticks: number
        }
        Returns: Json
      }
      last_week_winner: {
        Args: never
        Returns: {
          nickname: string
          score: number
          week_key: string
        }[]
      }
      previous_week_key: { Args: never; Returns: string }
      weekly_leaderboard: {
        Args: never
        Returns: {
          achieved_at: string
          nickname: string
          player_rank: number
          score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
