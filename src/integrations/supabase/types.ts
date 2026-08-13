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
      bank_connections: {
        Row: {
          // access_token_enc is a PQC EncryptedBlob and must never be selected
          // from the browser, even though RLS would permit the owner to read it.
          access_token_enc: Json | null
          account_name: string | null
          account_number: string | null
          accounts: Json | null
          bank_code: string
          bank_name: string
          company_id: string
          consent_expires_at: string | null
          consent_granted: boolean | null
          created_at: string
          direction_convention: string | null
          grant_id: string | null
          id: string
          last_reference: string | null
          last_synced_at: string | null
          provider: string
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token_enc?: Json | null
          account_name?: string | null
          account_number?: string | null
          accounts?: Json | null
          bank_code: string
          bank_name: string
          company_id: string
          consent_expires_at?: string | null
          consent_granted?: boolean | null
          created_at?: string
          direction_convention?: string | null
          grant_id?: string | null
          id?: string
          last_reference?: string | null
          last_synced_at?: string | null
          provider?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_enc?: Json | null
          account_name?: string | null
          account_number?: string | null
          accounts?: Json | null
          bank_code?: string
          bank_name?: string
          company_id?: string
          consent_expires_at?: string | null
          consent_granted?: boolean | null
          created_at?: string
          direction_convention?: string | null
          grant_id?: string | null
          id?: string
          last_reference?: string | null
          last_synced_at?: string | null
          provider?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_type: string | null
          connected_banks: Json | null
          created_at: string
          credit_limit: number | null
          credit_score: number | null
          employee_count: string | null
          id: string
          industry: string | null
          monthly_revenue: number | null
          name: string
          onboarding_done_at: string | null
          primary_goal: string | null
          province: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          years_operating: string | null
        }
        Insert: {
          account_type?: string | null
          connected_banks?: Json | null
          created_at?: string
          credit_limit?: number | null
          credit_score?: number | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          monthly_revenue?: number | null
          name: string
          province?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
          years_operating?: string | null
        }
        Update: {
          account_type?: string | null
          connected_banks?: Json | null
          created_at?: string
          credit_limit?: number | null
          credit_score?: number | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          monthly_revenue?: number | null
          name?: string
          onboarding_done_at?: string | null
          primary_goal?: string | null
          province?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          years_operating?: string | null
        }
        Relationships: []
      }
      qr_payments: {
        Row: {
          account_number: string | null
          amount: number
          bin: string | null
          company_id: string
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          paid_at: string | null
          paid_transaction_id: string | null
          qr_code: string | null
          reference_number: string
          status: string
          updated_at: string
          virtual_account_number: string | null
        }
        Insert: {
          amount: number
          company_id: string
          description: string
          invoice_id?: string | null
          reference_number: string
        }
        Update: {
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          granted_at: string
          id: string
          kind: string
          revoked_at: string | null
          user_id: string
          version: string
        }
        Insert: {
          kind: string
          user_id: string
          version: string
        }
        Update: {
          revoked_at?: string | null
        }
        Relationships: []
      }
      credit_score_factors: {
        Row: {
          created_at: string
          factor_name: string
          id: string
          normalized_score: number
          raw_value: number | null
          snapshot_id: string
          trend: number | null
          weight: number
        }
        Insert: {
          created_at?: string
          factor_name: string
          id?: string
          normalized_score: number
          raw_value?: number | null
          snapshot_id: string
          trend?: number | null
          weight?: number
        }
        Update: {
          created_at?: string
          factor_name?: string
          id?: string
          normalized_score?: number
          raw_value?: number | null
          snapshot_id?: string
          trend?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_score_factors_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "credit_score_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_score_snapshots: {
        Row: {
          company_id: string
          computed_at: string
          created_at: string
          credit_limit: number
          id: string
          model_version: string
          probability_of_default: number | null
          score: number
        }
        Insert: {
          company_id: string
          computed_at?: string
          created_at?: string
          credit_limit?: number
          id?: string
          model_version?: string
          probability_of_default?: number | null
          score: number
        }
        Update: {
          company_id?: string
          computed_at?: string
          created_at?: string
          credit_limit?: number
          id?: string
          model_version?: string
          probability_of_default?: number | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_score_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      device_rules: {
        Row: {
          action_params: Json
          action_type: string
          created_at: string | null
          device_id: string
          execution_count: number | null
          id: string
          is_active: boolean | null
          limit_per_day: number | null
          limit_per_month: number | null
          limit_per_tx: number | null
          rule_name: string
          trigger_condition: Json
          trigger_logic: string | null
          updated_at: string | null
        }
        Insert: {
          action_params?: Json
          action_type: string
          created_at?: string | null
          device_id: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          limit_per_day?: number | null
          limit_per_month?: number | null
          limit_per_tx?: number | null
          rule_name: string
          trigger_condition?: Json
          trigger_logic?: string | null
          updated_at?: string | null
        }
        Update: {
          action_params?: Json
          action_type?: string
          created_at?: string | null
          device_id?: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          limit_per_day?: number | null
          limit_per_month?: number | null
          limit_per_tx?: number | null
          rule_name?: string
          trigger_condition?: Json
          trigger_logic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_rules_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      device_wallets: {
        Row: {
          balance: number | null
          company_id: string
          created_at: string | null
          currency: string | null
          device_did: string
          device_name: string
          device_type: string
          id: string
          initial_balance: number | null
          loan_id: string | null
          metadata: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          device_did: string
          device_name: string
          device_type?: string
          id?: string
          initial_balance?: number | null
          loan_id?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          device_did?: string
          device_name?: string
          device_type?: string
          id?: string
          initial_balance?: number | null
          loan_id?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_wallets_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          advanced_amount: number | null
          advanced_at: string | null
          amount: number
          client_name: string
          client_tax_id: string | null
          company_id: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issued_date: string
          status: string
          total: number
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          advanced_amount?: number | null
          advanced_at?: string | null
          amount: number
          client_name: string
          client_tax_id?: string | null
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          issued_date: string
          status?: string
          total: number
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          advanced_amount?: number | null
          advanced_at?: string | null
          amount?: number
          client_name?: string
          client_tax_id?: string | null
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issued_date?: string
          status?: string
          total?: number
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          company_id: string
          created_at: string
          face_match_score: number | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          liveness_passed: boolean | null
          ocr_data: Json | null
          otp_verified: boolean | null
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          face_match_score?: number | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          liveness_passed?: boolean | null
          ocr_data?: Json | null
          otp_verified?: boolean | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          face_match_score?: number | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          liveness_passed?: boolean | null
          ocr_data?: Json | null
          otp_verified?: boolean | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          company_id: string
          completed_at: string
          created_at: string
          id: string
          lesson_id: string
          quiz_score: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id: string
          quiz_score?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id?: string
          quiz_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_applications: {
        Row: {
          amount: number
          amount_repaid: number | null
          applied_at: string
          approved_at: string | null
          company_id: string
          disbursed_at: string | null
          due_date: string | null
          id: string
          loan_type: string
          purpose: string | null
          status: string
          term_days: number
        }
        Insert: {
          amount: number
          amount_repaid?: number | null
          applied_at?: string
          approved_at?: string | null
          company_id: string
          disbursed_at?: string | null
          due_date?: string | null
          id?: string
          loan_type: string
          purpose?: string | null
          status?: string
          term_days: number
        }
        Update: {
          amount?: number
          amount_repaid?: number | null
          applied_at?: string
          approved_at?: string | null
          company_id?: string
          disbursed_at?: string | null
          due_date?: string | null
          id?: string
          loan_type?: string
          purpose?: string | null
          status?: string
          term_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      m2m_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          device_id: string
          id: string
          metadata: Json | null
          recipient_id: string | null
          recipient_name: string | null
          rule_id: string | null
          settlement_ms: number | null
          status: string | null
          stripe_payment_intent_id: string | null
          tx_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          device_id: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
          recipient_name?: string | null
          rule_id?: string | null
          settlement_ms?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          tx_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          device_id?: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
          recipient_name?: string | null
          rule_id?: string | null
          settlement_ms?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          tx_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "m2m_transactions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "m2m_transactions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "device_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      product_events: {
        Row: {
          created_at: string
          id: number
          name: string
          props: Json
          user_id: string | null
        }
        Insert: {
          name: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_demo: boolean
          notification_prefs: Json
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_demo?: boolean
          notification_prefs?: Json
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notification_prefs?: Json
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          company_id: string
          created_at: string
          id: string
          is_synthetic: boolean
          merchant_name: string | null
          reference_id: string | null
          source_bank: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_synthetic?: boolean
          merchant_name?: string | null
          reference_id?: string | null
          source_bank?: string | null
          transaction_date: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_synthetic?: boolean
          merchant_name?: string | null
          reference_id?: string | null
          source_bank?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          company_name: string
          created_at: string
          email: string
          id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
