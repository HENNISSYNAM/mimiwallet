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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bank_connections: {
        Row: {
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
          scopes: string
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
          scopes?: string
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
          scopes?: string
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
      carbon_snapshots: {
        Row: {
          by_category: Json
          by_month: Json
          company_id: string
          created_at: string
          factor_version: string
          id: string
          intensity_per_revenue: number
          months_analysed: number
          total_emissions: number
          total_revenue: number
          total_spend: number
        }
        Insert: {
          by_category?: Json
          by_month?: Json
          company_id: string
          created_at?: string
          factor_version?: string
          id?: string
          intensity_per_revenue: number
          months_analysed?: number
          total_emissions: number
          total_revenue: number
          total_spend: number
        }
        Update: {
          by_category?: Json
          by_month?: Json
          company_id?: string
          created_at?: string
          factor_version?: string
          id?: string
          intensity_per_revenue?: number
          months_analysed?: number
          total_emissions?: number
          total_revenue?: number
          total_spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "carbon_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          status: string
          tax_code: string | null
          tax_status: string | null
          tax_status_checked_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          status?: string
          tax_code?: string | null
          tax_status?: string | null
          tax_status_checked_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          status?: string
          tax_code?: string | null
          tax_status?: string | null
          tax_status_checked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
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
          onboarding_done_at?: string | null
          primary_goal?: string | null
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
          created_at?: string
          granted_at?: string
          id?: string
          kind: string
          revoked_at?: string | null
          user_id: string
          version: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          id?: string
          kind?: string
          revoked_at?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      credit_score_factors: {
        Row: {
          factor_name: string
          id: string
          normalized_score: number
          raw_value: number | null
          snapshot_id: string
          trend: number | null
          weight: number
        }
        Insert: {
          factor_name: string
          id?: string
          normalized_score: number
          raw_value?: number | null
          snapshot_id: string
          trend?: number | null
          weight: number
        }
        Update: {
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
          credit_limit: number
          id: string
          model_version: string
          probability_of_default: number
          score: number
        }
        Insert: {
          company_id: string
          computed_at?: string
          credit_limit?: number
          id?: string
          model_version?: string
          probability_of_default: number
          score: number
        }
        Update: {
          company_id?: string
          computed_at?: string
          credit_limit?: number
          id?: string
          model_version?: string
          probability_of_default?: number
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
      gdt_invoices: {
        Row: {
          company_id: string
          counterparty_name: string | null
          counterparty_tax_code: string | null
          created_at: string
          currency: string
          direction: string
          gdt_id: string
          id: string
          invoice_auth_code: string | null
          invoice_form_code: string | null
          invoice_form_name: string | null
          invoice_lookup_code: string | null
          invoice_number: string | null
          invoice_serial: string | null
          invoice_status: number | null
          issuance_period: number | null
          issued_at: string | null
          subtotal_amount: number
          synced_at: string
          tax_amount: number
          tax_rate_breakdown: Json
          total_amount: number
        }
        Insert: {
          company_id: string
          counterparty_name?: string | null
          counterparty_tax_code?: string | null
          created_at?: string
          currency?: string
          direction: string
          gdt_id: string
          id?: string
          invoice_auth_code?: string | null
          invoice_form_code?: string | null
          invoice_form_name?: string | null
          invoice_lookup_code?: string | null
          invoice_number?: string | null
          invoice_serial?: string | null
          invoice_status?: number | null
          issuance_period?: number | null
          issued_at?: string | null
          subtotal_amount?: number
          synced_at?: string
          tax_amount?: number
          tax_rate_breakdown?: Json
          total_amount?: number
        }
        Update: {
          company_id?: string
          counterparty_name?: string | null
          counterparty_tax_code?: string | null
          created_at?: string
          currency?: string
          direction?: string
          gdt_id?: string
          id?: string
          invoice_auth_code?: string | null
          invoice_form_code?: string | null
          invoice_form_name?: string | null
          invoice_lookup_code?: string | null
          invoice_number?: string | null
          invoice_serial?: string | null
          invoice_status?: number | null
          issuance_period?: number | null
          issued_at?: string | null
          subtotal_amount?: number
          synced_at?: string
          tax_amount?: number
          tax_rate_breakdown?: Json
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "gdt_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
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
          ocr_data_encrypted: Json | null
          otp_verified: boolean | null
          pqc_key_version: string
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
          ocr_data_encrypted?: Json | null
          otp_verified?: boolean | null
          pqc_key_version?: string
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
          ocr_data_encrypted?: Json | null
          otp_verified?: boolean | null
          pqc_key_version?: string
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
          id: string
          lesson_id: string
          quiz_score: number | null
        }
        Insert: {
          company_id: string
          completed_at?: string
          id?: string
          lesson_id: string
          quiz_score?: number | null
        }
        Update: {
          company_id?: string
          completed_at?: string
          id?: string
          lesson_id?: string
          quiz_score?: number | null
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
      legal_documents: {
        Row: {
          co_quan_ban_hanh: string
          con_so_moc: number | null
          created_at: string
          doi_tuong_ap_dung: string[]
          don_vi_moc: string | null
          id: string
          loai: string
          ngay_ban_hanh: string | null
          ngay_hieu_luc: string | null
          so_hieu: string
          ten: string
          thay_the_boi: string | null
          tom_tat_chinh_thuc: string | null
          tom_tat_de_hieu: string
          url_nguon: string
        }
        Insert: {
          co_quan_ban_hanh: string
          con_so_moc?: number | null
          created_at?: string
          doi_tuong_ap_dung?: string[]
          don_vi_moc?: string | null
          id?: string
          loai: string
          ngay_ban_hanh?: string | null
          ngay_hieu_luc?: string | null
          so_hieu: string
          ten: string
          thay_the_boi?: string | null
          tom_tat_chinh_thuc?: string | null
          tom_tat_de_hieu: string
          url_nguon: string
        }
        Update: {
          co_quan_ban_hanh?: string
          con_so_moc?: number | null
          created_at?: string
          doi_tuong_ap_dung?: string[]
          don_vi_moc?: string | null
          id?: string
          loai?: string
          ngay_ban_hanh?: string | null
          ngay_hieu_luc?: string | null
          so_hieu?: string
          ten?: string
          thay_the_boi?: string | null
          tom_tat_chinh_thuc?: string | null
          tom_tat_de_hieu?: string
          url_nguon?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_thay_the_boi_fkey"
            columns: ["thay_the_boi"]
            isOneToOne: false
            referencedRelation: "legal_documents"
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
      macro_news: {
        Row: {
          fetched_at: string
          id: string
          impact: string
          published_at: string | null
          source: string
          summary: string | null
          title: string
          topic: string
          url: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          impact?: string
          published_at?: string | null
          source: string
          summary?: string | null
          title: string
          topic?: string
          url: string
        }
        Update: {
          fetched_at?: string
          id?: string
          impact?: string
          published_at?: string | null
          source?: string
          summary?: string | null
          title?: string
          topic?: string
          url?: string
        }
        Relationships: []
      }
      p2p_commitments: {
        Row: {
          created_at: string
          id: string
          lender_company_id: string | null
          lender_user_id: string | null
          listing_id: string
          so_tien: number
          trang_thai: string
        }
        Insert: {
          created_at?: string
          id?: string
          lender_company_id?: string | null
          lender_user_id?: string | null
          listing_id: string
          so_tien: number
          trang_thai?: string
        }
        Update: {
          created_at?: string
          id?: string
          lender_company_id?: string | null
          lender_user_id?: string | null
          listing_id?: string
          so_tien?: number
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_commitments_lender_company_id_fkey"
            columns: ["lender_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_commitments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "p2p_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_listings: {
        Row: {
          company_id: string
          created_at: string
          da_gop: number
          id: string
          ky_han_ngay: number
          lai_suat_nam: number
          muc_dich: string | null
          so_tien: number
          trang_thai: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          da_gop?: number
          id?: string
          ky_han_ngay: number
          lai_suat_nam: number
          muc_dich?: string | null
          so_tien: number
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          da_gop?: number
          id?: string
          ky_han_ngay?: number
          lai_suat_nam?: number
          muc_dich?: string | null
          so_tien?: number
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          claim: string
          confidence: number
          created_at: string
          id: string
          outcome: string
          resolve_on: string
          resolved_at: string | null
          resolved_note: string | null
          seed_news_id: string | null
          source: string
        }
        Insert: {
          claim: string
          confidence: number
          created_at?: string
          id?: string
          outcome?: string
          resolve_on: string
          resolved_at?: string | null
          resolved_note?: string | null
          seed_news_id?: string | null
          source?: string
        }
        Update: {
          claim?: string
          confidence?: number
          created_at?: string
          id?: string
          outcome?: string
          resolve_on?: string
          resolved_at?: string | null
          resolved_note?: string | null
          seed_news_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_seed_news_id_fkey"
            columns: ["seed_news_id"]
            isOneToOne: false
            referencedRelation: "macro_news"
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
          created_at?: string
          id?: number
          name: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_company_id: string | null
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
          active_company_id?: string | null
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
          active_company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_demo?: boolean
          notification_prefs?: Json
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          account_number?: string | null
          amount: number
          bin?: string | null
          company_id: string
          created_at?: string
          description: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          paid_transaction_id?: string | null
          qr_code?: string | null
          reference_number: string
          status?: string
          updated_at?: string
          virtual_account_number?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          bin?: string | null
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          paid_transaction_id?: string | null
          qr_code?: string | null
          reference_number?: string
          status?: string
          updated_at?: string
          virtual_account_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_payments_paid_transaction_id_fkey"
            columns: ["paid_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          matched_transaction_id: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          plan: string
          received_amount: number | null
          reference_code: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          id?: string
          matched_transaction_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan: string
          received_amount?: number | null
          reference_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          matched_transaction_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan?: string
          received_amount?: number | null
          reference_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string
          current_period_end: string
          last_invoice_id: string | null
          plan: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_period_end: string
          last_invoice_id?: string | null
          plan: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_period_end?: string
          last_invoice_id?: string | null
          plan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_last_invoice_id_fkey"
            columns: ["last_invoice_id"]
            isOneToOne: false
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_labels: {
        Row: {
          category: string | null
          company_id: string
          confidence: number | null
          created_at: string
          id: string
          is_internal_transfer: boolean
          is_personal: boolean
          needs_review: boolean
          paired_transaction_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          is_internal_transfer?: boolean
          is_personal?: boolean
          needs_review?: boolean
          paired_transaction_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          is_internal_transfer?: boolean
          is_personal?: boolean
          needs_review?: boolean
          paired_transaction_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_labels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_labels_paired_transaction_id_fkey"
            columns: ["paired_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_labels_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_number: string | null
          amount: number
          category: string | null
          company_id: string
          counter_account_name: string | null
          counter_account_number: string | null
          created_at: string
          id: string
          is_synthetic: boolean
          merchant_name: string | null
          payment_reference: string | null
          reference_id: string | null
          source_bank: string | null
          transaction_date: string
          type: string
          virtual_account_number: string | null
        }
        Insert: {
          account_number?: string | null
          amount: number
          category?: string | null
          company_id: string
          counter_account_name?: string | null
          counter_account_number?: string | null
          created_at?: string
          id?: string
          is_synthetic?: boolean
          merchant_name?: string | null
          payment_reference?: string | null
          reference_id?: string | null
          source_bank?: string | null
          transaction_date: string
          type: string
          virtual_account_number?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          category?: string | null
          company_id?: string
          counter_account_name?: string | null
          counter_account_number?: string | null
          created_at?: string
          id?: string
          is_synthetic?: boolean
          merchant_name?: string | null
          payment_reference?: string | null
          reference_id?: string | null
          source_bank?: string | null
          transaction_date?: string
          type?: string
          virtual_account_number?: string | null
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
      webhook_events: {
        Row: {
          event_code: string | null
          event_type: string | null
          grant_id: string | null
          id: string
          note: string | null
          outcome: string | null
          payload: Json
          provider: string
          received_at: string
        }
        Insert: {
          event_code?: string | null
          event_type?: string | null
          grant_id?: string | null
          id?: string
          note?: string | null
          outcome?: string | null
          payload: Json
          provider: string
          received_at?: string
        }
        Update: {
          event_code?: string | null
          event_type?: string | null
          grant_id?: string | null
          id?: string
          note?: string | null
          outcome?: string | null
          payload?: Json
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      chay_doi_soat_thue_bao: { Args: never; Returns: undefined }
      current_role: { Args: never; Returns: string }
      user_company_ids: { Args: { uid: string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
