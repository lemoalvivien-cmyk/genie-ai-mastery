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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abuse_flags: {
        Row: {
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          ip_hash: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          ip_hash?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          ip_hash?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abuse_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          plan: string
          used_by: Json | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          plan?: string
          used_by?: Json | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          plan?: string
          used_by?: Json | null
        }
        Relationships: []
      }
      ai_usage_buffer: {
        Row: {
          cost_estimate: number
          created_at: string
          date: string
          id: string
          model: string | null
          org_id: string | null
          request_id: string | null
          tokens_in: number
          tokens_out: number
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number
          created_at?: string
          date?: string
          id?: string
          model?: string | null
          org_id?: string | null
          request_id?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number
          created_at?: string
          date?: string
          id?: string
          model?: string | null
          org_id?: string | null
          request_id?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_daily: {
        Row: {
          cost_estimate: number
          created_at: string | null
          date: string
          id: string
          model_used: string | null
          org_id: string | null
          tokens_in: number
          tokens_out: number
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number
          created_at?: string | null
          date?: string
          id?: string
          model_used?: string | null
          org_id?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number
          created_at?: string | null
          date?: string
          id?: string
          model_used?: string | null
          org_id?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_metrics: {
        Row: {
          id: number
          last_logging_error_at: string | null
          logging_errors: number
          updated_at: string | null
        }
        Insert: {
          id?: number
          last_logging_error_at?: string | null
          logging_errors?: number
          updated_at?: string | null
        }
        Update: {
          id?: number
          last_logging_error_at?: string | null
          logging_errors?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          org_id: string | null
          session_id: string | null
          signed_url: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          org_id?: string | null
          session_id?: string | null
          signed_url?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          org_id?: string | null
          session_id?: string | null
          signed_url?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attestations: {
        Row: {
          generated_at: string | null
          id: string
          metadata: Json | null
          modules_completed: Json
          org_id: string | null
          pdf_url: string | null
          score_average: number | null
          signature_hash: string | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          modules_completed?: Json
          org_id?: string | null
          pdf_url?: string | null
          score_average?: number | null
          signature_hash?: string | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          modules_completed?: Json
          org_id?: string | null
          pdf_url?: string | null
          score_average?: number | null
          signature_hash?: string | null
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attestations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          action_plan: Json
          confidence: number
          created_at: string
          domain: string
          id: string
          is_verified: boolean
          kid_summary: string
          source_count: number
          sources: Json
          title: string
        }
        Insert: {
          action_plan?: Json
          confidence?: number
          created_at?: string
          domain?: string
          id?: string
          is_verified?: boolean
          kid_summary: string
          source_count?: number
          sources?: Json
          title: string
        }
        Update: {
          action_plan?: Json
          confidence?: number
          created_at?: string
          domain?: string
          id?: string
          is_verified?: boolean
          kid_summary?: string
          source_count?: number
          sources?: Json
          title?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          module_ids: string[]
          org_id: string
          status: Database["public"]["Enums"]["campaign_status"] | null
          target_group: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          module_ids?: string[]
          org_id: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_group?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          module_ids?: string[]
          org_id?: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_group?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          agent_used: string | null
          content: string
          cost_eur: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          model_used: string | null
          role: Database["public"]["Enums"]["chat_role"]
          session_id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          agent_used?: string | null
          content: string
          cost_eur?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          role: Database["public"]["Enums"]["chat_role"]
          session_id: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          agent_used?: string | null
          content?: string
          cost_eur?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          role?: Database["public"]["Enums"]["chat_role"]
          session_id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      csp_reports: {
        Row: {
          blocked_uri: string | null
          column_number: number | null
          created_at: string
          disposition: string | null
          document_uri: string | null
          effective_directive: string | null
          id: string
          ip_address: unknown
          line_number: number | null
          original_policy: string | null
          source_file: string | null
          status_code: number | null
          user_agent: string | null
          violated_directive: string | null
        }
        Insert: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          disposition?: string | null
          document_uri?: string | null
          effective_directive?: string | null
          id?: string
          ip_address?: unknown
          line_number?: number | null
          original_policy?: string | null
          source_file?: string | null
          status_code?: number | null
          user_agent?: string | null
          violated_directive?: string | null
        }
        Update: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          disposition?: string | null
          document_uri?: string | null
          effective_directive?: string | null
          id?: string
          ip_address?: unknown
          line_number?: number | null
          original_policy?: string | null
          source_file?: string | null
          status_code?: number | null
          user_agent?: string | null
          violated_directive?: string | null
        }
        Relationships: []
      }
      daily_missions: {
        Row: {
          content: Json
          created_at: string | null
          description: string
          domain: string
          id: string
          is_active: boolean | null
          jarvis_bravo: string
          jarvis_intro: string
          level: string | null
          mission_type: string
          title: string
          xp: number | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          description: string
          domain: string
          id?: string
          is_active?: boolean | null
          jarvis_bravo: string
          jarvis_intro: string
          level?: string | null
          mission_type: string
          title: string
          xp?: number | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          description?: string
          domain?: string
          id?: string
          is_active?: boolean | null
          jarvis_bravo?: string
          jarvis_intro?: string
          level?: string | null
          mission_type?: string
          title?: string
          xp?: number | null
        }
        Relationships: []
      }
      flags: {
        Row: {
          chat_message_id: string | null
          created_at: string | null
          id: string
          module_id: string | null
          reason: string
          resolved_by: string | null
          severity: Database["public"]["Enums"]["flag_severity"] | null
          status: Database["public"]["Enums"]["flag_status"] | null
          user_id: string | null
        }
        Insert: {
          chat_message_id?: string | null
          created_at?: string | null
          id?: string
          module_id?: string | null
          reason: string
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["flag_severity"] | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          user_id?: string | null
        }
        Update: {
          chat_message_id?: string | null
          created_at?: string | null
          id?: string
          module_id?: string | null
          reason?: string
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["flag_severity"] | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flags_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          ip_hash: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip_hash: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_hash?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          confidence_score: number | null
          content_json: Json
          created_at: string | null
          deliverables: Json | null
          description: string | null
          domain: Database["public"]["Enums"]["module_domain"]
          duration_minutes: number | null
          icon_name: string | null
          id: string
          is_gold: boolean | null
          is_published: boolean | null
          level: Database["public"]["Enums"]["module_level"] | null
          order_index: number | null
          persona_variant:
            | Database["public"]["Enums"]["persona_variant_type"]
            | null
          slug: string
          sources: Json | null
          subtitle: string | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          confidence_score?: number | null
          content_json?: Json
          created_at?: string | null
          deliverables?: Json | null
          description?: string | null
          domain: Database["public"]["Enums"]["module_domain"]
          duration_minutes?: number | null
          icon_name?: string | null
          id?: string
          is_gold?: boolean | null
          is_published?: boolean | null
          level?: Database["public"]["Enums"]["module_level"] | null
          order_index?: number | null
          persona_variant?:
            | Database["public"]["Enums"]["persona_variant_type"]
            | null
          slug: string
          sources?: Json | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          confidence_score?: number | null
          content_json?: Json
          created_at?: string | null
          deliverables?: Json | null
          description?: string | null
          domain?: Database["public"]["Enums"]["module_domain"]
          duration_minutes?: number | null
          icon_name?: string | null
          id?: string
          is_gold?: boolean | null
          is_published?: boolean | null
          level?: Database["public"]["Enums"]["module_level"] | null
          order_index?: number | null
          persona_variant?:
            | Database["public"]["Enums"]["persona_variant_type"]
            | null
          slug?: string
          sources?: Json | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      org_budgets: {
        Row: {
          daily_cost_cap: number
          daily_token_cap: number
          eco_mode_forced: boolean
          eco_triggered_at: string | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          daily_cost_cap?: number
          daily_token_cap?: number
          eco_mode_forced?: boolean
          eco_triggered_at?: string | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          daily_cost_cap?: number
          daily_token_cap?: number
          eco_mode_forced?: boolean
          eco_triggered_at?: string | null
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          completion_deadline_days: number | null
          created_at: string | null
          default_modules: string[] | null
          email_reminders_enabled: boolean | null
          id: string
          logo_url: string | null
          name: string
          partner_org_id: string | null
          plan: Database["public"]["Enums"]["org_plan"] | null
          plan_source: string | null
          seats_max: number | null
          seats_used: number | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          completion_deadline_days?: number | null
          created_at?: string | null
          default_modules?: string[] | null
          email_reminders_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          name: string
          partner_org_id?: string | null
          plan?: Database["public"]["Enums"]["org_plan"] | null
          plan_source?: string | null
          seats_max?: number | null
          seats_used?: number | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          completion_deadline_days?: number | null
          created_at?: string | null
          default_modules?: string[] | null
          email_reminders_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          name?: string
          partner_org_id?: string | null
          plan?: Database["public"]["Enums"]["org_plan"] | null
          plan_source?: string | null
          seats_max?: number | null
          seats_used?: number | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "partner_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_orgs: {
        Row: {
          clients_count: number | null
          contact_email: string
          created_at: string | null
          id: string
          name: string
          revenue_share_pct: number | null
          status: Database["public"]["Enums"]["partner_status"] | null
          stripe_connect_id: string | null
          type: Database["public"]["Enums"]["partner_type"]
        }
        Insert: {
          clients_count?: number | null
          contact_email: string
          created_at?: string | null
          id?: string
          name: string
          revenue_share_pct?: number | null
          status?: Database["public"]["Enums"]["partner_status"] | null
          stripe_connect_id?: string | null
          type: Database["public"]["Enums"]["partner_type"]
        }
        Update: {
          clients_count?: number | null
          contact_email?: string
          created_at?: string | null
          id?: string
          name?: string
          revenue_share_pct?: number | null
          status?: Database["public"]["Enums"]["partner_status"] | null
          stripe_connect_id?: string | null
          type?: Database["public"]["Enums"]["partner_type"]
        }
        Relationships: []
      }
      phishing_results: {
        Row: {
          completed_at: string
          email_id: string
          found_clues: Json
          id: string
          score: number
          total_clues: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          email_id: string
          found_clues?: Json
          id?: string
          score?: number
          total_clues?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          email_id?: string
          found_clues?: Json
          id?: string
          score?: number
          total_clues?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phishing_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          abuse_blocked_until: string | null
          abuse_score: number
          created_at: string | null
          email: string
          full_name: string | null
          has_completed_welcome: boolean | null
          id: string
          last_active_at: string | null
          level: number | null
          onboarding_completed: boolean | null
          org_id: string | null
          panic_uses: number | null
          persona: Database["public"]["Enums"]["persona_type"] | null
          preferred_mode:
            | Database["public"]["Enums"]["preferred_mode_type"]
            | null
          role: Database["public"]["Enums"]["app_role"] | null
          streak_count: number | null
          updated_at: string | null
          voice_enabled: boolean | null
        }
        Insert: {
          abuse_blocked_until?: string | null
          abuse_score?: number
          created_at?: string | null
          email: string
          full_name?: string | null
          has_completed_welcome?: boolean | null
          id: string
          last_active_at?: string | null
          level?: number | null
          onboarding_completed?: boolean | null
          org_id?: string | null
          panic_uses?: number | null
          persona?: Database["public"]["Enums"]["persona_type"] | null
          preferred_mode?:
            | Database["public"]["Enums"]["preferred_mode_type"]
            | null
          role?: Database["public"]["Enums"]["app_role"] | null
          streak_count?: number | null
          updated_at?: string | null
          voice_enabled?: boolean | null
        }
        Update: {
          abuse_blocked_until?: string | null
          abuse_score?: number
          created_at?: string | null
          email?: string
          full_name?: string | null
          has_completed_welcome?: boolean | null
          id?: string
          last_active_at?: string | null
          level?: number | null
          onboarding_completed?: boolean | null
          org_id?: string | null
          panic_uses?: number | null
          persona?: Database["public"]["Enums"]["persona_type"] | null
          preferred_mode?:
            | Database["public"]["Enums"]["preferred_mode_type"]
            | null
          role?: Database["public"]["Enums"]["app_role"] | null
          streak_count?: number | null
          updated_at?: string | null
          voice_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          attempts: number | null
          attestation_url: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          module_id: string
          quiz_answers: Json | null
          score: number | null
          status: Database["public"]["Enums"]["progress_status"] | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          attestation_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_id: string
          quiz_answers?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["progress_status"] | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          attestation_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_id?: string
          quiz_answers?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["progress_status"] | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          passing_score: number | null
          questions: Json
          time_limit_seconds: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          passing_score?: number | null
          questions?: Json
          time_limit_seconds?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          passing_score?: number | null
          questions?: Json
          time_limit_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          level: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          level?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          level?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      source_items: {
        Row: {
          created_at: string
          hash: string
          id: string
          published_at: string | null
          raw: string | null
          source_id: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          hash: string
          id?: string
          published_at?: string | null
          raw?: string | null
          source_id: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          hash?: string
          id?: string
          published_at?: string | null
          raw?: string | null
          source_id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          domain: string
          enabled: boolean
          id: string
          last_fetch_at: string | null
          name: string
          refresh_freq: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          domain?: string
          enabled?: boolean
          id?: string
          last_fetch_at?: string | null
          name: string
          refresh_freq?: string
          type?: string
          url: string
        }
        Update: {
          created_at?: string
          domain?: string
          enabled?: boolean
          id?: string
          last_fetch_at?: string | null
          name?: string
          refresh_freq?: string
          type?: string
          url?: string
        }
        Relationships: []
      }
      user_daily_log: {
        Row: {
          completed_date: string
          created_at: string | null
          id: number
          mission_id: string
          score: number | null
          time_spent_seconds: number | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          completed_date: string
          created_at?: string | null
          id?: number
          mission_id: string
          score?: number | null
          time_spent_seconds?: number | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          completed_date?: string
          created_at?: string | null
          id?: number
          mission_id?: string
          score?: number | null
          time_spent_seconds?: number | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_log_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "daily_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          id: string
          score: number
          skill_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          score?: number
          skill_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          score?: number
          skill_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number | null
          id: number
          last_completed_date: string | null
          longest_streak: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          id?: number
          last_completed_date?: string | null
          longest_streak?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          id?: number
          last_completed_date?: string | null
          longest_streak?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_org_stats: { Args: { _org_id: string }; Returns: Json }
      check_budget: {
        Args: { _org_id?: string; _user_id: string }
        Returns: Json
      }
      check_ip_rate_limit: {
        Args: {
          _endpoint: string
          _ip_hash: string
          _max_requests?: number
          _window_hours?: number
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _max_calls?: number
          _user_id: string
          _window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_ip_rate_limits: { Args: never; Returns: undefined }
      flush_usage_buffer: { Args: never; Returns: Json }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_logging_errors: { Args: never; Returns: undefined }
      is_manager_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_ai_usage_safe: {
        Args: {
          _cost_estimate: number
          _date?: string
          _model: string
          _org_id: string
          _request_id?: string
          _tokens_in: number
          _tokens_out: number
          _user_id: string
        }
        Returns: Json
      }
      log_audit: {
        Args: {
          _action: string
          _meta?: Json
          _resource_id?: string
          _resource_type?: string
        }
        Returns: undefined
      }
      record_abuse: {
        Args: {
          _details?: Json
          _flag_type: string
          _ip_hash: string
          _severity?: string
          _user_id: string
        }
        Returns: undefined
      }
      reset_eco_mode: { Args: { _org_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "manager" | "learner"
      campaign_status: "draft" | "active" | "completed" | "archived"
      chat_role: "user" | "assistant" | "system"
      flag_severity: "low" | "medium" | "high" | "critical"
      flag_status: "open" | "reviewing" | "resolved" | "dismissed"
      module_domain: "ia_pro" | "ia_perso" | "cyber" | "vibe_coding"
      module_level: "debutant" | "intermediaire" | "avance"
      org_plan:
        | "free"
        | "perso"
        | "famille"
        | "business"
        | "compliance"
        | "partner"
      partner_status: "pending" | "active" | "suspended"
      partner_type:
        | "comptable"
        | "courtier"
        | "msp"
        | "cci"
        | "federation"
        | "autre"
      persona_type:
        | "jeune"
        | "parent"
        | "salarie"
        | "dirigeant"
        | "senior"
        | "independant"
      persona_variant_type:
        | "jeune"
        | "parent"
        | "salarie"
        | "dirigeant"
        | "senior"
        | "independant"
        | "universal"
      preferred_mode_type: "enfant" | "normal" | "expert"
      progress_status: "not_started" | "in_progress" | "completed" | "failed"
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
    Enums: {
      app_role: ["admin", "manager", "learner"],
      campaign_status: ["draft", "active", "completed", "archived"],
      chat_role: ["user", "assistant", "system"],
      flag_severity: ["low", "medium", "high", "critical"],
      flag_status: ["open", "reviewing", "resolved", "dismissed"],
      module_domain: ["ia_pro", "ia_perso", "cyber", "vibe_coding"],
      module_level: ["debutant", "intermediaire", "avance"],
      org_plan: [
        "free",
        "perso",
        "famille",
        "business",
        "compliance",
        "partner",
      ],
      partner_status: ["pending", "active", "suspended"],
      partner_type: [
        "comptable",
        "courtier",
        "msp",
        "cci",
        "federation",
        "autre",
      ],
      persona_type: [
        "jeune",
        "parent",
        "salarie",
        "dirigeant",
        "senior",
        "independant",
      ],
      persona_variant_type: [
        "jeune",
        "parent",
        "salarie",
        "dirigeant",
        "senior",
        "independant",
        "universal",
      ],
      preferred_mode_type: ["enfant", "normal", "expert"],
      progress_status: ["not_started", "in_progress", "completed", "failed"],
    },
  },
} as const
