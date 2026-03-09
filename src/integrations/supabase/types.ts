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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bank_connections: {
        Row: {
          accounts: Json | null
          bank_code: string
          bank_name: string
          company_id: string
          consent_expires_at: string | null
          consent_granted: boolean | null
          created_at: string
          id: string
          last_synced_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accounts?: Json | null
          bank_code: string
          bank_name: string
          company_id: string
          consent_expires_at?: string | null
          consent_granted?: boolean | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accounts?: Json | null
          bank_code?: string
          bank_name?: string
          company_id?: string
          consent_expires_at?: string | null
          consent_granted?: boolean | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
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
          connected_banks: Json | null
          created_at: string
          credit_limit: number | null
          credit_score: number | null
          employee_count: string | null
          id: string
          industry: string | null
          monthly_revenue: number | null
          name: string
          province: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          years_operating: string | null
        }
        Insert: {
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
          connected_banks?: Json | null
          created_at?: string
          credit_limit?: number | null
          credit_score?: number | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          monthly_revenue?: number | null
          name?: string
          province?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          years_operating?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
