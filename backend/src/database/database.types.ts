export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      actors: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json | null;
          name: string;
          type: string;
          wallet_address: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          name: string;
          type: string;
          wallet_address?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          name?: string;
          type?: string;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      execution_events: {
        Row: {
          actor_id: string;
          actor_type: string;
          chain_confirmed: boolean | null;
          chain_tx_id: string | null;
          correlation_id: string;
          created_at: string;
          event_type: string;
          id: string;
          payload: Json;
          target_id: string;
          target_type: string;
        };
        Insert: {
          actor_id: string;
          actor_type: string;
          chain_confirmed?: boolean | null;
          chain_tx_id?: string | null;
          correlation_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          payload: Json;
          target_id: string;
          target_type: string;
        };
        Update: {
          actor_id?: string;
          actor_type?: string;
          chain_confirmed?: boolean | null;
          chain_tx_id?: string | null;
          correlation_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [];
      };
      kyb_documents: {
        Row: {
          category: Database['public']['Enums']['kyb_document_category'];
          file_name: string;
          id: string;
          mime_type: string;
          storage_path: string;
          submission_id: string;
          ubo_id: string | null;
          uploaded_at: string;
        };
        Insert: {
          category: Database['public']['Enums']['kyb_document_category'];
          file_name: string;
          id?: string;
          mime_type: string;
          storage_path: string;
          submission_id: string;
          ubo_id?: string | null;
          uploaded_at?: string;
        };
        Update: {
          category?: Database['public']['Enums']['kyb_document_category'];
          file_name?: string;
          id?: string;
          mime_type?: string;
          storage_path?: string;
          submission_id?: string;
          ubo_id?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kyb_documents_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'kyb_submissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kyb_documents_ubo_id_fkey';
            columns: ['ubo_id'];
            isOneToOne: false;
            referencedRelation: 'kyb_ubos';
            referencedColumns: ['id'];
          },
        ];
      };
      kyb_submissions: {
        Row: {
          accuracy_declaration: boolean | null;
          adverse_media_declaration: boolean | null;
          attestation_expires_at: string | null;
          attestation_pda: string | null;
          attestation_tx: string | null;
          authorized_signatory_declaration: boolean | null;
          business_activity: string | null;
          created_at: string;
          date_of_incorporation: string | null;
          edd_notes: string | null;
          edd_required: boolean;
          entity_type: string | null;
          funding_route_declaration: string | null;
          has_pep: boolean | null;
          has_rca: boolean | null;
          id: string;
          is_regulated: boolean | null;
          jurisdiction: string | null;
          legal_name: string | null;
          license_number: string | null;
          ongoing_reporting_declaration: boolean | null;
          ownership_structure_description: string | null;
          pep_details: string | null;
          rca_details: string | null;
          registered_address: string | null;
          registration_number: string | null;
          regulator_name: string | null;
          rejection_reason: string | null;
          resubmission_items: string[] | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewer_notes: string | null;
          risk_band: string | null;
          risk_score: number | null;
          sanctions_declaration: boolean | null;
          source_of_funds: string | null;
          source_of_wealth: string | null;
          status: Database['public']['Enums']['kyb_status'];
          step_completed: number;
          trading_name: string | null;
          updated_at: string;
          user_id: string;
          website: string | null;
        };
        Insert: {
          accuracy_declaration?: boolean | null;
          adverse_media_declaration?: boolean | null;
          attestation_expires_at?: string | null;
          attestation_pda?: string | null;
          attestation_tx?: string | null;
          authorized_signatory_declaration?: boolean | null;
          business_activity?: string | null;
          created_at?: string;
          date_of_incorporation?: string | null;
          edd_notes?: string | null;
          edd_required?: boolean;
          entity_type?: string | null;
          funding_route_declaration?: string | null;
          has_pep?: boolean | null;
          has_rca?: boolean | null;
          id?: string;
          is_regulated?: boolean | null;
          jurisdiction?: string | null;
          legal_name?: string | null;
          license_number?: string | null;
          ongoing_reporting_declaration?: boolean | null;
          ownership_structure_description?: string | null;
          pep_details?: string | null;
          rca_details?: string | null;
          registered_address?: string | null;
          registration_number?: string | null;
          regulator_name?: string | null;
          rejection_reason?: string | null;
          resubmission_items?: string[] | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          risk_band?: string | null;
          risk_score?: number | null;
          sanctions_declaration?: boolean | null;
          source_of_funds?: string | null;
          source_of_wealth?: string | null;
          status?: Database['public']['Enums']['kyb_status'];
          step_completed?: number;
          trading_name?: string | null;
          updated_at?: string;
          user_id: string;
          website?: string | null;
        };
        Update: {
          accuracy_declaration?: boolean | null;
          adverse_media_declaration?: boolean | null;
          attestation_expires_at?: string | null;
          attestation_pda?: string | null;
          attestation_tx?: string | null;
          authorized_signatory_declaration?: boolean | null;
          business_activity?: string | null;
          created_at?: string;
          date_of_incorporation?: string | null;
          edd_notes?: string | null;
          edd_required?: boolean;
          entity_type?: string | null;
          funding_route_declaration?: string | null;
          has_pep?: boolean | null;
          has_rca?: boolean | null;
          id?: string;
          is_regulated?: boolean | null;
          jurisdiction?: string | null;
          legal_name?: string | null;
          license_number?: string | null;
          ongoing_reporting_declaration?: boolean | null;
          ownership_structure_description?: string | null;
          pep_details?: string | null;
          rca_details?: string | null;
          registered_address?: string | null;
          registration_number?: string | null;
          regulator_name?: string | null;
          rejection_reason?: string | null;
          resubmission_items?: string[] | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          risk_band?: string | null;
          risk_score?: number | null;
          sanctions_declaration?: boolean | null;
          source_of_funds?: string | null;
          source_of_wealth?: string | null;
          status?: Database['public']['Enums']['kyb_status'];
          step_completed?: number;
          trading_name?: string | null;
          updated_at?: string;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'kyb_submissions_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kyb_submissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      kyb_ubos: {
        Row: {
          country_of_residence: string;
          created_at: string;
          date_of_birth: string;
          full_name: string;
          id: string;
          is_pep: boolean;
          nationality: string;
          ownership_percentage: number | null;
          pep_details: string | null;
          role: string;
          source_of_wealth: string;
          submission_id: string;
          updated_at: string;
        };
        Insert: {
          country_of_residence: string;
          created_at?: string;
          date_of_birth: string;
          full_name: string;
          id?: string;
          is_pep?: boolean;
          nationality: string;
          ownership_percentage?: number | null;
          pep_details?: string | null;
          role: string;
          source_of_wealth: string;
          submission_id: string;
          updated_at?: string;
        };
        Update: {
          country_of_residence?: string;
          created_at?: string;
          date_of_birth?: string;
          full_name?: string;
          id?: string;
          is_pep?: boolean;
          nationality?: string;
          ownership_percentage?: number | null;
          pep_details?: string | null;
          role?: string;
          source_of_wealth?: string;
          submission_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kyb_ubos_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'kyb_submissions';
            referencedColumns: ['id'];
          },
        ];
      };
      kyb_wallet_declarations: {
        Row: {
          declared_at: string;
          id: string;
          source_description: string;
          submission_id: string;
          wallet_address: string;
          wallet_label: string;
        };
        Insert: {
          declared_at?: string;
          id?: string;
          source_description: string;
          submission_id: string;
          wallet_address: string;
          wallet_label: string;
        };
        Update: {
          declared_at?: string;
          id?: string;
          source_description?: string;
          submission_id?: string;
          wallet_address?: string;
          wallet_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kyb_wallet_declarations_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'kyb_submissions';
            referencedColumns: ['id'];
          },
        ];
      };
      managers: {
        Row: {
          actor_id: string | null;
          company_name: string;
          created_at: string;
          id: string;
          logo_path: string | null;
          overview: string | null;
          owner_address: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          actor_id?: string | null;
          company_name: string;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          overview?: string | null;
          owner_address: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          actor_id?: string | null;
          company_name?: string;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          overview?: string | null;
          owner_address?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'managers_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'actors';
            referencedColumns: ['id'];
          },
        ];
      };
      nav_price_history: {
        Row: {
          chain_tx_id: string;
          created_at: string;
          id: string;
          pool_id: string;
          price: number;
          recorded_at: string;
        };
        Insert: {
          chain_tx_id: string;
          created_at?: string;
          id?: string;
          pool_id: string;
          price: number;
          recorded_at: string;
        };
        Update: {
          chain_tx_id?: string;
          created_at?: string;
          id?: string;
          pool_id?: string;
          price?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'nav_price_history_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      nota_fiscal_items: {
        Row: {
          cedente: string;
          created_at: string;
          data_emissao: string;
          data_vencimento: string;
          external_id: string | null;
          id: string;
          payment_schedule: Json | null;
          pipeline_key: string;
          pool_id: string;
          sacado: string;
          status: string;
          taxa_desconto: number | null;
          updated_at: string;
          valor_aquisicao: number;
          valor_nominal: number;
          valor_pago: number | null;
        };
        Insert: {
          cedente: string;
          created_at?: string;
          data_emissao: string;
          data_vencimento: string;
          external_id?: string | null;
          id?: string;
          payment_schedule?: Json | null;
          pipeline_key: string;
          pool_id: string;
          sacado: string;
          status?: string;
          taxa_desconto?: number | null;
          updated_at?: string;
          valor_aquisicao: number;
          valor_nominal: number;
          valor_pago?: number | null;
        };
        Update: {
          cedente?: string;
          created_at?: string;
          data_emissao?: string;
          data_vencimento?: string;
          external_id?: string | null;
          id?: string;
          payment_schedule?: Json | null;
          pipeline_key?: string;
          pool_id?: string;
          sacado?: string;
          status?: string;
          taxa_desconto?: number | null;
          updated_at?: string;
          valor_aquisicao?: number;
          valor_nominal?: number;
          valor_pago?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'nota_fiscal_items_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      otps: {
        Row: {
          code: number;
          created_at: string;
          email: string;
          id: string;
          updated_at: string;
          verified: boolean | null;
        };
        Insert: {
          code: number;
          created_at?: string;
          email: string;
          id?: string;
          updated_at?: string;
          verified?: boolean | null;
        };
        Update: {
          code?: number;
          created_at?: string;
          email?: string;
          id?: string;
          updated_at?: string;
          verified?: boolean | null;
        };
        Relationships: [];
      };
      pool_investment_windows: {
        Row: {
          approved_count: number | null;
          closed_at: string | null;
          id: string;
          opened_at: string;
          pool_id: string;
          rejected_count: number | null;
          request_count: number | null;
          total_approved: number | null;
          total_rejected: number | null;
          total_requested: number | null;
          window_number: number;
        };
        Insert: {
          approved_count?: number | null;
          closed_at?: string | null;
          id?: string;
          opened_at: string;
          pool_id: string;
          rejected_count?: number | null;
          request_count?: number | null;
          total_approved?: number | null;
          total_rejected?: number | null;
          total_requested?: number | null;
          window_number: number;
        };
        Update: {
          approved_count?: number | null;
          closed_at?: string | null;
          id?: string;
          opened_at?: string;
          pool_id?: string;
          rejected_count?: number | null;
          request_count?: number | null;
          total_approved?: number | null;
          total_rejected?: number | null;
          total_requested?: number | null;
          window_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pool_investment_windows_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      pool_responsibilities: {
        Row: {
          actor_id: string;
          assigned_at: string;
          assigned_by: string;
          id: string;
          pool_id: string;
          revocation_reason: string | null;
          revoked_at: string | null;
          role: string;
        };
        Insert: {
          actor_id: string;
          assigned_at?: string;
          assigned_by: string;
          id?: string;
          pool_id: string;
          revocation_reason?: string | null;
          revoked_at?: string | null;
          role: string;
        };
        Update: {
          actor_id?: string;
          assigned_at?: string;
          assigned_by?: string;
          id?: string;
          pool_id?: string;
          revocation_reason?: string | null;
          revoked_at?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pool_responsibilities_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'actors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pool_responsibilities_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      pools: {
        Row: {
          approved_at: string | null;
          asset_class: string;
          asset_class_detail: string | null;
          asset_mint: string | null;
          attester_address: string | null;
          authority_address: string | null;
          created_at: string;
          currency: string;
          currency_description: string | null;
          deployed_at: string | null;
          description: string | null;
          documents: Json | null;
          eligibility_other: string[] | null;
          fund_cnpj_display: string | null;
          fund_id: string | null;
          fund_size: number | null;
          funded_at: string | null;
          hedge_cost_bps: number | null;
          hedge_counterparty: string | null;
          hedge_coverage: number | null;
          hedge_description: string | null;
          hedge_mechanism: string | null;
          hedge_roll_frequency: string | null;
          id: string;
          investment_horizon_unit: string | null;
          investment_horizon_value: number | null;
          investment_window_open: boolean | null;
          is_visible: boolean;
          lockup_period_days: number | null;
          logo_path: string | null;
          management_fee_rate: number | null;
          management_fee_unit: string | null;
          manager_address: string | null;
          manager_id: string | null;
          manager_name: string | null;
          matured_at: string | null;
          max_concentration_per_debtor: number | null;
          min_rating: string | null;
          minimum_investment: number | null;
          nav_oracle_address: string | null;
          price_per_share: number | null;
          on_chain_address: string | null;
          payment_waterfall: Json | null;
          pipeline_key: string | null;
          pool_type: string;
          redemption_format: string | null;
          redemption_notice_days: number | null;
          registrar: string | null;
          registrar_detail: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          share_class: string;
          share_class_description: string | null;
          start_time: string | null;
          status: string;
          submitted_at: string | null;
          subordination_description: string | null;
          subordination_level: number | null;
          target_raise_amount: number | null;
          target_return_description: string | null;
          target_return_net_of_fees: boolean | null;
          target_return_rate: number | null;
          target_return_unit: string | null;
          title: string;
          updated_at: string;
          vault_id: number | null;
          version: number | null;
        };
        Insert: {
          approved_at?: string | null;
          asset_class: string;
          asset_class_detail?: string | null;
          asset_mint?: string | null;
          attester_address?: string | null;
          authority_address?: string | null;
          created_at?: string;
          currency?: string;
          currency_description?: string | null;
          deployed_at?: string | null;
          description?: string | null;
          documents?: Json | null;
          eligibility_other?: string[] | null;
          fund_cnpj_display?: string | null;
          fund_id?: string | null;
          fund_size?: number | null;
          funded_at?: string | null;
          hedge_cost_bps?: number | null;
          hedge_counterparty?: string | null;
          hedge_coverage?: number | null;
          hedge_description?: string | null;
          hedge_mechanism?: string | null;
          hedge_roll_frequency?: string | null;
          id?: string;
          investment_horizon_unit?: string | null;
          investment_horizon_value?: number | null;
          investment_window_open?: boolean | null;
          is_visible?: boolean;
          lockup_period_days?: number | null;
          logo_path?: string | null;
          management_fee_rate?: number | null;
          management_fee_unit?: string | null;
          manager_address?: string | null;
          manager_id?: string | null;
          manager_name?: string | null;
          matured_at?: string | null;
          max_concentration_per_debtor?: number | null;
          min_rating?: string | null;
          minimum_investment?: number | null;
          nav_oracle_address?: string | null;
          price_per_share?: number | null;
          on_chain_address?: string | null;
          payment_waterfall?: Json | null;
          pipeline_key?: string | null;
          pool_type?: string;
          redemption_format?: string | null;
          redemption_notice_days?: number | null;
          registrar?: string | null;
          registrar_detail?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          share_class?: string;
          share_class_description?: string | null;
          start_time?: string | null;
          status?: string;
          submitted_at?: string | null;
          subordination_description?: string | null;
          subordination_level?: number | null;
          target_raise_amount?: number | null;
          target_return_description?: string | null;
          target_return_net_of_fees?: boolean | null;
          target_return_rate?: number | null;
          target_return_unit?: string | null;
          title: string;
          updated_at?: string;
          vault_id?: number | null;
          version?: number | null;
        };
        Update: {
          approved_at?: string | null;
          asset_class?: string;
          asset_class_detail?: string | null;
          asset_mint?: string | null;
          attester_address?: string | null;
          authority_address?: string | null;
          created_at?: string;
          currency?: string;
          currency_description?: string | null;
          deployed_at?: string | null;
          description?: string | null;
          documents?: Json | null;
          eligibility_other?: string[] | null;
          fund_cnpj_display?: string | null;
          fund_id?: string | null;
          fund_size?: number | null;
          funded_at?: string | null;
          hedge_cost_bps?: number | null;
          hedge_counterparty?: string | null;
          hedge_coverage?: number | null;
          hedge_description?: string | null;
          hedge_mechanism?: string | null;
          hedge_roll_frequency?: string | null;
          id?: string;
          investment_horizon_unit?: string | null;
          investment_horizon_value?: number | null;
          investment_window_open?: boolean | null;
          is_visible?: boolean;
          lockup_period_days?: number | null;
          logo_path?: string | null;
          management_fee_rate?: number | null;
          management_fee_unit?: string | null;
          manager_address?: string | null;
          manager_id?: string | null;
          manager_name?: string | null;
          matured_at?: string | null;
          max_concentration_per_debtor?: number | null;
          min_rating?: string | null;
          minimum_investment?: number | null;
          nav_oracle_address?: string | null;
          price_per_share?: number | null;
          on_chain_address?: string | null;
          payment_waterfall?: Json | null;
          pipeline_key?: string | null;
          pool_type?: string;
          redemption_format?: string | null;
          redemption_notice_days?: number | null;
          registrar?: string | null;
          registrar_detail?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          share_class?: string;
          share_class_description?: string | null;
          start_time?: string | null;
          status?: string;
          submitted_at?: string | null;
          subordination_description?: string | null;
          subordination_level?: number | null;
          target_raise_amount?: number | null;
          target_return_description?: string | null;
          target_return_net_of_fees?: boolean | null;
          target_return_rate?: number | null;
          target_return_unit?: string | null;
          title?: string;
          updated_at?: string;
          vault_id?: number | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pools_manager_id_fkey';
            columns: ['manager_id'];
            isOneToOne: false;
            referencedRelation: 'actors';
            referencedColumns: ['id'];
          },
        ];
      };
      risk_fidc_monthly: {
        Row: {
          cedente_top1_pct: number | null;
          cnpj_fundo: string;
          created_at: string | null;
          default_stock_ratio: number | null;
          id: string;
          inad_early_ratio: number | null;
          inad_mid_ratio: number | null;
          inad_severe_ratio: number | null;
          inad_total_ratio: number | null;
          leverage_ratio: number | null;
          liquidity_ratio: number | null;
          pdd_ratio: number | null;
          pipeline_key: string;
          recompra_ratio: number | null;
          reference_month: string;
          scr_share_ig: number | null;
          senior_return_mes: number | null;
          subordination_ratio: number | null;
          vl_ativo: number | null;
          vl_carteira: number | null;
          vl_disp: number | null;
          wal_years: number | null;
        };
        Insert: {
          cedente_top1_pct?: number | null;
          cnpj_fundo: string;
          created_at?: string | null;
          default_stock_ratio?: number | null;
          id?: string;
          inad_early_ratio?: number | null;
          inad_mid_ratio?: number | null;
          inad_severe_ratio?: number | null;
          inad_total_ratio?: number | null;
          leverage_ratio?: number | null;
          liquidity_ratio?: number | null;
          pdd_ratio?: number | null;
          pipeline_key: string;
          recompra_ratio?: number | null;
          reference_month: string;
          scr_share_ig?: number | null;
          senior_return_mes?: number | null;
          subordination_ratio?: number | null;
          vl_ativo?: number | null;
          vl_carteira?: number | null;
          vl_disp?: number | null;
          wal_years?: number | null;
        };
        Update: {
          cedente_top1_pct?: number | null;
          cnpj_fundo?: string;
          created_at?: string | null;
          default_stock_ratio?: number | null;
          id?: string;
          inad_early_ratio?: number | null;
          inad_mid_ratio?: number | null;
          inad_severe_ratio?: number | null;
          inad_total_ratio?: number | null;
          leverage_ratio?: number | null;
          liquidity_ratio?: number | null;
          pdd_ratio?: number | null;
          pipeline_key?: string;
          recompra_ratio?: number | null;
          reference_month?: string;
          scr_share_ig?: number | null;
          senior_return_mes?: number | null;
          subordination_ratio?: number | null;
          vl_ativo?: number | null;
          vl_carteira?: number | null;
          vl_disp?: number | null;
          wal_years?: number | null;
        };
        Relationships: [];
      };
      risk_fidc_scores: {
        Row: {
          alerta_deterioracao: boolean | null;
          cluster_id: number | null;
          cluster_risk_label: string | null;
          cnpj_fundo: string;
          confidence_label: string;
          confidence_tier: number;
          created_at: string | null;
          default_stock_ratio: number | null;
          delta_pdd: number | null;
          f1: number | null;
          f2: number | null;
          f3: number | null;
          faixa_risco: string;
          id: string;
          inad_total_ratio: number | null;
          leverage_ratio: number | null;
          liquidity_ratio: number | null;
          max_drawdown: number | null;
          mean_rentab: number | null;
          n_months_total: number | null;
          pct_below_cdi: number | null;
          pct_negative: number | null;
          pdd_prevista_ensemble: number | null;
          pdd_ratio: number | null;
          pipeline_key: string;
          reference_date: string;
          score_risco: number;
          score_risco_global: number;
          sharpe_ratio: number | null;
          std_rentab: number | null;
        };
        Insert: {
          alerta_deterioracao?: boolean | null;
          cluster_id?: number | null;
          cluster_risk_label?: string | null;
          cnpj_fundo: string;
          confidence_label: string;
          confidence_tier: number;
          created_at?: string | null;
          default_stock_ratio?: number | null;
          delta_pdd?: number | null;
          f1?: number | null;
          f2?: number | null;
          f3?: number | null;
          faixa_risco: string;
          id?: string;
          inad_total_ratio?: number | null;
          leverage_ratio?: number | null;
          liquidity_ratio?: number | null;
          max_drawdown?: number | null;
          mean_rentab?: number | null;
          n_months_total?: number | null;
          pct_below_cdi?: number | null;
          pct_negative?: number | null;
          pdd_prevista_ensemble?: number | null;
          pdd_ratio?: number | null;
          pipeline_key: string;
          reference_date: string;
          score_risco: number;
          score_risco_global: number;
          sharpe_ratio?: number | null;
          std_rentab?: number | null;
        };
        Update: {
          alerta_deterioracao?: boolean | null;
          cluster_id?: number | null;
          cluster_risk_label?: string | null;
          cnpj_fundo?: string;
          confidence_label?: string;
          confidence_tier?: number;
          created_at?: string | null;
          default_stock_ratio?: number | null;
          delta_pdd?: number | null;
          f1?: number | null;
          f2?: number | null;
          f3?: number | null;
          faixa_risco?: string;
          id?: string;
          inad_total_ratio?: number | null;
          leverage_ratio?: number | null;
          liquidity_ratio?: number | null;
          max_drawdown?: number | null;
          mean_rentab?: number | null;
          n_months_total?: number | null;
          pct_below_cdi?: number | null;
          pct_negative?: number | null;
          pdd_prevista_ensemble?: number | null;
          pdd_ratio?: number | null;
          pipeline_key?: string;
          reference_date?: string;
          score_risco?: number;
          score_risco_global?: number;
          sharpe_ratio?: number | null;
          std_rentab?: number | null;
        };
        Relationships: [];
      };
      risk_tidc_monthly: {
        Row: {
          advance_rate: number | null;
          avg_discount_rate: number | null;
          cedente_effective_n: number | null;
          cedente_top5_pct: number | null;
          collection_rate: number | null;
          created_at: string | null;
          default_ratio: number | null;
          distance_to_loss: number | null;
          effective_yield: number | null;
          id: string;
          inad_early_ratio: number | null;
          inad_mid_ratio: number | null;
          inad_severe_ratio: number | null;
          on_time_payment_ratio: number | null;
          overdue_ratio: number | null;
          pipeline_key: string;
          reference_month: string;
          sacado_effective_n: number | null;
          sacado_top5_pct: number | null;
          total_acquisition_value: number | null;
          total_face_value: number | null;
          total_items: number | null;
          wal_days: number | null;
        };
        Insert: {
          advance_rate?: number | null;
          avg_discount_rate?: number | null;
          cedente_effective_n?: number | null;
          cedente_top5_pct?: number | null;
          collection_rate?: number | null;
          created_at?: string | null;
          default_ratio?: number | null;
          distance_to_loss?: number | null;
          effective_yield?: number | null;
          id?: string;
          inad_early_ratio?: number | null;
          inad_mid_ratio?: number | null;
          inad_severe_ratio?: number | null;
          on_time_payment_ratio?: number | null;
          overdue_ratio?: number | null;
          pipeline_key: string;
          reference_month: string;
          sacado_effective_n?: number | null;
          sacado_top5_pct?: number | null;
          total_acquisition_value?: number | null;
          total_face_value?: number | null;
          total_items?: number | null;
          wal_days?: number | null;
        };
        Update: {
          advance_rate?: number | null;
          avg_discount_rate?: number | null;
          cedente_effective_n?: number | null;
          cedente_top5_pct?: number | null;
          collection_rate?: number | null;
          created_at?: string | null;
          default_ratio?: number | null;
          distance_to_loss?: number | null;
          effective_yield?: number | null;
          id?: string;
          inad_early_ratio?: number | null;
          inad_mid_ratio?: number | null;
          inad_severe_ratio?: number | null;
          on_time_payment_ratio?: number | null;
          overdue_ratio?: number | null;
          pipeline_key?: string;
          reference_month?: string;
          sacado_effective_n?: number | null;
          sacado_top5_pct?: number | null;
          total_acquisition_value?: number | null;
          total_face_value?: number | null;
          total_items?: number | null;
          wal_days?: number | null;
        };
        Relationships: [];
      };
      risk_tidc_scores: {
        Row: {
          alerta_deterioracao: boolean | null;
          cedente_top5_pct: number | null;
          collection_rate: number | null;
          confidence_label: string;
          confidence_tier: number;
          created_at: string | null;
          default_ratio: number | null;
          distance_to_loss: number | null;
          effective_yield: number | null;
          expected_loss_proxy: number | null;
          faixa_risco: string;
          id: string;
          mean_monthly_yield: number | null;
          n_months_total: number | null;
          on_time_payment_ratio: number | null;
          overdue_ratio: number | null;
          pipeline_key: string;
          reference_date: string;
          sacado_top5_pct: number | null;
          score_risco: number;
        };
        Insert: {
          alerta_deterioracao?: boolean | null;
          cedente_top5_pct?: number | null;
          collection_rate?: number | null;
          confidence_label: string;
          confidence_tier: number;
          created_at?: string | null;
          default_ratio?: number | null;
          distance_to_loss?: number | null;
          effective_yield?: number | null;
          expected_loss_proxy?: number | null;
          faixa_risco: string;
          id?: string;
          mean_monthly_yield?: number | null;
          n_months_total?: number | null;
          on_time_payment_ratio?: number | null;
          overdue_ratio?: number | null;
          pipeline_key: string;
          reference_date: string;
          sacado_top5_pct?: number | null;
          score_risco: number;
        };
        Update: {
          alerta_deterioracao?: boolean | null;
          cedente_top5_pct?: number | null;
          collection_rate?: number | null;
          confidence_label?: string;
          confidence_tier?: number;
          created_at?: string | null;
          default_ratio?: number | null;
          distance_to_loss?: number | null;
          effective_yield?: number | null;
          expected_loss_proxy?: number | null;
          faixa_risco?: string;
          id?: string;
          mean_monthly_yield?: number | null;
          n_months_total?: number | null;
          on_time_payment_ratio?: number | null;
          overdue_ratio?: number | null;
          pipeline_key?: string;
          reference_date?: string;
          sacado_top5_pct?: number | null;
          score_risco?: number;
        };
        Relationships: [];
      };
      tokens: {
        Row: {
          address: string;
          created_at: string;
          decimals: number;
          icon: string | null;
          id: string;
          name: string;
          symbol: string;
          updated_at: string;
        };
        Insert: {
          address: string;
          created_at?: string;
          decimals: number;
          icon?: string | null;
          id?: string;
          name: string;
          symbol: string;
          updated_at?: string;
        };
        Update: {
          address?: string;
          created_at?: string;
          decimals?: number;
          icon?: string | null;
          id?: string;
          name?: string;
          symbol?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tvl_snapshots: {
        Row: {
          chain_tx_id: string | null;
          created_at: string | null;
          event_type: string;
          id: string;
          price_per_share: number;
          pool_id: string;
          recorded_at: string;
          total_shares: number;
          tvl: number;
        };
        Insert: {
          chain_tx_id?: string | null;
          created_at?: string | null;
          event_type: string;
          id?: string;
          price_per_share: number;
          pool_id: string;
          recorded_at: string;
          total_shares: number;
          tvl: number;
        };
        Update: {
          chain_tx_id?: string | null;
          created_at?: string | null;
          event_type?: string;
          id?: string;
          price_per_share?: number;
          pool_id?: string;
          recorded_at?: string;
          total_shares?: number;
          tvl?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'tvl_snapshots_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          account: string;
          created_at: string;
          dynamic_identifier: string | null;
          id: string;
          investor_classification: string | null;
          kyc_attestation: string | null;
          kyc_id: number | null;
          notifications: Json | null;
          provider_id: string | null;
          referral_id: string;
          referred_by: string | null;
          type: string | null;
          updated_at: string;
        };
        Insert: {
          account: string;
          created_at?: string;
          dynamic_identifier?: string | null;
          id?: string;
          investor_classification?: string | null;
          kyc_attestation?: string | null;
          kyc_id?: number | null;
          notifications?: Json | null;
          provider_id?: string | null;
          referral_id: string;
          referred_by?: string | null;
          type?: string | null;
          updated_at?: string;
        };
        Update: {
          account?: string;
          created_at?: string;
          dynamic_identifier?: string | null;
          id?: string;
          investor_classification?: string | null;
          kyc_attestation?: string | null;
          kyc_id?: number | null;
          notifications?: Json | null;
          provider_id?: string | null;
          referral_id?: string;
          referred_by?: string | null;
          type?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_tvl: {
        Args: Record<PropertyKey, never>;
        Returns: { total_tvl: number }[];
      };
      get_daily_tvl: {
        Args: Record<PropertyKey, never>;
        Returns: { day: string; tvl: number }[];
      };
      increment_window_approved: {
        Args: { p_pool_id: string; p_amount: number };
        Returns: undefined;
      };
      increment_window_rejected: {
        Args: { p_pool_id: string; p_amount: number };
        Returns: undefined;
      };
      increment_window_requested: {
        Args: { p_pool_id: string; p_amount: number };
        Returns: undefined;
      };
      open_investment_window: {
        Args: { p_pool_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      kyb_document_category:
        | 'certificate_of_incorporation'
        | 'proof_of_address'
        | 'register_of_directors'
        | 'register_of_shareholders'
        | 'ubo_id_document'
        | 'financial_statements'
        | 'regulatory_license'
        | 'source_of_funds_evidence'
        | 'authority_evidence'
        | 'sanctions_screening_evidence'
        | 'wallet_screening_evidence'
        | 'other';
      kyb_status:
        | 'draft'
        | 'submitted'
        | 'under_review'
        | 'approved'
        | 'resubmission_requested'
        | 'rejected'
        | 'revoked';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      kyb_document_category: [
        'certificate_of_incorporation',
        'proof_of_address',
        'register_of_directors',
        'register_of_shareholders',
        'ubo_id_document',
        'financial_statements',
        'regulatory_license',
        'source_of_funds_evidence',
        'authority_evidence',
        'sanctions_screening_evidence',
        'wallet_screening_evidence',
        'other',
      ],
      kyb_status: [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'resubmission_requested',
        'rejected',
        'revoked',
      ],
    },
  },
} as const;
