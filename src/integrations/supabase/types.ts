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
      bang_chung_viec: {
        Row: {
          company_id: string
          gia_tri: string | null
          ho_so_viec_id: string
          id: string
          khoa_trung: string
          loai: string
          nguon: string
          tai_lieu_id: string | null
          tao_boi: string | null
          tao_luc: string
          trang_thai_xac_minh: string
        }
        Insert: {
          company_id: string
          gia_tri?: string | null
          ho_so_viec_id: string
          id?: string
          khoa_trung: string
          loai: string
          nguon: string
          tai_lieu_id?: string | null
          tao_boi?: string | null
          tao_luc?: string
          trang_thai_xac_minh: string
        }
        Update: {
          company_id?: string
          gia_tri?: string | null
          ho_so_viec_id?: string
          id?: string
          khoa_trung?: string
          loai?: string
          nguon?: string
          tai_lieu_id?: string | null
          tao_boi?: string | null
          tao_luc?: string
          trang_thai_xac_minh?: string
        }
        Relationships: [
          {
            foreignKeyName: "bang_chung_viec_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bang_chung_viec_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bang_chung_viec_ho_so_viec_id_fkey"
            columns: ["ho_so_viec_id"]
            isOneToOne: false
            referencedRelation: "ho_so_viec"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bang_chung_viec_tai_lieu_id_fkey"
            columns: ["tai_lieu_id"]
            isOneToOne: false
            referencedRelation: "tai_lieu"
            referencedColumns: ["id"]
          },
        ]
      }
      bang_gia_model: {
        Row: {
          gia_ra_usd_moi_trieu: number
          gia_vao_usd_moi_trieu: number
          lay_luc: string
          model_id: string
          nguon: string
          ten: string
        }
        Insert: {
          gia_ra_usd_moi_trieu: number
          gia_vao_usd_moi_trieu: number
          lay_luc?: string
          model_id: string
          nguon?: string
          ten: string
        }
        Update: {
          gia_ra_usd_moi_trieu?: number
          gia_vao_usd_moi_trieu?: number
          lay_luc?: string
          model_id?: string
          nguon?: string
          ten?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          access_token_enc: Json | null
          account_name: string | null
          account_number: string | null
          accounts: Json | null
          bank_code: string
          bank_name: string
          co_token: boolean | null
          company_id: string
          consent_expires_at: string | null
          consent_granted: boolean | null
          created_at: string
          direction_convention: string | null
          grant_id: string | null
          id: string
          last_error_at: string | null
          last_error_code: string | null
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
          co_token?: boolean | null
          company_id: string
          consent_expires_at?: string | null
          consent_granted?: boolean | null
          created_at?: string
          direction_convention?: string | null
          grant_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
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
          co_token?: boolean | null
          company_id?: string
          consent_expires_at?: string | null
          consent_granted?: boolean | null
          created_at?: string
          direction_convention?: string | null
          grant_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      buoc_hanh_trinh: {
        Row: {
          company_id: string
          dich_hanh_dong: string | null
          du_kien_can: string[]
          giay_to_can: string[]
          hanh_trinh_id: string
          hoan_tat_luc: string | null
          id: string
          khoa: string
          loai_hanh_dong: string | null
          ly_do_chan: string | null
          mo_ta: string
          nghia_vu: string[]
          thu_tu: number
          thu_tuc: string[]
          tieu_de: string
          trang_thai: string
          uu_tien: number
        }
        Insert: {
          company_id: string
          dich_hanh_dong?: string | null
          du_kien_can?: string[]
          giay_to_can?: string[]
          hanh_trinh_id: string
          hoan_tat_luc?: string | null
          id?: string
          khoa: string
          loai_hanh_dong?: string | null
          ly_do_chan?: string | null
          mo_ta?: string
          nghia_vu?: string[]
          thu_tu: number
          thu_tuc?: string[]
          tieu_de: string
          trang_thai?: string
          uu_tien?: number
        }
        Update: {
          company_id?: string
          dich_hanh_dong?: string | null
          du_kien_can?: string[]
          giay_to_can?: string[]
          hanh_trinh_id?: string
          hoan_tat_luc?: string | null
          id?: string
          khoa?: string
          loai_hanh_dong?: string | null
          ly_do_chan?: string | null
          mo_ta?: string
          nghia_vu?: string[]
          thu_tu?: number
          thu_tuc?: string[]
          tieu_de?: string
          trang_thai?: string
          uu_tien?: number
        }
        Relationships: [
          {
            foreignKeyName: "buoc_hanh_trinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "buoc_hanh_trinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buoc_hanh_trinh_hanh_trinh_id_fkey"
            columns: ["hanh_trinh_id"]
            isOneToOne: false
            referencedRelation: "hanh_trinh"
            referencedColumns: ["id"]
          },
        ]
      }
      cai_dat_thong_bao: {
        Row: {
          cap_nhat_luc: string
          loai_tat: string[]
          user_id: string
        }
        Insert: {
          cap_nhat_luc?: string
          loai_tat?: string[]
          user_id: string
        }
        Update: {
          cap_nhat_luc?: string
          loai_tat?: string[]
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "carbon_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chi_phi_ai: {
        Row: {
          company_id: string
          created_at: string
          du_an: string
          hang_muc: string
          id: number
          lo_nhap_id: string | null
          ngay: string
          nguon: string
          nha_cung_cap: string
          so_tien_usd: number
        }
        Insert: {
          company_id: string
          created_at?: string
          du_an?: string
          hang_muc?: string
          id?: never
          lo_nhap_id?: string | null
          ngay: string
          nguon: string
          nha_cung_cap: string
          so_tien_usd: number
        }
        Update: {
          company_id?: string
          created_at?: string
          du_an?: string
          hang_muc?: string
          id?: never
          lo_nhap_id?: string | null
          ngay?: string
          nguon?: string
          nha_cung_cap?: string
          so_tien_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "chi_phi_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "chi_phi_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chi_phi_ai_lo_nhap_id_fkey"
            columns: ["lo_nhap_id"]
            isOneToOne: false
            referencedRelation: "lo_nhap_chi_phi_ai"
            referencedColumns: ["id"]
          },
        ]
      }
      chinh_sach_chi: {
        Row: {
          chi_tra_nguoi_nhan_da_duyet: boolean
          company_id: string
          han_muc_moi_lan: number
          han_muc_ngay: number
          han_muc_thang: number
          het_han: string | null
          nguong_can_duyet: number
          nhom_chi_duoc_phep: string[] | null
          so_yeu_cau_moi_gio: number | null
          tac_tu_id: string
          updated_at: string
        }
        Insert: {
          chi_tra_nguoi_nhan_da_duyet?: boolean
          company_id: string
          han_muc_moi_lan?: number
          han_muc_ngay?: number
          han_muc_thang?: number
          het_han?: string | null
          nguong_can_duyet?: number
          nhom_chi_duoc_phep?: string[] | null
          so_yeu_cau_moi_gio?: number | null
          tac_tu_id: string
          updated_at?: string
        }
        Update: {
          chi_tra_nguoi_nhan_da_duyet?: boolean
          company_id?: string
          han_muc_moi_lan?: number
          han_muc_ngay?: number
          han_muc_thang?: number
          het_han?: string | null
          nguong_can_duyet?: number
          nhom_chi_duoc_phep?: string[] | null
          so_yeu_cau_moi_gio?: number | null
          tac_tu_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chinh_sach_chi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "chinh_sach_chi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chinh_sach_chi_tac_tu_id_fkey"
            columns: ["tac_tu_id"]
            isOneToOne: true
            referencedRelation: "tac_tu"
            referencedColumns: ["id"]
          },
        ]
      }
      chung_tu_quet: {
        Row: {
          anh_path: string | null
          anh_sha256: string | null
          ben_ban: string | null
          company_id: string
          created_at: string
          giao_dich_id: string | null
          id: string
          ky_hieu: string | null
          loai: string
          ma_so_thue_ben_ban: string | null
          ngay: string | null
          so_hoa_don: string | null
          tien_thue: number | null
          tien_truoc_thue: number | null
          tong_tien: number
          user_id: string
        }
        Insert: {
          anh_path?: string | null
          anh_sha256?: string | null
          ben_ban?: string | null
          company_id: string
          created_at?: string
          giao_dich_id?: string | null
          id?: string
          ky_hieu?: string | null
          loai: string
          ma_so_thue_ben_ban?: string | null
          ngay?: string | null
          so_hoa_don?: string | null
          tien_thue?: number | null
          tien_truoc_thue?: number | null
          tong_tien: number
          user_id: string
        }
        Update: {
          anh_path?: string | null
          anh_sha256?: string | null
          ben_ban?: string | null
          company_id?: string
          created_at?: string
          giao_dich_id?: string | null
          id?: string
          ky_hieu?: string | null
          loai?: string
          ma_so_thue_ben_ban?: string | null
          ngay?: string | null
          so_hoa_don?: string | null
          tien_thue?: number | null
          tien_truoc_thue?: number | null
          tong_tien?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chung_tu_quet_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "chung_tu_quet_company_id_fkey"
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      co_quan: {
        Row: {
          dia_ban: string | null
          kenh_nop: string[]
          khoa: string
          loai: string
          nguon: Json
          ten: string
          thu_tuc_ho_tro: string[]
          url_chinh_thuc: string | null
          url_cong: string | null
          xac_minh_luc: string | null
        }
        Insert: {
          dia_ban?: string | null
          kenh_nop?: string[]
          khoa: string
          loai: string
          nguon?: Json
          ten: string
          thu_tuc_ho_tro?: string[]
          url_chinh_thuc?: string | null
          url_cong?: string | null
          xac_minh_luc?: string | null
        }
        Update: {
          dia_ban?: string | null
          kenh_nop?: string[]
          khoa?: string
          loai?: string
          nguon?: Json
          ten?: string
          thu_tuc_ho_tro?: string[]
          url_chinh_thuc?: string | null
          url_cong?: string | null
          xac_minh_luc?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          account_type: string | null
          co_quan_thue: string | null
          connected_banks: Json | null
          created_at: string
          credit_limit: number | null
          credit_score: number | null
          dia_chi_theo_mst: string | null
          employee_count: string | null
          id: string
          industry: string | null
          la_demo: boolean
          loai_theo_mst: string | null
          mau_dai_dien: number | null
          monthly_revenue: number | null
          mst_tra_luc: string | null
          name: string
          onboarding_done_at: string | null
          primary_goal: string | null
          province: string | null
          tax_id: string | null
          ten_theo_mst: string | null
          trang_thai_mst: string | null
          updated_at: string
          user_id: string
          years_operating: string | null
        }
        Insert: {
          account_type?: string | null
          co_quan_thue?: string | null
          connected_banks?: Json | null
          created_at?: string
          credit_limit?: number | null
          credit_score?: number | null
          dia_chi_theo_mst?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          la_demo?: boolean
          loai_theo_mst?: string | null
          mau_dai_dien?: number | null
          monthly_revenue?: number | null
          mst_tra_luc?: string | null
          name: string
          onboarding_done_at?: string | null
          primary_goal?: string | null
          province?: string | null
          tax_id?: string | null
          ten_theo_mst?: string | null
          trang_thai_mst?: string | null
          updated_at?: string
          user_id: string
          years_operating?: string | null
        }
        Update: {
          account_type?: string | null
          co_quan_thue?: string | null
          connected_banks?: Json | null
          created_at?: string
          credit_limit?: number | null
          credit_score?: number | null
          dia_chi_theo_mst?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          la_demo?: boolean
          loai_theo_mst?: string | null
          mau_dai_dien?: number | null
          monthly_revenue?: number | null
          mst_tra_luc?: string | null
          name?: string
          onboarding_done_at?: string | null
          primary_goal?: string | null
          province?: string | null
          tax_id?: string | null
          ten_theo_mst?: string | null
          trang_thai_mst?: string | null
          updated_at?: string
          user_id?: string
          years_operating?: string | null
        }
        Relationships: []
      }
      cong_cu_ghim: {
        Row: {
          created_at: string
          khoa: string
          thu_tu: number
          user_id: string
        }
        Insert: {
          created_at?: string
          khoa: string
          thu_tu?: number
          user_id: string
        }
        Update: {
          created_at?: string
          khoa?: string
          thu_tu?: number
          user_id?: string
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "credit_score_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dang_ky_day: {
        Row: {
          auth: string
          day_luc: string | null
          endpoint: string
          id: string
          p256dh: string
          tao_luc: string
          thiet_bi: string | null
          user_id: string
        }
        Insert: {
          auth: string
          day_luc?: string | null
          endpoint: string
          id?: string
          p256dh: string
          tao_luc?: string
          thiet_bi?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          day_luc?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          tao_luc?: string
          thiet_bi?: string | null
          user_id?: string
        }
        Relationships: []
      }
      danh_muc_dau_tu: {
        Row: {
          company_id: string
          created_at: string
          ghi_chu: string | null
          gia_von_usd: number | null
          id: string
          ma: string
          so_luong: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          ghi_chu?: string | null
          gia_von_usd?: number | null
          id?: string
          ma: string
          so_luong: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          ghi_chu?: string | null
          gia_von_usd?: number | null
          id?: string
          ma?: string
          so_luong?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "danh_muc_dau_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "danh_muc_dau_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      danh_muc_to_khai: {
        Row: {
          gia_tri_cong: string
          lay_luc: string
          ma: string | null
          nguon: string
          ten: string
          van_ban: string | null
        }
        Insert: {
          gia_tri_cong: string
          lay_luc: string
          ma?: string | null
          nguon: string
          ten: string
          van_ban?: string | null
        }
        Update: {
          gia_tri_cong?: string
          lay_luc?: string
          ma?: string | null
          nguon?: string
          ten?: string
          van_ban?: string | null
        }
        Relationships: []
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
      doan_phap_luat: {
        Row: {
          id: number
          ma_cong_bao: string
          ngu_canh: string | null
          nhan: string | null
          noi_dung: string
          thu_tu: number
          tim: unknown
        }
        Insert: {
          id?: never
          ma_cong_bao: string
          ngu_canh?: string | null
          nhan?: string | null
          noi_dung: string
          thu_tu: number
          tim?: unknown
        }
        Update: {
          id?: never
          ma_cong_bao?: string
          ngu_canh?: string | null
          nhan?: string | null
          noi_dung?: string
          thu_tu?: number
          tim?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "doan_phap_luat_ma_cong_bao_fkey"
            columns: ["ma_cong_bao"]
            isOneToOne: false
            referencedRelation: "van_ban_phap_luat"
            referencedColumns: ["ma_cong_bao"]
          },
        ]
      }
      duyet_tai_lieu: {
        Row: {
          boi: string
          company_id: string
          id: number
          ket_qua: string
          luc: string
          nhan_xet: string | null
          phien_ban_so: number
          tai_lieu_id: string
          vai_tro_duyet: string
        }
        Insert: {
          boi: string
          company_id: string
          id?: never
          ket_qua: string
          luc?: string
          nhan_xet?: string | null
          phien_ban_so: number
          tai_lieu_id: string
          vai_tro_duyet: string
        }
        Update: {
          boi?: string
          company_id?: string
          id?: never
          ket_qua?: string
          luc?: string
          nhan_xet?: string | null
          phien_ban_so?: number
          tai_lieu_id?: string
          vai_tro_duyet?: string
        }
        Relationships: [
          {
            foreignKeyName: "duyet_tai_lieu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "duyet_tai_lieu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duyet_tai_lieu_tai_lieu_id_fkey"
            columns: ["tai_lieu_id"]
            isOneToOne: false
            referencedRelation: "tai_lieu"
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "gdt_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gioi_han_goi: {
        Row: {
          cua_so: string
          hanh_dong: string
          so_lan: number
          user_id: string
        }
        Insert: {
          cua_so: string
          hanh_dong: string
          so_lan?: number
          user_id: string
        }
        Update: {
          cua_so?: string
          hanh_dong?: string
          so_lan?: number
          user_id?: string
        }
        Relationships: []
      }
      hanh_trinh: {
        Row: {
          buoc_hien_tai: string | null
          cap_nhat_luc: string
          company_id: string
          du_kien: Json
          ho_so_viec_id: string | null
          hoan_tat_luc: string | null
          id: string
          loai: string
          loai_chu_the: string | null
          nghia_vu_nguon: string[]
          tao_boi: string | null
          tao_luc: string
          tieu_de: string
          trang_thai: string
          trang_thai_doanh_nghiep: string | null
          y_dinh: string
        }
        Insert: {
          buoc_hien_tai?: string | null
          cap_nhat_luc?: string
          company_id: string
          du_kien?: Json
          ho_so_viec_id?: string | null
          hoan_tat_luc?: string | null
          id?: string
          loai: string
          loai_chu_the?: string | null
          nghia_vu_nguon?: string[]
          tao_boi?: string | null
          tao_luc?: string
          tieu_de: string
          trang_thai?: string
          trang_thai_doanh_nghiep?: string | null
          y_dinh?: string
        }
        Update: {
          buoc_hien_tai?: string | null
          cap_nhat_luc?: string
          company_id?: string
          du_kien?: Json
          ho_so_viec_id?: string | null
          hoan_tat_luc?: string | null
          id?: string
          loai?: string
          loai_chu_the?: string | null
          nghia_vu_nguon?: string[]
          tao_boi?: string | null
          tao_luc?: string
          tieu_de?: string
          trang_thai?: string
          trang_thai_doanh_nghiep?: string | null
          y_dinh?: string
        }
        Relationships: [
          {
            foreignKeyName: "hanh_trinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "hanh_trinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hanh_trinh_ho_so_viec_id_fkey"
            columns: ["ho_so_viec_id"]
            isOneToOne: false
            referencedRelation: "ho_so_viec"
            referencedColumns: ["id"]
          },
        ]
      }
      ho_so_thue: {
        Row: {
          bat_dau_kinh_doanh: string | null
          co_quan_he_lien_ket: boolean | null
          company_id: string
          da_nop_thue_trong_nam: boolean | null
          doanh_thu_nam_truoc: number | null
          kenh: string | null
          loai_nguoi_nop: string | null
          nganh_dac_thu: string | null
          nhom_nganh: string[]
          phuong_phap_tncn: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bat_dau_kinh_doanh?: string | null
          co_quan_he_lien_ket?: boolean | null
          company_id: string
          da_nop_thue_trong_nam?: boolean | null
          doanh_thu_nam_truoc?: number | null
          kenh?: string | null
          loai_nguoi_nop?: string | null
          nganh_dac_thu?: string | null
          nhom_nganh?: string[]
          phuong_phap_tncn?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bat_dau_kinh_doanh?: string | null
          co_quan_he_lien_ket?: boolean | null
          company_id?: string
          da_nop_thue_trong_nam?: boolean | null
          doanh_thu_nam_truoc?: number | null
          kenh?: string | null
          loai_nguoi_nop?: string | null
          nganh_dac_thu?: string | null
          nhom_nganh?: string[]
          phuong_phap_tncn?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ho_so_thue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ho_so_thue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ho_so_viec: {
        Row: {
          cap_nhat_luc: string
          company_id: string
          dau_van_tay: string
          doi_tuong: string | null
          giai_quyet_boi: string | null
          giai_quyet_luc: string | null
          han_luat: string | null
          han_luat_nguon: string | null
          hen_kiem_lai: string | null
          id: string
          ket_qua: string | null
          ky: string | null
          loai: string
          muc_do: string
          ngay_nen_lam: string | null
          ngay_nen_lam_ly_do: string | null
          nguon: Json
          phien_ban: number
          so_lan_nhac: number
          tao_boi: string | null
          tao_luc: string
          tieu_de: string
          trang_thai: string
        }
        Insert: {
          cap_nhat_luc?: string
          company_id: string
          dau_van_tay: string
          doi_tuong?: string | null
          giai_quyet_boi?: string | null
          giai_quyet_luc?: string | null
          han_luat?: string | null
          han_luat_nguon?: string | null
          hen_kiem_lai?: string | null
          id?: string
          ket_qua?: string | null
          ky?: string | null
          loai: string
          muc_do?: string
          ngay_nen_lam?: string | null
          ngay_nen_lam_ly_do?: string | null
          nguon?: Json
          phien_ban?: number
          so_lan_nhac?: number
          tao_boi?: string | null
          tao_luc?: string
          tieu_de: string
          trang_thai?: string
        }
        Update: {
          cap_nhat_luc?: string
          company_id?: string
          dau_van_tay?: string
          doi_tuong?: string | null
          giai_quyet_boi?: string | null
          giai_quyet_luc?: string | null
          han_luat?: string | null
          han_luat_nguon?: string | null
          hen_kiem_lai?: string | null
          id?: string
          ket_qua?: string | null
          ky?: string | null
          loai?: string
          muc_do?: string
          ngay_nen_lam?: string | null
          ngay_nen_lam_ly_do?: string | null
          nguon?: Json
          phien_ban?: number
          so_lan_nhac?: number
          tao_boi?: string | null
          tao_luc?: string
          tieu_de?: string
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "ho_so_viec_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ho_so_viec_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hoi_thoai_tro_ly: {
        Row: {
          cau_hoi: string
          cau_tra_loi: string
          che_do: string
          company_id: string
          de_xuat: Json
          do_day: string
          id: string
          mo_hinh: string | null
          nang_luc: string[]
          nguon: Json
          tao_luc: string
          user_id: string
        }
        Insert: {
          cau_hoi: string
          cau_tra_loi?: string
          che_do: string
          company_id: string
          de_xuat?: Json
          do_day?: string
          id?: string
          mo_hinh?: string | null
          nang_luc?: string[]
          nguon?: Json
          tao_luc?: string
          user_id: string
        }
        Update: {
          cau_hoi?: string
          cau_tra_loi?: string
          che_do?: string
          company_id?: string
          de_xuat?: Json
          do_day?: string
          id?: string
          mo_hinh?: string | null
          nang_luc?: string[]
          nguon?: Json
          tao_luc?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoi_thoai_tro_ly_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "hoi_thoai_tro_ly_company_id_fkey"
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
          is_synthetic: boolean
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
          is_synthetic?: boolean
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
          is_synthetic?: boolean
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ket_noi_chi_phi_ai: {
        Row: {
          company_id: string
          created_at: string
          dong_bo_luc: string | null
          du_lieu_toi: string | null
          id: string
          khoa_enc: Json | null
          khoa_hien: string
          loi_cuoi: string | null
          nha_cung_cap: string
          trang_thai: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dong_bo_luc?: string | null
          du_lieu_toi?: string | null
          id?: string
          khoa_enc?: Json | null
          khoa_hien: string
          loi_cuoi?: string | null
          nha_cung_cap: string
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dong_bo_luc?: string | null
          du_lieu_toi?: string | null
          id?: string
          khoa_enc?: Json | null
          khoa_hien?: string
          loi_cuoi?: string | null
          nha_cung_cap?: string
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ket_noi_chi_phi_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ket_noi_chi_phi_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ket_qua_quy_trinh: {
        Row: {
          company_id: string
          ghi_boi: string | null
          id: number
          ky: string
          nguon: string
          quy_trinh_id: string
          so_thanh_cong: number
          so_that_bai: number
          sua_luc: string
        }
        Insert: {
          company_id: string
          ghi_boi?: string | null
          id?: never
          ky: string
          nguon?: string
          quy_trinh_id: string
          so_thanh_cong: number
          so_that_bai?: number
          sua_luc?: string
        }
        Update: {
          company_id?: string
          ghi_boi?: string | null
          id?: never
          ky?: string
          nguon?: string
          quy_trinh_id?: string
          so_thanh_cong?: number
          so_that_bai?: number
          sua_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "ket_qua_quy_trinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ket_qua_quy_trinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ket_qua_quy_trinh_quy_trinh_id_fkey"
            columns: ["quy_trinh_id"]
            isOneToOne: false
            referencedRelation: "quy_trinh_ai"
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "kyc_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lan_goi_mo_hinh: {
        Row: {
          company_id: string | null
          do_tre_ms: number
          id: number
          luc: string
          ma_loi: number | null
          mo_hinh: string
          muc_dich: string
          nha_cung_cap: string
          thanh_cong: boolean
          token_ra: number | null
          token_vao: number | null
        }
        Insert: {
          company_id?: string | null
          do_tre_ms: number
          id?: never
          luc?: string
          ma_loi?: number | null
          mo_hinh: string
          muc_dich: string
          nha_cung_cap: string
          thanh_cong: boolean
          token_ra?: number | null
          token_vao?: number | null
        }
        Update: {
          company_id?: string | null
          do_tre_ms?: number
          id?: never
          luc?: string
          ma_loi?: number | null
          mo_hinh?: string
          muc_dich?: string
          nha_cung_cap?: string
          thanh_cong?: boolean
          token_ra?: number | null
          token_vao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lan_goi_mo_hinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lan_goi_mo_hinh_company_id_fkey"
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
      lo_nhap_chi_phi_ai: {
        Row: {
          company_id: string
          created_at: string
          den_ngay: string
          id: string
          nha_cung_cap: string
          so_dong: number
          ten_file: string
          tong_usd: number
          tu_ngay: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          den_ngay: string
          id?: string
          nha_cung_cap: string
          so_dong: number
          ten_file: string
          tong_usd: number
          tu_ngay: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          den_ngay?: string
          id?: string
          nha_cung_cap?: string
          so_dong?: number
          ten_file?: string
          tong_usd?: number
          tu_ngay?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lo_nhap_chi_phi_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lo_nhap_chi_phi_ai_company_id_fkey"
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "loan_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      luot_to_khai: {
        Row: {
          company_id: string
          hoa_don_id: string | null
          id: string
          ky_khoa: string | null
          ly_do: string
          tao_luc: string
          thay_doi: number
          to_khai_nhap_id: string | null
        }
        Insert: {
          company_id: string
          hoa_don_id?: string | null
          id?: string
          ky_khoa?: string | null
          ly_do: string
          tao_luc?: string
          thay_doi: number
          to_khai_nhap_id?: string | null
        }
        Update: {
          company_id?: string
          hoa_don_id?: string | null
          id?: string
          ky_khoa?: string | null
          ly_do?: string
          tao_luc?: string
          thay_doi?: number
          to_khai_nhap_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "luot_to_khai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "luot_to_khai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luot_to_khai_hoa_don_id_fkey"
            columns: ["hoa_don_id"]
            isOneToOne: true
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luot_to_khai_to_khai_nhap_id_fkey"
            columns: ["to_khai_nhap_id"]
            isOneToOne: false
            referencedRelation: "to_khai_nhap"
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
      mau_bieu_chinh_thuc: {
        Row: {
          cach_nop: string[]
          co_quan: string | null
          ghi_chu: string | null
          hieu_luc_den: string | null
          hieu_luc_tu: string | null
          loai_mau: string | null
          luoc_do_truong: Json | null
          ma_mau: string
          mau_tep: string | null
          nguon_url: string | null
          phien_ban: string | null
          ten: string | null
          thu_tuc_ma: string[]
          trang_thai: string
          van_ban_nguon: string | null
          xac_minh_luc: string | null
          yeu_cau_ky: string | null
        }
        Insert: {
          cach_nop?: string[]
          co_quan?: string | null
          ghi_chu?: string | null
          hieu_luc_den?: string | null
          hieu_luc_tu?: string | null
          loai_mau?: string | null
          luoc_do_truong?: Json | null
          ma_mau: string
          mau_tep?: string | null
          nguon_url?: string | null
          phien_ban?: string | null
          ten?: string | null
          thu_tuc_ma?: string[]
          trang_thai?: string
          van_ban_nguon?: string | null
          xac_minh_luc?: string | null
          yeu_cau_ky?: string | null
        }
        Update: {
          cach_nop?: string[]
          co_quan?: string | null
          ghi_chu?: string | null
          hieu_luc_den?: string | null
          hieu_luc_tu?: string | null
          loai_mau?: string | null
          luoc_do_truong?: Json | null
          ma_mau?: string
          mau_tep?: string | null
          nguon_url?: string | null
          phien_ban?: string | null
          ten?: string | null
          thu_tuc_ma?: string[]
          trang_thai?: string
          van_ban_nguon?: string | null
          xac_minh_luc?: string | null
          yeu_cau_ky?: string | null
        }
        Relationships: []
      }
      neo_thoi_gian: {
        Row: {
          bang_chung_bitcoin: string | null
          bang_chung_cho: string
          company_id: string
          created_at: string
          goc_merkle: string
          id: number
          khoi_bitcoin: number | null
          lich: string
          loi_cuoi: string | null
          so_la: number
          trang_thai: string
          updated_at: string
        }
        Insert: {
          bang_chung_bitcoin?: string | null
          bang_chung_cho: string
          company_id: string
          created_at?: string
          goc_merkle: string
          id?: never
          khoi_bitcoin?: number | null
          lich: string
          loi_cuoi?: string | null
          so_la: number
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          bang_chung_bitcoin?: string | null
          bang_chung_cho?: string
          company_id?: string
          created_at?: string
          goc_merkle?: string
          id?: never
          khoi_bitcoin?: number | null
          lich?: string
          loi_cuoi?: string | null
          so_la?: number
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neo_thoi_gian_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "neo_thoi_gian_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ngan_sach_chi_phi_ai: {
        Row: {
          canh_bao_phan_tram: number
          company_id: string
          han_muc_thang_usd: number
          updated_at: string
        }
        Insert: {
          canh_bao_phan_tram?: number
          company_id: string
          han_muc_thang_usd: number
          updated_at?: string
        }
        Update: {
          canh_bao_phan_tram?: number
          company_id?: string
          han_muc_thang_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ngan_sach_chi_phi_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ngan_sach_chi_phi_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nguoi_nhan_duoc_phep: {
        Row: {
          company_id: string
          created_at: string
          ghi_chu: string | null
          id: string
          ngan_hang_bin: string
          so_tai_khoan: string
          ten_chu_tai_khoan: string
        }
        Insert: {
          company_id: string
          created_at?: string
          ghi_chu?: string | null
          id?: string
          ngan_hang_bin: string
          so_tai_khoan: string
          ten_chu_tai_khoan: string
        }
        Update: {
          company_id?: string
          created_at?: string
          ghi_chu?: string | null
          id?: string
          ngan_hang_bin?: string
          so_tai_khoan?: string
          ten_chu_tai_khoan?: string
        }
        Relationships: [
          {
            foreignKeyName: "nguoi_nhan_duoc_phep_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "nguoi_nhan_duoc_phep_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nhat_ky_quyet_dinh: {
        Row: {
          cau_hoi_luc_do: string
          company_id: string
          de_xuat_khoa: string
          hoi_thoai_id: string | null
          id: number
          ket_qua: string
          ket_qua_cau: string
          loai: string
          ma_loi: string | null
          mo_ta_da_xac_nhan: string
          tham_so: Json
          user_id: string
          vai_tro: string
          xac_nhan_luc: string
          xong_luc: string | null
        }
        Insert: {
          cau_hoi_luc_do?: string
          company_id: string
          de_xuat_khoa: string
          hoi_thoai_id?: string | null
          id?: never
          ket_qua: string
          ket_qua_cau?: string
          loai: string
          ma_loi?: string | null
          mo_ta_da_xac_nhan?: string
          tham_so?: Json
          user_id: string
          vai_tro: string
          xac_nhan_luc?: string
          xong_luc?: string | null
        }
        Update: {
          cau_hoi_luc_do?: string
          company_id?: string
          de_xuat_khoa?: string
          hoi_thoai_id?: string | null
          id?: never
          ket_qua?: string
          ket_qua_cau?: string
          loai?: string
          ma_loi?: string | null
          mo_ta_da_xac_nhan?: string
          tham_so?: Json
          user_id?: string
          vai_tro?: string
          xac_nhan_luc?: string
          xong_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nhat_ky_quyet_dinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "nhat_ky_quyet_dinh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nhat_ky_quyet_dinh_hoi_thoai_id_fkey"
            columns: ["hoi_thoai_id"]
            isOneToOne: false
            referencedRelation: "hoi_thoai_tro_ly"
            referencedColumns: ["id"]
          },
        ]
      }
      nhat_ky_tac_tu: {
        Row: {
          chi_tiet: Json
          company_id: string
          created_at: string
          id: number
          nguoi: string
          su_kien: string
          tac_tu_id: string | null
          user_id: string | null
          yeu_cau_id: string | null
        }
        Insert: {
          chi_tiet?: Json
          company_id: string
          created_at?: string
          id?: never
          nguoi: string
          su_kien: string
          tac_tu_id?: string | null
          user_id?: string | null
          yeu_cau_id?: string | null
        }
        Update: {
          chi_tiet?: Json
          company_id?: string
          created_at?: string
          id?: never
          nguoi?: string
          su_kien?: string
          tac_tu_id?: string | null
          user_id?: string | null
          yeu_cau_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nhat_ky_tac_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "nhat_ky_tac_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nhat_ky_tac_tu_tac_tu_id_fkey"
            columns: ["tac_tu_id"]
            isOneToOne: false
            referencedRelation: "tac_tu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nhat_ky_tac_tu_yeu_cau_id_fkey"
            columns: ["yeu_cau_id"]
            isOneToOne: false
            referencedRelation: "yeu_cau_chi"
            referencedColumns: ["id"]
          },
        ]
      }
      nhat_ky_thay_doi: {
        Row: {
          bang_chung: Json
          boi: string | null
          company_id: string
          doi_tuong: string
          doi_tuong_id: string
          hanh_dong: string
          id: number
          luc: string
          nguon: string | null
          sau: Json | null
          truoc: Json | null
        }
        Insert: {
          bang_chung?: Json
          boi?: string | null
          company_id: string
          doi_tuong: string
          doi_tuong_id: string
          hanh_dong: string
          id?: never
          luc?: string
          nguon?: string | null
          sau?: Json | null
          truoc?: Json | null
        }
        Update: {
          bang_chung?: Json
          boi?: string | null
          company_id?: string
          doi_tuong?: string
          doi_tuong_id?: string
          hanh_dong?: string
          id?: never
          luc?: string
          nguon?: string | null
          sau?: Json | null
          truoc?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nhat_ky_thay_doi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "nhat_ky_thay_doi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "p2p_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      phan_loai_hoat_dong: {
        Row: {
          company_id: string
          confirmed_at: string
          confirmed_by: string
          confirmed_role: string
          created_at: string
          goi_y: string | null
          hoat_dong: string
          id: string
          nguon: string
          nguon_id: string
          nguon_xac_dinh: string
          updated_at: string
        }
        Insert: {
          company_id: string
          confirmed_at?: string
          confirmed_by: string
          confirmed_role: string
          created_at?: string
          goi_y?: string | null
          hoat_dong: string
          id?: string
          nguon: string
          nguon_id: string
          nguon_xac_dinh?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          confirmed_at?: string
          confirmed_by?: string
          confirmed_role?: string
          created_at?: string
          goi_y?: string | null
          hoat_dong?: string
          id?: string
          nguon?: string
          nguon_id?: string
          nguon_xac_dinh?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phan_loai_hoat_dong_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "phan_loai_hoat_dong_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      phan_loai_hoat_dong_su_kien: {
        Row: {
          actor: string
          actor_role: string
          at: string
          company_id: string
          id: number
          la_hoan_tac: boolean
          nguon: string
          nguon_id: string
          nhom_hang_loat: string | null
          sang_hoat_dong: string | null
          tu_hoat_dong: string | null
        }
        Insert: {
          actor: string
          actor_role: string
          at?: string
          company_id: string
          id?: never
          la_hoan_tac?: boolean
          nguon: string
          nguon_id: string
          nhom_hang_loat?: string | null
          sang_hoat_dong?: string | null
          tu_hoat_dong?: string | null
        }
        Update: {
          actor?: string
          actor_role?: string
          at?: string
          company_id?: string
          id?: never
          la_hoan_tac?: boolean
          nguon?: string
          nguon_id?: string
          nhom_hang_loat?: string | null
          sang_hoat_dong?: string | null
          tu_hoat_dong?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phan_loai_hoat_dong_su_kien_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "phan_loai_hoat_dong_su_kien_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      phien_ban_tai_lieu: {
        Row: {
          company_id: string
          duong_dan: string
          ghi_chu: string | null
          id: string
          kich_thuoc: number
          mime: string
          noi_dung_bam: string
          so: number
          tai_lieu_id: string
          tao_boi: string | null
          tao_luc: string
          trang_thai: string
        }
        Insert: {
          company_id: string
          duong_dan: string
          ghi_chu?: string | null
          id?: string
          kich_thuoc: number
          mime: string
          noi_dung_bam: string
          so: number
          tai_lieu_id: string
          tao_boi?: string | null
          tao_luc?: string
          trang_thai: string
        }
        Update: {
          company_id?: string
          duong_dan?: string
          ghi_chu?: string | null
          id?: string
          kich_thuoc?: number
          mime?: string
          noi_dung_bam?: string
          so?: number
          tai_lieu_id?: string
          tao_boi?: string | null
          tao_luc?: string
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "phien_ban_tai_lieu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "phien_ban_tai_lieu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phien_ban_tai_lieu_tai_lieu_id_fkey"
            columns: ["tai_lieu_id"]
            isOneToOne: false
            referencedRelation: "tai_lieu"
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
          company_id: string | null
          created_at: string
          id: number
          name: string
          props: Json
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: number
          name: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: number
          name?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "product_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
      quan_he_hieu_luc: {
        Row: {
          co_ngoai_le: boolean
          do_tin_cay: string
          hieu_luc_tu: string
          id: number
          loai: string
          ma_cong_bao_nguon: string | null
          so_hieu_dich: string
          so_hieu_nguon: string
          tao_luc: string
          trich: string
        }
        Insert: {
          co_ngoai_le?: boolean
          do_tin_cay: string
          hieu_luc_tu: string
          id?: never
          loai: string
          ma_cong_bao_nguon?: string | null
          so_hieu_dich: string
          so_hieu_nguon: string
          tao_luc?: string
          trich: string
        }
        Update: {
          co_ngoai_le?: boolean
          do_tin_cay?: string
          hieu_luc_tu?: string
          id?: never
          loai?: string
          ma_cong_bao_nguon?: string | null
          so_hieu_dich?: string
          so_hieu_nguon?: string
          tao_luc?: string
          trich?: string
        }
        Relationships: []
      }
      quy_trinh_ai: {
        Row: {
          company_id: string
          don_vi_ket_qua: string
          id: string
          khop_du_an: string[]
          sua_luc: string
          tao_boi: string | null
          tao_luc: string
          ten: string
        }
        Insert: {
          company_id: string
          don_vi_ket_qua?: string
          id?: string
          khop_du_an?: string[]
          sua_luc?: string
          tao_boi?: string | null
          tao_luc?: string
          ten: string
        }
        Update: {
          company_id?: string
          don_vi_ket_qua?: string
          id?: string
          khop_du_an?: string[]
          sua_luc?: string
          tao_boi?: string | null
          tao_luc?: string
          ten?: string
        }
        Relationships: [
          {
            foreignKeyName: "quy_trinh_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "quy_trinh_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_classification_events: {
        Row: {
          actor: string
          actor_role: string
          at: string
          bulk_group_id: string | null
          company_id: string
          from_effect: string | null
          from_type: string | null
          id: number
          la_hoan_tac: boolean
          to_effect: string | null
          to_type: string | null
          transaction_id: string
        }
        Insert: {
          actor: string
          actor_role: string
          at?: string
          bulk_group_id?: string | null
          company_id: string
          from_effect?: string | null
          from_type?: string | null
          id?: never
          la_hoan_tac?: boolean
          to_effect?: string | null
          to_type?: string | null
          transaction_id: string
        }
        Update: {
          actor?: string
          actor_role?: string
          at?: string
          bulk_group_id?: string | null
          company_id?: string
          from_effect?: string | null
          from_type?: string | null
          id?: never
          la_hoan_tac?: boolean
          to_effect?: string | null
          to_type?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_classification_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "revenue_classification_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_classification_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_classifications: {
        Row: {
          company_id: string
          confirmed_at: string
          confirmed_by: string
          confirmed_role: string
          confirmed_type: string
          created_at: string
          ghi_chu: string | null
          id: string
          reason_code: string | null
          reason_text: string | null
          requires_review: boolean
          revenue_effect: string
          suggested_type: string | null
          suggestion_source: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          confirmed_at?: string
          confirmed_by: string
          confirmed_role: string
          confirmed_type: string
          created_at?: string
          ghi_chu?: string | null
          id?: string
          reason_code?: string | null
          reason_text?: string | null
          requires_review?: boolean
          revenue_effect: string
          suggested_type?: string | null
          suggestion_source?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          confirmed_at?: string
          confirmed_by?: string
          confirmed_role?: string
          confirmed_type?: string
          created_at?: string
          ghi_chu?: string | null
          id?: string
          reason_code?: string | null
          reason_text?: string | null
          requires_review?: boolean
          revenue_effect?: string
          suggested_type?: string | null
          suggestion_source?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_classifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "revenue_classifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_classifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sao_ke_nhap: {
        Row: {
          company_id: string
          den_ngay: string | null
          id: string
          so_dong_doc: number
          so_dong_moi: number
          so_dong_trung: number
          tai_khoan: string
          tao_boi: string
          tao_luc: string
          ten_tep: string | null
          tu_ngay: string | null
        }
        Insert: {
          company_id: string
          den_ngay?: string | null
          id?: string
          so_dong_doc?: number
          so_dong_moi?: number
          so_dong_trung?: number
          tai_khoan: string
          tao_boi: string
          tao_luc?: string
          ten_tep?: string | null
          tu_ngay?: string | null
        }
        Update: {
          company_id?: string
          den_ngay?: string | null
          id?: string
          so_dong_doc?: number
          so_dong_moi?: number
          so_dong_trung?: number
          tai_khoan?: string
          tao_boi?: string
          tao_luc?: string
          ten_tep?: string | null
          tu_ngay?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sao_ke_nhap_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sao_ke_nhap_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      so_cai_chung_tu: {
        Row: {
          bam_chuoi: string
          bam_truoc: string
          ban_ghi_id: string
          company_id: string
          created_at: string
          id: number
          loai: string
          ma_bam: string
          neo_id: number | null
          thu_tu_la: number | null
        }
        Insert: {
          bam_chuoi: string
          bam_truoc: string
          ban_ghi_id: string
          company_id: string
          created_at?: string
          id?: never
          loai: string
          ma_bam: string
          neo_id?: number | null
          thu_tu_la?: number | null
        }
        Update: {
          bam_chuoi?: string
          bam_truoc?: string
          ban_ghi_id?: string
          company_id?: string
          created_at?: string
          id?: never
          loai?: string
          ma_bam?: string
          neo_id?: number | null
          thu_tu_la?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "so_cai_chung_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "so_cai_chung_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "so_cai_chung_tu_neo_id_fkey"
            columns: ["neo_id"]
            isOneToOne: false
            referencedRelation: "neo_thoi_gian"
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
          so_luot: number | null
          status: string
          tien_ve_id: string | null
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
          so_luot?: number | null
          status?: string
          tien_ve_id?: string | null
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
          so_luot?: number | null
          status?: string
          tien_ve_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
          {
            foreignKeyName: "subscription_invoices_tien_ve_id_fkey"
            columns: ["tien_ve_id"]
            isOneToOne: true
            referencedRelation: "tien_ve_mimi"
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
      tac_tu: {
        Row: {
          company_id: string
          created_at: string
          dung_lan_cuoi: string | null
          id: string
          khoa_bam: string
          khoa_hien: string
          mo_ta: string | null
          ten: string
          trang_thai: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dung_lan_cuoi?: string | null
          id?: string
          khoa_bam: string
          khoa_hien: string
          mo_ta?: string | null
          ten: string
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dung_lan_cuoi?: string | null
          id?: string
          khoa_bam?: string
          khoa_hien?: string
          mo_ta?: string | null
          ten?: string
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tac_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tac_tu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tai_lieu: {
        Row: {
          bang_chung: Json
          can_cu: Json
          cap_nhat_luc: string
          company_id: string
          do_day: string | null
          hanh_trinh_id: string | null
          ho_so_viec_id: string | null
          hoi_thoai_id: string | null
          id: string
          ky: string | null
          loai: string
          ma_mau_chinh_thuc: string | null
          mo_ta: string
          nguon: Json
          nhan: string
          phien_ban_hien_tai: number
          sinh_boi: string
          tao_boi: string | null
          tao_luc: string
          thu_tuc_ma: string | null
          tieu_de: string
          trang_thai: string
        }
        Insert: {
          bang_chung?: Json
          can_cu?: Json
          cap_nhat_luc?: string
          company_id: string
          do_day?: string | null
          hanh_trinh_id?: string | null
          ho_so_viec_id?: string | null
          hoi_thoai_id?: string | null
          id?: string
          ky?: string | null
          loai: string
          ma_mau_chinh_thuc?: string | null
          mo_ta?: string
          nguon?: Json
          nhan?: string
          phien_ban_hien_tai?: number
          sinh_boi?: string
          tao_boi?: string | null
          tao_luc?: string
          thu_tuc_ma?: string | null
          tieu_de: string
          trang_thai?: string
        }
        Update: {
          bang_chung?: Json
          can_cu?: Json
          cap_nhat_luc?: string
          company_id?: string
          do_day?: string | null
          hanh_trinh_id?: string | null
          ho_so_viec_id?: string | null
          hoi_thoai_id?: string | null
          id?: string
          ky?: string | null
          loai?: string
          ma_mau_chinh_thuc?: string | null
          mo_ta?: string
          nguon?: Json
          nhan?: string
          phien_ban_hien_tai?: number
          sinh_boi?: string
          tao_boi?: string | null
          tao_luc?: string
          thu_tuc_ma?: string | null
          tieu_de?: string
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "tai_lieu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tai_lieu_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tai_lieu_hanh_trinh_id_fkey"
            columns: ["hanh_trinh_id"]
            isOneToOne: false
            referencedRelation: "hanh_trinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tai_lieu_ho_so_viec_id_fkey"
            columns: ["ho_so_viec_id"]
            isOneToOne: false
            referencedRelation: "ho_so_viec"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tai_lieu_hoi_thoai_id_fkey"
            columns: ["hoi_thoai_id"]
            isOneToOne: false
            referencedRelation: "hoi_thoai_tro_ly"
            referencedColumns: ["id"]
          },
        ]
      }
      tai_nguyen: {
        Row: {
          anh_bia: string | null
          bat_dau: string | null
          dia_diem: string | null
          duong_dan_ngoai: string | null
          hinh_thuc: string | null
          id: string
          ket_thuc: string | null
          loai: string
          noi_dung: string
          slug: string
          sua_luc: string
          tac_gia: string | null
          tao_luc: string
          tieu_de: string
          tom_tat: string
          trang_thai: string
          xuat_ban_luc: string | null
        }
        Insert: {
          anh_bia?: string | null
          bat_dau?: string | null
          dia_diem?: string | null
          duong_dan_ngoai?: string | null
          hinh_thuc?: string | null
          id?: string
          ket_thuc?: string | null
          loai: string
          noi_dung?: string
          slug: string
          sua_luc?: string
          tac_gia?: string | null
          tao_luc?: string
          tieu_de: string
          tom_tat?: string
          trang_thai?: string
          xuat_ban_luc?: string | null
        }
        Update: {
          anh_bia?: string | null
          bat_dau?: string | null
          dia_diem?: string | null
          duong_dan_ngoai?: string | null
          hinh_thuc?: string | null
          id?: string
          ket_thuc?: string | null
          loai?: string
          noi_dung?: string
          slug?: string
          sua_luc?: string
          tac_gia?: string | null
          tao_luc?: string
          tieu_de?: string
          tom_tat?: string
          trang_thai?: string
          xuat_ban_luc?: string | null
        }
        Relationships: []
      }
      thanh_vien_cong_ty: {
        Row: {
          company_id: string
          moi_boi: string | null
          sua_luc: string
          tao_luc: string
          user_id: string
          vai_tro: string
        }
        Insert: {
          company_id: string
          moi_boi?: string | null
          sua_luc?: string
          tao_luc?: string
          user_id: string
          vai_tro: string
        }
        Update: {
          company_id?: string
          moi_boi?: string | null
          sua_luc?: string
          tao_luc?: string
          user_id?: string
          vai_tro?: string
        }
        Relationships: [
          {
            foreignKeyName: "thanh_vien_cong_ty_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "thanh_vien_cong_ty_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      thong_bao: {
        Row: {
          company_id: string
          da_day_luc: string | null
          da_doc_luc: string | null
          da_xu_ly_luc: string | null
          duong_dan: string | null
          hanh_dong: Json
          id: string
          khoa: string
          loai: string
          loi_thoi_luc: string | null
          muc_do: string
          noi_dung: string
          tao_luc: string
          tieu_de: string
          user_id: string
        }
        Insert: {
          company_id: string
          da_day_luc?: string | null
          da_doc_luc?: string | null
          da_xu_ly_luc?: string | null
          duong_dan?: string | null
          hanh_dong?: Json
          id?: string
          khoa: string
          loai: string
          loi_thoi_luc?: string | null
          muc_do?: string
          noi_dung: string
          tao_luc?: string
          tieu_de: string
          user_id: string
        }
        Update: {
          company_id?: string
          da_day_luc?: string | null
          da_doc_luc?: string | null
          da_xu_ly_luc?: string | null
          duong_dan?: string | null
          hanh_dong?: Json
          id?: string
          khoa?: string
          loai?: string
          loi_thoi_luc?: string | null
          muc_do?: string
          noi_dung?: string
          tao_luc?: string
          tieu_de?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thong_bao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "thong_bao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      thu_tuc_thue: {
        Row: {
          cach_thuc: string | null
          can_cu_phap_ly: string | null
          cap_thuc_hien: string | null
          co_quan: string | null
          dieu_kien: string | null
          doi_tuong: string | null
          ket_qua: string | null
          lay_luc: string
          ma: string
          mau_to_khai: string[]
          nguon: string
          ten: string
          thanh_phan_ho_so: string | null
          tim: unknown
          trinh_tu: string | null
        }
        Insert: {
          cach_thuc?: string | null
          can_cu_phap_ly?: string | null
          cap_thuc_hien?: string | null
          co_quan?: string | null
          dieu_kien?: string | null
          doi_tuong?: string | null
          ket_qua?: string | null
          lay_luc: string
          ma: string
          mau_to_khai?: string[]
          nguon: string
          ten: string
          thanh_phan_ho_so?: string | null
          tim?: unknown
          trinh_tu?: string | null
        }
        Update: {
          cach_thuc?: string | null
          can_cu_phap_ly?: string | null
          cap_thuc_hien?: string | null
          co_quan?: string | null
          dieu_kien?: string | null
          doi_tuong?: string | null
          ket_qua?: string | null
          lay_luc?: string
          ma?: string
          mau_to_khai?: string[]
          nguon?: string
          ten?: string
          thanh_phan_ho_so?: string | null
          tim?: unknown
          trinh_tu?: string | null
        }
        Relationships: []
      }
      tien_ve_mimi: {
        Row: {
          hoa_don_id: string | null
          id: string
          ma_giao_dich: string
          ngay_giao_dich: string
          nguon: string
          nhan_luc: string
          noi_dung: string | null
          so_tien: number
        }
        Insert: {
          hoa_don_id?: string | null
          id?: string
          ma_giao_dich: string
          ngay_giao_dich: string
          nguon?: string
          nhan_luc?: string
          noi_dung?: string | null
          so_tien: number
        }
        Update: {
          hoa_don_id?: string | null
          id?: string
          ma_giao_dich?: string
          ngay_giao_dich?: string
          nguon?: string
          nhan_luc?: string
          noi_dung?: string | null
          so_tien?: number
        }
        Relationships: [
          {
            foreignKeyName: "tien_ve_mimi_hoa_don_id_fkey"
            columns: ["hoa_don_id"]
            isOneToOne: true
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      to_khai_nhap: {
        Row: {
          cach_tra: string | null
          can_cu: Json
          company_id: string
          created_at: string
          da_xuat_luc: string | null
          du_lieu: Json
          han_nop: string
          id: string
          ky_loai: string
          ma_bam: string
          mau: string
          nam: number
          quy: number | null
          user_id: string
        }
        Insert: {
          cach_tra?: string | null
          can_cu: Json
          company_id: string
          created_at?: string
          da_xuat_luc?: string | null
          du_lieu: Json
          han_nop: string
          id?: string
          ky_loai: string
          ma_bam: string
          mau: string
          nam: number
          quy?: number | null
          user_id: string
        }
        Update: {
          cach_tra?: string | null
          can_cu?: Json
          company_id?: string
          created_at?: string
          da_xuat_luc?: string | null
          du_lieu?: Json
          han_nop?: string
          id?: string
          ky_loai?: string
          ma_bam?: string
          mau?: string
          nam?: number
          quy?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "to_khai_nhap_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "to_khai_nhap_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      token_ai: {
        Row: {
          company_id: string
          created_at: string
          id: number
          model: string
          ngay: string
          nha_cung_cap: string
          so_lan_goi: number
          token_ra: number
          token_vao: number
          token_vao_cache: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: never
          model?: string
          ngay: string
          nha_cung_cap: string
          so_lan_goi?: number
          token_ra?: number
          token_vao?: number
          token_vao_cache?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: never
          model?: string
          ngay?: string
          nha_cung_cap?: string
          so_lan_goi?: number
          token_ra?: number
          token_vao?: number
          token_vao_cache?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "token_ai_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
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
          import_id: string | null
          is_synthetic: boolean
          merchant_name: string | null
          payment_reference: string | null
          reference_id: string | null
          source: string | null
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
          import_id?: string | null
          is_synthetic?: boolean
          merchant_name?: string | null
          payment_reference?: string | null
          reference_id?: string | null
          source?: string | null
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
          import_id?: string | null
          is_synthetic?: boolean
          merchant_name?: string | null
          payment_reference?: string | null
          reference_id?: string | null
          source?: string | null
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
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "sao_ke_nhap"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_pho_bien: {
        Row: {
          so_doan: number
          tu: string
        }
        Insert: {
          so_doan: number
          tu: string
        }
        Update: {
          so_doan?: number
          tu?: string
        }
        Relationships: []
      }
      van_ban_phap_luat: {
        Row: {
          co_quan: string | null
          loai: string | null
          ma_cong_bao: string
          nap_luc: string
          ngay_ban_hanh: string | null
          ngay_hieu_luc: string | null
          nguoi_ky: string | null
          nguon_toan_van: string | null
          so_doan: number
          so_hieu: string | null
          ten: string
          trich_yeu: string | null
          url: string
        }
        Insert: {
          co_quan?: string | null
          loai?: string | null
          ma_cong_bao: string
          nap_luc?: string
          ngay_ban_hanh?: string | null
          ngay_hieu_luc?: string | null
          nguoi_ky?: string | null
          nguon_toan_van?: string | null
          so_doan?: number
          so_hieu?: string | null
          ten: string
          trich_yeu?: string | null
          url: string
        }
        Update: {
          co_quan?: string | null
          loai?: string | null
          ma_cong_bao?: string
          nap_luc?: string
          ngay_ban_hanh?: string | null
          ngay_hieu_luc?: string | null
          nguoi_ky?: string | null
          nguon_toan_van?: string | null
          so_doan?: number
          so_hieu?: string | null
          ten?: string
          trich_yeu?: string | null
          url?: string
        }
        Relationships: []
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
          company_id: string | null
          duration_ms: number | null
          environment: string | null
          event_code: string | null
          event_type: string | null
          grant_id: string | null
          handler: string | null
          id: string
          khoa_khop: string | null
          lan_nhan: number
          note: string | null
          outcome: string | null
          payload: Json
          payload_hash: string | null
          processed_at: string | null
          provider: string
          received_at: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          company_id?: string | null
          duration_ms?: number | null
          environment?: string | null
          event_code?: string | null
          event_type?: string | null
          grant_id?: string | null
          handler?: string | null
          id?: string
          khoa_khop?: string | null
          lan_nhan?: number
          note?: string | null
          outcome?: string | null
          payload: Json
          payload_hash?: string | null
          processed_at?: string | null
          provider: string
          received_at?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          company_id?: string | null
          duration_ms?: number | null
          environment?: string | null
          event_code?: string | null
          event_type?: string | null
          grant_id?: string | null
          handler?: string | null
          id?: string
          khoa_khop?: string | null
          lan_nhan?: number
          note?: string | null
          outcome?: string | null
          payload?: Json
          payload_hash?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      xung_dot_hoa_don: {
        Row: {
          company_id: string
          da_xu_ly_luc: string | null
          goi_y: string | null
          hoa_don_id: string | null
          id: string
          kiem_luc: string
          ma_ngoai: string | null
          nguon: string
          trang_thai_ngoai: string
          trang_thai_trong: string
        }
        Insert: {
          company_id: string
          da_xu_ly_luc?: string | null
          goi_y?: string | null
          hoa_don_id?: string | null
          id?: string
          kiem_luc?: string
          ma_ngoai?: string | null
          nguon: string
          trang_thai_ngoai: string
          trang_thai_trong: string
        }
        Update: {
          company_id?: string
          da_xu_ly_luc?: string | null
          goi_y?: string | null
          hoa_don_id?: string | null
          id?: string
          kiem_luc?: string
          ma_ngoai?: string | null
          nguon?: string
          trang_thai_ngoai?: string
          trang_thai_trong?: string
        }
        Relationships: [
          {
            foreignKeyName: "xung_dot_hoa_don_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "xung_dot_hoa_don_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xung_dot_hoa_don_hoa_don_id_fkey"
            columns: ["hoa_don_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      yeu_cau_chi: {
        Row: {
          cach_quyet: string | null
          company_id: string
          created_at: string
          da_chi_luc: string | null
          giao_dich_id: string | null
          het_han_luc: string | null
          id: string
          ly_do: Json
          ma_tham_chieu: string
          ma_yeu_cau: string | null
          muc_dich: string
          ngan_hang_bin: string
          nguoi_quyet: string | null
          nhom_chi: string
          quyet_luc: string | null
          so_hoa_don: string | null
          so_tai_khoan: string
          so_tien: number
          so_tien_thuc_chi: number | null
          tac_tu_id: string
          ten_nguoi_nhan: string | null
          trang_thai: string
          updated_at: string
        }
        Insert: {
          cach_quyet?: string | null
          company_id: string
          created_at?: string
          da_chi_luc?: string | null
          giao_dich_id?: string | null
          het_han_luc?: string | null
          id?: string
          ly_do?: Json
          ma_tham_chieu: string
          ma_yeu_cau?: string | null
          muc_dich: string
          ngan_hang_bin: string
          nguoi_quyet?: string | null
          nhom_chi: string
          quyet_luc?: string | null
          so_hoa_don?: string | null
          so_tai_khoan: string
          so_tien: number
          so_tien_thuc_chi?: number | null
          tac_tu_id: string
          ten_nguoi_nhan?: string | null
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          cach_quyet?: string | null
          company_id?: string
          created_at?: string
          da_chi_luc?: string | null
          giao_dich_id?: string | null
          het_han_luc?: string | null
          id?: string
          ly_do?: Json
          ma_tham_chieu?: string
          ma_yeu_cau?: string | null
          muc_dich?: string
          ngan_hang_bin?: string
          nguoi_quyet?: string | null
          nhom_chi?: string
          quyet_luc?: string | null
          so_hoa_don?: string | null
          so_tai_khoan?: string
          so_tien?: number
          so_tien_thuc_chi?: number | null
          tac_tu_id?: string
          ten_nguoi_nhan?: string | null
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yeu_cau_chi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "yeu_cau_chi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yeu_cau_chi_tac_tu_id_fkey"
            columns: ["tac_tu_id"]
            isOneToOne: false
            referencedRelation: "tac_tu"
            referencedColumns: ["id"]
          },
        ]
      }
      yeu_cau_thuc_thi: {
        Row: {
          bien_nhan_tai_lieu_id: string | null
          cap_nhat_luc: string
          company_id: string
          gui_luc: string | null
          han: string | null
          hanh_trinh_id: string | null
          ho_so_viec_id: string | null
          id: string
          ket_qua_co_quan: string | null
          khoa_chong_trung: string
          kiem_luc: string | null
          ky: string | null
          lan_thu_cuoi: string | null
          loai: string
          loi_an_toan: string | null
          loi_kiem: string[]
          ma_bam_du_lieu: string | null
          ma_bam_noi_dung: string | null
          ma_loi: string | null
          nang_luc: string
          ngay_nop: string | null
          nguon_ket_qua: string | null
          nguon_tham_chieu: string | null
          nha_cung_cap: string
          phien_ban: number | null
          so_lan_thu: number
          tai_lieu_id: string | null
          tao_luc: string
          tham_chieu_co_quan: string | null
          tham_chieu_ngoai: string | null
          trang_thai: string
          trang_thai_co_quan: string | null
          trang_thai_nha_cung_cap: string | null
          xac_nhan_boi: string | null
          xac_nhan_luc: string | null
          xac_nhan_ma_bam: string | null
          xac_nhan_phien_ban: number | null
          xem_truoc: Json
          xong_luc: string | null
          yeu_cau_boi: string | null
        }
        Insert: {
          bien_nhan_tai_lieu_id?: string | null
          cap_nhat_luc?: string
          company_id: string
          gui_luc?: string | null
          han?: string | null
          hanh_trinh_id?: string | null
          ho_so_viec_id?: string | null
          id?: string
          ket_qua_co_quan?: string | null
          khoa_chong_trung: string
          kiem_luc?: string | null
          ky?: string | null
          lan_thu_cuoi?: string | null
          loai: string
          loi_an_toan?: string | null
          loi_kiem?: string[]
          ma_bam_du_lieu?: string | null
          ma_bam_noi_dung?: string | null
          ma_loi?: string | null
          nang_luc: string
          ngay_nop?: string | null
          nguon_ket_qua?: string | null
          nguon_tham_chieu?: string | null
          nha_cung_cap: string
          phien_ban?: number | null
          so_lan_thu?: number
          tai_lieu_id?: string | null
          tao_luc?: string
          tham_chieu_co_quan?: string | null
          tham_chieu_ngoai?: string | null
          trang_thai?: string
          trang_thai_co_quan?: string | null
          trang_thai_nha_cung_cap?: string | null
          xac_nhan_boi?: string | null
          xac_nhan_luc?: string | null
          xac_nhan_ma_bam?: string | null
          xac_nhan_phien_ban?: number | null
          xem_truoc?: Json
          xong_luc?: string | null
          yeu_cau_boi?: string | null
        }
        Update: {
          bien_nhan_tai_lieu_id?: string | null
          cap_nhat_luc?: string
          company_id?: string
          gui_luc?: string | null
          han?: string | null
          hanh_trinh_id?: string | null
          ho_so_viec_id?: string | null
          id?: string
          ket_qua_co_quan?: string | null
          khoa_chong_trung?: string
          kiem_luc?: string | null
          ky?: string | null
          lan_thu_cuoi?: string | null
          loai?: string
          loi_an_toan?: string | null
          loi_kiem?: string[]
          ma_bam_du_lieu?: string | null
          ma_bam_noi_dung?: string | null
          ma_loi?: string | null
          nang_luc?: string
          ngay_nop?: string | null
          nguon_ket_qua?: string | null
          nguon_tham_chieu?: string | null
          nha_cung_cap?: string
          phien_ban?: number | null
          so_lan_thu?: number
          tai_lieu_id?: string | null
          tao_luc?: string
          tham_chieu_co_quan?: string | null
          tham_chieu_ngoai?: string | null
          trang_thai?: string
          trang_thai_co_quan?: string | null
          trang_thai_nha_cung_cap?: string | null
          xac_nhan_boi?: string | null
          xac_nhan_luc?: string | null
          xac_nhan_ma_bam?: string | null
          xac_nhan_phien_ban?: number | null
          xem_truoc?: Json
          xong_luc?: string | null
          yeu_cau_boi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yeu_cau_thuc_thi_bien_nhan_tai_lieu_id_fkey"
            columns: ["bien_nhan_tai_lieu_id"]
            isOneToOne: false
            referencedRelation: "tai_lieu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yeu_cau_thuc_thi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chi_so_pilot"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "yeu_cau_thuc_thi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yeu_cau_thuc_thi_hanh_trinh_id_fkey"
            columns: ["hanh_trinh_id"]
            isOneToOne: false
            referencedRelation: "hanh_trinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yeu_cau_thuc_thi_ho_so_viec_id_fkey"
            columns: ["ho_so_viec_id"]
            isOneToOne: false
            referencedRelation: "ho_so_viec"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yeu_cau_thuc_thi_tai_lieu_id_fkey"
            columns: ["tai_lieu_id"]
            isOneToOne: false
            referencedRelation: "tai_lieu"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      chi_so_pilot: {
        Row: {
          company_id: string | null
          da_giai_thich: number | null
          phan_tram_da_giai_thich: number | null
          so_khoan_vao: number | null
          tong_vao: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      chay_doi_soat_thue_bao: { Args: never; Returns: undefined }
      chay_quet_thong_bao: { Args: never; Returns: undefined }
      chuan_truong: { Args: { t: string }; Returns: string }
      current_role: { Args: never; Returns: string }
      danh_dau_thong_bao: {
        Args: { p_da_xu_ly?: boolean; p_ids: string[] }
        Returns: number
      }
      dem_lan_nhan_webhook: {
        Args: { p_hash: string; p_provider: string }
        Returns: undefined
      }
      don_hoi_thoai_cu: { Args: { so_ngay?: number }; Returns: number }
      gan_neo_so_cai: {
        Args: { p_ids: number[]; p_neo: number }
        Returns: number
      }
      ghi_so_cai: {
        Args: {
          p_company: string
          p_id: string
          p_loai: string
          p_noi_dung: string
        }
        Returns: undefined
      }
      goi_dau_thoi_gian: { Args: { p_hanh_dong: string }; Returns: undefined }
      kiem_so_cai: {
        Args: { p_company: string }
        Returns: {
          so_chung_tu: number
          so_chung_tu_lech: number
          so_mat_xich: number
          so_mat_xich_hong: number
        }[]
      }
      la_thanh_vien: { Args: { p_company: string }; Returns: boolean }
      lam_moi_tu_pho_bien: { Args: never; Returns: number }
      nap_du_lieu_minh_hoa: { Args: { p_company: string }; Returns: number }
      ngau_nhien_minh_hoa: { Args: { p_khoa: string }; Returns: number }
      noi_dung_chuan_chung_tu: {
        Args: { c: Database["public"]["Tables"]["chung_tu_quet"]["Row"] }
        Returns: string
      }
      noi_dung_chuan_hoa_don: {
        Args: { g: Database["public"]["Tables"]["gdt_invoices"]["Row"] }
        Returns: string
      }
      so_luot_goi: {
        Args: { p_cua_so_giay: number; p_hanh_dong: string; p_user: string }
        Returns: number
      }
      tang_luot_goi: {
        Args: {
          p_cua_so_giay: number
          p_hanh_dong: string
          p_toi_da: number
          p_user: string
        }
        Returns: boolean
      }
      tim_phap_luat: {
        Args: { cau_hoi: string; so_ket_qua?: number }
        Returns: {
          diem: number
          du_moi_tu: boolean
          loai: string
          ma_cong_bao: string
          ngay_ban_hanh: string
          ngay_hieu_luc: string
          nhan: string
          noi_dung: string
          so_hieu: string
          ten: string
          url: string
        }[]
      }
      tru_luot_to_khai: {
        Args: { p_company: string; p_ky_khoa: string; p_to_khai_nhap: string }
        Returns: string
      }
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
  public: {
    Enums: {},
  },
} as const
