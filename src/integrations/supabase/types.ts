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
      _deprecated_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          module: string | null
          resource_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          module?: string | null
          resource_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          module?: string | null
          resource_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      _deprecated_agent_store_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          item_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_store_ratings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "agent_store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_genieos_workflows: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          status: string | null
          steps: Json | null
          tools: string | null
          trigger_event: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string | null
          steps?: Json | null
          tools?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string | null
          steps?: Json | null
          tools?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      _deprecated_job_results: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          job_id: string
          result: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          job_id: string
          result?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          job_id?: string
          result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_marketplace_items: {
        Row: {
          category: string | null
          content: Json
          created_at: string | null
          description: string
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          name: string
          rating_avg: number | null
          rating_count: number | null
          tags: string[] | null
          type: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: Json
          created_at?: string | null
          description?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name: string
          rating_avg?: number | null
          rating_count?: number | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: Json
          created_at?: string | null
          description?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name?: string
          rating_avg?: number | null
          rating_count?: number | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      _deprecated_marketplace_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          item_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_ratings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "_deprecated_marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_marketplace_usage: {
        Row: {
          id: string
          item_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_usage_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "_deprecated_marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      _deprecated_revenue_reports: {
        Row: {
          created_at: string | null
          data: Json | null
          estimated_pipeline_eur: number | null
          id: string
          leads_generated: number | null
          opportunities_found: number | null
          report_type: string
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          estimated_pipeline_eur?: number | null
          id?: string
          leads_generated?: number | null
          opportunities_found?: number | null
          report_type: string
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          estimated_pipeline_eur?: number | null
          id?: string
          leads_generated?: number | null
          opportunities_found?: number | null
          report_type?: string
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
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
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
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
      action_logs: {
        Row: {
          action_type: string
          agent_id: string | null
          confirmed_by_user: boolean | null
          created_at: string
          duration_ms: number | null
          error: string | null
          execution_id: string | null
          id: string
          input: Json
          mode: string
          output: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          confirmed_by_user?: boolean | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          execution_id?: string | null
          id?: string
          input?: Json
          mode?: string
          output?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          confirmed_by_user?: boolean | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          execution_id?: string | null
          id?: string
          input?: Json
          mode?: string
          output?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "genieos_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "agent_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_economy: {
        Row: {
          agent_id: string | null
          created_at: string | null
          downloads: number | null
          id: string
          is_free: boolean | null
          is_published: boolean | null
          owner_id: string
          price_eur: number | null
          revenue_total: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          downloads?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          owner_id: string
          price_eur?: number | null
          revenue_total?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          downloads?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          owner_id?: string
          price_eur?: number | null
          revenue_total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_economy_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "genieos_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_executions: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          error: string | null
          id: string
          metadata: Json | null
          objective: string
          result: string | null
          started_at: string | null
          status: string | null
          steps: Json | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          error?: string | null
          id?: string
          metadata?: Json | null
          objective?: string
          result?: string | null
          started_at?: string | null
          status?: string | null
          steps?: Json | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          error?: string | null
          id?: string
          metadata?: Json | null
          objective?: string
          result?: string | null
          started_at?: string | null
          status?: string | null
          steps?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "genieos_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          agent_id: string | null
          created_at: string
          duration_ms: number | null
          execution_id: string | null
          id: string
          input: Json | null
          level: string
          message: string
          output: Json | null
          step: string | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          input?: Json | null
          level?: string
          message: string
          output?: Json | null
          step?: string | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          input?: Json | null
          level?: string
          message?: string
          output?: Json | null
          step?: string | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      agent_revenue: {
        Row: {
          agent_id: string | null
          commission_amount_eur: number
          commission_rate: number
          created_at: string
          id: string
          metadata: Json | null
          net_amount_eur: number
          paid_at: string | null
          sale_amount_eur: number
          seller_id: string
          status: string
          transaction_type: string
        }
        Insert: {
          agent_id?: string | null
          commission_amount_eur?: number
          commission_rate?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          net_amount_eur?: number
          paid_at?: string | null
          sale_amount_eur?: number
          seller_id: string
          status?: string
          transaction_type?: string
        }
        Update: {
          agent_id?: string | null
          commission_amount_eur?: number
          commission_rate?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          net_amount_eur?: number
          paid_at?: string | null
          sale_amount_eur?: number
          seller_id?: string
          status?: string
          transaction_type?: string
        }
        Relationships: []
      }
      agent_sales: {
        Row: {
          agent_economy_id: string | null
          amount_eur: number | null
          buyer_id: string
          created_at: string | null
          id: string
          seller_id: string
          transaction_type: string | null
        }
        Insert: {
          agent_economy_id?: string | null
          amount_eur?: number | null
          buyer_id: string
          created_at?: string | null
          id?: string
          seller_id: string
          transaction_type?: string | null
        }
        Update: {
          agent_economy_id?: string | null
          amount_eur?: number | null
          buyer_id?: string
          created_at?: string | null
          id?: string
          seller_id?: string
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_sales_agent_economy_id_fkey"
            columns: ["agent_economy_id"]
            isOneToOne: false
            referencedRelation: "agent_economy"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_store_installs: {
        Row: {
          agent_id: string | null
          config: Json | null
          id: string
          installed_at: string | null
          is_active: boolean | null
          item_id: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          config?: Json | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          item_id: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          config?: Json | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_store_installs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "genieos_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_store_installs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "agent_store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_store_items: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string
          config: Json | null
          created_at: string | null
          description: string
          icon: string | null
          id: string
          install_count: number | null
          is_official: boolean | null
          is_public: boolean | null
          name: string
          rating_avg: number | null
          rating_count: number | null
          system_prompt: string | null
          tags: string[] | null
          tools: Json | null
          updated_at: string | null
          use_cases: string[] | null
          version: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string
          config?: Json | null
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          install_count?: number | null
          is_official?: boolean | null
          is_public?: boolean | null
          name: string
          rating_avg?: number | null
          rating_count?: number | null
          system_prompt?: string | null
          tags?: string[] | null
          tools?: Json | null
          updated_at?: string | null
          use_cases?: string[] | null
          version?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string
          config?: Json | null
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          install_count?: number | null
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string
          rating_avg?: number | null
          rating_count?: number | null
          system_prompt?: string | null
          tags?: string[] | null
          tools?: Json | null
          updated_at?: string | null
          use_cases?: string[] | null
          version?: string | null
        }
        Relationships: []
      }
      ai_budgets: {
        Row: {
          daily_limit: number
          is_blocked: boolean
          org_id: string
          reset_date: string
          updated_at: string
          used_today: number
        }
        Insert: {
          daily_limit?: number
          is_blocked?: boolean
          org_id: string
          reset_date?: string
          updated_at?: string
          used_today?: number
        }
        Update: {
          daily_limit?: number
          is_blocked?: boolean
          org_id?: string
          reset_date?: string
          updated_at?: string
          used_today?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "org_member_profiles"
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
      analytics_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_name: string
          id: string
          org_id: string | null
          properties: Json
          session_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          org_id?: string | null
          properties?: Json
          session_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          org_id?: string | null
          properties?: Json
          session_id?: string | null
        }
        Relationships: []
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
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "org_member_profiles"
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
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "org_member_profiles"
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
          device: string | null
          duration_ms: number | null
          event_type: string | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          score: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          device?: string | null
          duration_ms?: number | null
          event_type?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          score?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          device?: string | null
          duration_ms?: number | null
          event_type?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          score?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_events: {
        Row: {
          agents_count: number | null
          agents_used: string[] | null
          created_at: string
          error_type: string | null
          event_type: string
          id: string
          latency_ms: number | null
          metadata: Json | null
          org_id: string | null
          risk_score: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          agents_count?: number | null
          agents_used?: string[] | null
          created_at?: string
          error_type?: string | null
          event_type: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          org_id?: string | null
          risk_score?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          agents_count?: number | null
          agents_used?: string[] | null
          created_at?: string
          error_type?: string | null
          event_type?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          org_id?: string | null
          risk_score?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_generated_modules: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          domain: string
          expires_at: string | null
          generated_by: string
          id: string
          org_id: string | null
          predicted_gap: number | null
          status: string
          target_skill: string | null
          title: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          description?: string | null
          domain?: string
          expires_at?: string | null
          generated_by?: string
          id?: string
          org_id?: string | null
          predicted_gap?: number | null
          status?: string
          target_skill?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          domain?: string
          expires_at?: string | null
          generated_by?: string
          id?: string
          org_id?: string | null
          predicted_gap?: number | null
          status?: string
          target_skill?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
          is_auto: boolean | null
          last_sent_at: string | null
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
          is_auto?: boolean | null
          last_sent_at?: string | null
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
          is_auto?: boolean | null
          last_sent_at?: string | null
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
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "org_public_info"
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
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balance: {
        Row: {
          balance: number
          id: string
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          metadata: Json | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: []
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
      data_documents: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          domain: string | null
          id: string
          is_processed: boolean | null
          metadata: Json | null
          published_at: string | null
          relevance_score: number | null
          source_id: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: string
          created_at?: string | null
          domain?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          published_at?: string | null
          relevance_score?: number | null
          source_id?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          domain?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          published_at?: string | null
          relevance_score?: number | null
          source_id?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          config: Json | null
          created_at: string | null
          error_msg: string | null
          fetch_count: number | null
          id: string
          is_active: boolean | null
          last_fetched_at: string | null
          name: string
          status: string | null
          type: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          error_msg?: string | null
          fetch_count?: number | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          name: string
          status?: string | null
          type?: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          error_msg?: string | null
          fetch_count?: number | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          name?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_updates: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          importance: string | null
          is_read: boolean | null
          metadata: Json | null
          summary: string | null
          title: string
          update_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          importance?: string | null
          is_read?: boolean | null
          metadata?: Json | null
          summary?: string | null
          title?: string
          update_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          importance?: string | null
          is_read?: boolean | null
          metadata?: Json | null
          summary?: string | null
          title?: string
          update_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_updates_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "data_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_errors: {
        Row: {
          created_at: string
          fn: string
          id: string
          latency_ms: number | null
          message: string
          meta: Json | null
          org_id: string | null
          request_id: string | null
          stack_hash: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fn: string
          id?: string
          latency_ms?: number | null
          message: string
          meta?: Json | null
          org_id?: string | null
          request_id?: string | null
          stack_hash?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fn?: string
          id?: string
          latency_ms?: number | null
          message?: string
          meta?: Json | null
          org_id?: string | null
          request_id?: string | null
          stack_hash?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      edge_logs: {
        Row: {
          created_at: string
          fn: string
          id: string
          latency_ms: number | null
          org_id: string | null
          request_id: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fn: string
          id?: string
          latency_ms?: number | null
          org_id?: string | null
          request_id?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fn?: string
          id?: string
          latency_ms?: number | null
          org_id?: string | null
          request_id?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_leads: {
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
      error_logs: {
        Row: {
          created_at: string
          error_type: string
          id: string
          message: string
          metadata: Json | null
          resolved: boolean
          source: string
          stack_trace: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_type: string
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean
          source?: string
          stack_trace?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean
          source?: string
          stack_trace?: string | null
          url?: string | null
          user_id?: string | null
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
            referencedRelation: "org_member_profiles"
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
            referencedRelation: "org_member_profiles"
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
      forge_log: {
        Row: {
          duration_ms: number | null
          error: string | null
          id: string
          model_validator: string | null
          model_writer: string | null
          module_id: string | null
          module_slug: string | null
          new_version: number | null
          old_version: number | null
          run_at: string
          threat_source: string | null
          threat_title: string | null
          validation_passed: boolean
          validation_reason: string | null
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          id?: string
          model_validator?: string | null
          model_writer?: string | null
          module_id?: string | null
          module_slug?: string | null
          new_version?: number | null
          old_version?: number | null
          run_at?: string
          threat_source?: string | null
          threat_title?: string | null
          validation_passed?: boolean
          validation_reason?: string | null
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          id?: string
          model_validator?: string | null
          model_writer?: string | null
          module_id?: string | null
          module_slug?: string | null
          new_version?: number | null
          old_version?: number | null
          run_at?: string
          threat_source?: string | null
          threat_title?: string | null
          validation_passed?: boolean
          validation_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forge_log_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      function_calls_daily: {
        Row: {
          call_count: number
          date: string
          fn: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          call_count?: number
          date?: string
          fn: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          call_count?: number
          date?: string
          fn?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      genie_brain: {
        Row: {
          active_agents: string[]
          agent_states: Json
          analysis_version: number
          cache_expires_at: string | null
          cache_key: string | null
          created_at: string
          id: string
          knowledge_graph: Json
          last_analysis_at: string | null
          next_failure_prediction: string | null
          ontology_nodes: string[]
          org_id: string | null
          predicted_risk_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_agents?: string[]
          agent_states?: Json
          analysis_version?: number
          cache_expires_at?: string | null
          cache_key?: string | null
          created_at?: string
          id?: string
          knowledge_graph?: Json
          last_analysis_at?: string | null
          next_failure_prediction?: string | null
          ontology_nodes?: string[]
          org_id?: string | null
          predicted_risk_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_agents?: string[]
          agent_states?: Json
          analysis_version?: number
          cache_expires_at?: string | null
          cache_key?: string | null
          created_at?: string
          id?: string
          knowledge_graph?: Json
          last_analysis_at?: string | null
          next_failure_prediction?: string | null
          ontology_nodes?: string[]
          org_id?: string | null
          predicted_risk_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "genie_brain_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genie_brain_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genie_brain_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genie_brain_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genie_brain_events: {
        Row: {
          agent_name: string | null
          brain_id: string
          created_at: string
          event_type: string
          id: string
          org_id: string | null
          payload: Json
          risk_delta: number | null
          user_id: string
        }
        Insert: {
          agent_name?: string | null
          brain_id: string
          created_at?: string
          event_type: string
          id?: string
          org_id?: string | null
          payload?: Json
          risk_delta?: number | null
          user_id: string
        }
        Update: {
          agent_name?: string | null
          brain_id?: string
          created_at?: string
          event_type?: string
          id?: string
          org_id?: string | null
          payload?: Json
          risk_delta?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "genie_brain_events_brain_id_fkey"
            columns: ["brain_id"]
            isOneToOne: false
            referencedRelation: "genie_brain"
            referencedColumns: ["id"]
          },
        ]
      }
      genieos_agents: {
        Row: {
          created_at: string | null
          description: string | null
          executions: number | null
          id: string
          last_executed_at: string | null
          metadata: Json | null
          name: string
          objective: string | null
          status: string | null
          system_prompt: string | null
          tools: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          executions?: number | null
          id?: string
          last_executed_at?: string | null
          metadata?: Json | null
          name: string
          objective?: string | null
          status?: string | null
          system_prompt?: string | null
          tools?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          executions?: number | null
          id?: string
          last_executed_at?: string | null
          metadata?: Json | null
          name?: string
          objective?: string | null
          status?: string | null
          system_prompt?: string | null
          tools?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      genieos_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json | null
          model_used: string | null
          module: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          model_used?: string | null
          module?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          model_used?: string | null
          module?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      genieos_projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          stack: Json | null
          status: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          stack?: Json | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          stack?: Json | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      genieos_usage_limits: {
        Row: {
          actions_per_day: number
          agents_max: number
          ai_watch_enabled: boolean
          analytics_enabled: boolean
          api_access_enabled: boolean
          autopilot_enabled: boolean
          created_at: string
          credits_per_month: number
          data_engine_enabled: boolean
          id: string
          multi_agent_enabled: boolean
          plan: string
          revenue_engine_enabled: boolean
          white_label_enabled: boolean
        }
        Insert: {
          actions_per_day?: number
          agents_max?: number
          ai_watch_enabled?: boolean
          analytics_enabled?: boolean
          api_access_enabled?: boolean
          autopilot_enabled?: boolean
          created_at?: string
          credits_per_month?: number
          data_engine_enabled?: boolean
          id?: string
          multi_agent_enabled?: boolean
          plan: string
          revenue_engine_enabled?: boolean
          white_label_enabled?: boolean
        }
        Update: {
          actions_per_day?: number
          agents_max?: number
          ai_watch_enabled?: boolean
          analytics_enabled?: boolean
          api_access_enabled?: boolean
          autopilot_enabled?: boolean
          created_at?: string
          credits_per_month?: number
          data_engine_enabled?: boolean
          id?: string
          multi_agent_enabled?: boolean
          plan?: string
          revenue_engine_enabled?: boolean
          white_label_enabled?: boolean
        }
        Relationships: []
      }
      genieos_user_memory: {
        Row: {
          context_summary: string | null
          preferences: Json | null
          primary_goals: string[] | null
          recent_topics: string[] | null
          skill_level: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_summary?: string | null
          preferences?: Json | null
          primary_goals?: string[] | null
          recent_topics?: string[] | null
          skill_level?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_summary?: string | null
          preferences?: Json | null
          primary_goals?: string[] | null
          recent_topics?: string[] | null
          skill_level?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_type: string
          max_attempts: number
          org_id: string | null
          payload: Json
          priority: number
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          org_id?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          org_id?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number | null
          content: string
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          chunk_index?: number | null
          content: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          chunk_index?: number | null
          content?: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string | null
          file_path: string | null
          id: string
          metadata: Json | null
          source_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string | null
          file_path: string | null
          id: string
          metadata: Json | null
          name: string
          type: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          name: string
          type?: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          type?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memory_timeline: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          importance: string | null
          is_pinned: boolean | null
          metadata: Json | null
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          importance?: string | null
          is_pinned?: boolean | null
          metadata?: Json | null
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          importance?: string | null
          is_pinned?: boolean | null
          metadata?: Json | null
          summary?: string | null
          title?: string
          user_id?: string
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
      nudges: {
        Row: {
          delay_days: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          delay_days?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          delay_days?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      openclaw_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          id: string
          job_id: string
          metadata: Json
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          artifact_type: string
          created_at?: string
          id?: string
          job_id: string
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          artifact_type?: string
          created_at?: string
          id?: string
          job_id?: string
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "openclaw_artifacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "openclaw_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      openclaw_job_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          job_id: string
          message: string
          metadata: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          job_id: string
          message: string
          metadata?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string
          message?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "openclaw_job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "openclaw_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      openclaw_jobs: {
        Row: {
          approval_required: boolean
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          org_id: string
          payload: Json
          prompt: string
          result_json: Json | null
          result_summary: string | null
          risk_level: string
          runtime_id: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          org_id: string
          payload?: Json
          prompt: string
          result_json?: Json | null
          result_summary?: string | null
          risk_level?: string
          runtime_id: string
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          org_id?: string
          payload?: Json
          prompt?: string
          result_json?: Json | null
          result_summary?: string | null
          risk_level?: string
          runtime_id?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "openclaw_jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_jobs_runtime_id_fkey"
            columns: ["runtime_id"]
            isOneToOne: false
            referencedRelation: "openclaw_runtimes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      openclaw_policies: {
        Row: {
          active: boolean
          allowed_tools: string[]
          created_at: string
          id: string
          max_artifacts: number
          max_concurrent_jobs: number
          max_jobs_per_hour: number
          max_runtime_seconds: number
          network_mode: string
          org_id: string
          policy_name: string
          require_approval_for: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_tools?: string[]
          created_at?: string
          id?: string
          max_artifacts?: number
          max_concurrent_jobs?: number
          max_jobs_per_hour?: number
          max_runtime_seconds?: number
          network_mode?: string
          org_id: string
          policy_name: string
          require_approval_for?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_tools?: string[]
          created_at?: string
          id?: string
          max_artifacts?: number
          max_concurrent_jobs?: number
          max_jobs_per_hour?: number
          max_runtime_seconds?: number
          network_mode?: string
          org_id?: string
          policy_name?: string
          require_approval_for?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "openclaw_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      openclaw_runtimes: {
        Row: {
          base_url: string
          created_at: string
          created_by: string | null
          environment: string
          id: string
          is_default: boolean
          last_healthcheck_at: string | null
          name: string
          org_id: string
          status: string
          tool_profile: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          created_by?: string | null
          environment: string
          id?: string
          is_default?: boolean
          last_healthcheck_at?: string | null
          name: string
          org_id: string
          status?: string
          tool_profile: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          is_default?: boolean
          last_healthcheck_at?: string | null
          name?: string
          org_id?: string
          status?: string
          tool_profile?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "openclaw_runtimes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_runtimes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_runtimes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openclaw_runtimes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_user_id: string | null
          org_id: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_user_id?: string | null
          org_id: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string | null
          org_id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf_url: string | null
          org_id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          seats: number | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          org_id: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          seats?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          org_id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          seats?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_weekly_reports: {
        Row: {
          at_risk_count: number
          at_risk_users: Json
          avg_score: number | null
          completion_rate: number
          created_at: string
          id: string
          inactive_count: number
          org_id: string
          top_gaps: Json
          total_learners: number
          week_start: string
        }
        Insert: {
          at_risk_count?: number
          at_risk_users?: Json
          avg_score?: number | null
          completion_rate?: number
          created_at?: string
          id?: string
          inactive_count?: number
          org_id: string
          top_gaps?: Json
          total_learners?: number
          week_start: string
        }
        Update: {
          at_risk_count?: number
          at_risk_users?: Json
          avg_score?: number | null
          completion_rate?: number
          created_at?: string
          id?: string
          inactive_count?: number
          org_id?: string
          top_gaps?: Json
          total_learners?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_weekly_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_weekly_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
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
          is_read_only: boolean
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
          is_read_only?: boolean
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
          is_read_only?: boolean
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
      partner_accounts: {
        Row: {
          contact_email: string
          created_at: string
          id: string
          name: string
          revshare_percent: number
          status: Database["public"]["Enums"]["partner_account_status"]
          stripe_connect_account_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email: string
          created_at?: string
          id?: string
          name: string
          revshare_percent?: number
          status?: Database["public"]["Enums"]["partner_account_status"]
          stripe_connect_account_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string
          created_at?: string
          id?: string
          name?: string
          revshare_percent?: number
          status?: Database["public"]["Enums"]["partner_account_status"]
          stripe_connect_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_commissions: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          org_id: string | null
          partner_id: string
          status: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          org_id?: string | null
          partner_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          org_id?: string | null
          partner_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
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
      partner_referrals: {
        Row: {
          created_at: string
          id: string
          landing_url_slug: string | null
          partner_id: string
          referral_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          landing_url_slug?: string | null
          partner_id: string
          referral_code: string
        }
        Update: {
          created_at?: string
          id?: string
          landing_url_slug?: string | null
          partner_id?: string
          referral_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phishing_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_quiz_results: {
        Row: {
          answers: Json
          id: string
          scores: Json
          taken_at: string
          total_score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          scores?: Json
          taken_at?: string
          total_score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          scores?: Json
          taken_at?: string
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          ai_tokens_out_max: number
          labs_max: number
          pdf_max: number
          plan: Database["public"]["Enums"]["plan_type"]
          seats_max: number
          tts_seconds_max: number
          updated_at: string
        }
        Insert: {
          ai_tokens_out_max?: number
          labs_max?: number
          pdf_max?: number
          plan: Database["public"]["Enums"]["plan_type"]
          seats_max?: number
          tts_seconds_max?: number
          updated_at?: string
        }
        Update: {
          ai_tokens_out_max?: number
          labs_max?: number
          pdf_max?: number
          plan?: Database["public"]["Enums"]["plan_type"]
          seats_max?: number
          tts_seconds_max?: number
          updated_at?: string
        }
        Relationships: []
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
          last_device_id: string | null
          level: number | null
          onboarding_completed: boolean | null
          org_id: string | null
          panic_uses: number | null
          persona: Database["public"]["Enums"]["persona_type"] | null
          placement_done: boolean
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
          last_device_id?: string | null
          level?: number | null
          onboarding_completed?: boolean | null
          org_id?: string | null
          panic_uses?: number | null
          persona?: Database["public"]["Enums"]["persona_type"] | null
          placement_done?: boolean
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
          last_device_id?: string | null
          level?: number | null
          onboarding_completed?: boolean | null
          org_id?: string | null
          panic_uses?: number | null
          persona?: Database["public"]["Enums"]["persona_type"] | null
          placement_done?: boolean
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
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "org_member_profiles"
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
      proofs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          pdf_url: string | null
          score: number | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          pdf_url?: string | null
          score?: number | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          pdf_url?: string | null
          score?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
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
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_email: string
          referrer_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_email: string
          referrer_id: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string
          referrer_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_leads: {
        Row: {
          company_name: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          industry: string | null
          metadata: Json | null
          notes: string | null
          opportunity_score: number | null
          pain_point: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          metadata?: Json | null
          notes?: string | null
          opportunity_score?: number | null
          pain_point?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          metadata?: Json | null
          notes?: string | null
          opportunity_score?: number | null
          pain_point?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      revenue_opportunities: {
        Row: {
          action_plan: Json | null
          created_at: string | null
          description: string | null
          estimated_value_eur: number | null
          id: string
          market: string | null
          metadata: Json | null
          probability: number | null
          source: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_plan?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_value_eur?: number | null
          id?: string
          market?: string | null
          metadata?: Json | null
          probability?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_plan?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_value_eur?: number | null
          id?: string
          market?: string | null
          metadata?: Json | null
          probability?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skill_graph: {
        Row: {
          category: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_graph_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "skill_graph"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_mastery: {
        Row: {
          id: string
          p_mastery: number
          skill_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          p_mastery?: number
          skill_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          p_mastery?: number
          skill_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_mastery_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      sources_watchlist: {
        Row: {
          created_at: string
          domain: string
          enabled: boolean
          id: string
          last_fetch_at: string | null
          name: string
          persona_tags: string[] | null
          tags: string[] | null
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
          persona_tags?: string[] | null
          tags?: string[] | null
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
          persona_tags?: string[] | null
          tags?: string[] | null
          type?: string
          url?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          level: string
          message: string
          metadata: Json | null
          module: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          module: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          module?: string
          user_id?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          ai_tokens_in: number
          ai_tokens_out: number
          created_at: string
          id: string
          labs_runs: number
          org_id: string | null
          pdf_generated: number
          period_end: string
          period_start: string
          tts_characters: number
          tts_seconds: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_tokens_in?: number
          ai_tokens_out?: number
          created_at?: string
          id?: string
          labs_runs?: number
          org_id?: string | null
          pdf_generated?: number
          period_end: string
          period_start: string
          tts_characters?: number
          tts_seconds?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_tokens_in?: number
          ai_tokens_out?: number
          created_at?: string
          id?: string
          labs_runs?: number
          org_id?: string | null
          pdf_generated?: number
          period_end?: string
          period_start?: string
          tts_characters?: number
          tts_seconds?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          module: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          module?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          module?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_brain_profile: {
        Row: {
          ai_tools_used: string[] | null
          expertise_level: string | null
          interests: string[] | null
          last_analyzed_at: string | null
          learning_style: string | null
          personality: Json | null
          primary_language: string | null
          summary: string | null
          top_skills: string[] | null
          updated_at: string | null
          user_id: string
          work_domain: string | null
        }
        Insert: {
          ai_tools_used?: string[] | null
          expertise_level?: string | null
          interests?: string[] | null
          last_analyzed_at?: string | null
          learning_style?: string | null
          personality?: Json | null
          primary_language?: string | null
          summary?: string | null
          top_skills?: string[] | null
          updated_at?: string | null
          user_id: string
          work_domain?: string | null
        }
        Update: {
          ai_tools_used?: string[] | null
          expertise_level?: string | null
          interests?: string[] | null
          last_analyzed_at?: string | null
          learning_style?: string | null
          personality?: Json | null
          primary_language?: string | null
          summary?: string | null
          top_skills?: string[] | null
          updated_at?: string | null
          user_id?: string
          work_domain?: string | null
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
      user_goals: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: number | null
          progress: number | null
          status: string | null
          target_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skill_levels: {
        Row: {
          id: string
          last_activity_at: string | null
          level: number | null
          skill_id: string
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          id?: string
          last_activity_at?: string | null
          level?: number | null
          skill_id: string
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          id?: string
          last_activity_at?: string | null
          level?: number | null
          skill_id?: string
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_levels_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_graph"
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
            referencedRelation: "org_member_profiles"
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
      org_member_profiles: {
        Row: {
          abuse_blocked_until: string | null
          abuse_score: number | null
          created_at: string | null
          full_name: string | null
          has_completed_welcome: boolean | null
          id: string | null
          last_active_at: string | null
          level: number | null
          onboarding_completed: boolean | null
          org_id: string | null
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
          abuse_score?: number | null
          created_at?: string | null
          full_name?: string | null
          has_completed_welcome?: boolean | null
          id?: string | null
          last_active_at?: string | null
          level?: number | null
          onboarding_completed?: boolean | null
          org_id?: string | null
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
          abuse_score?: number | null
          created_at?: string | null
          full_name?: string | null
          has_completed_welcome?: boolean | null
          id?: string | null
          last_active_at?: string | null
          level?: number | null
          onboarding_completed?: boolean | null
          org_id?: string | null
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
            referencedRelation: "org_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_public_info: {
        Row: {
          created_at: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          plan: Database["public"]["Enums"]["org_plan"] | null
          seats_max: number | null
          seats_used: number | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          plan?: Database["public"]["Enums"]["org_plan"] | null
          seats_max?: number | null
          seats_used?: number | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          plan?: Database["public"]["Enums"]["org_plan"] | null
          seats_max?: number | null
          seats_used?: number | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_org_invitation: {
        Args: { _invitation_id: string; _invited_user_id: string }
        Returns: undefined
      }
      calculate_org_stats: { Args: { _org_id: string }; Returns: Json }
      can_execute: {
        Args: {
          _kind: Database["public"]["Enums"]["usage_kind"]
          _org_id: string
          _user_id: string
        }
        Returns: Json
      }
      check_and_increment_ai_budget: {
        Args: { _cost_delta?: number; _org_id: string }
        Returns: Json
      }
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
      create_org_and_assign_manager: {
        Args: {
          _name: string
          _seats_max?: number
          _slug: string
          _user_id: string
        }
        Returns: Json
      }
      flush_usage_buffer: { Args: never; Returns: Json }
      get_billing_timeseries: {
        Args: { _days?: number; _org_id: string }
        Returns: {
          day: string
          invoice_count: number
          revenue_cents: number
        }[]
      }
      get_brain_events_timeseries: {
        Args: { _days?: number; _org_id: string }
        Returns: {
          cnt: number
          day: string
          event_type: string
        }[]
      }
      get_brain_latency_timeseries: {
        Args: { _hours?: number; _org_id: string }
        Returns: {
          agents_count: number
          event_type: string
          latency_ms: number
          ts: string
        }[]
      }
      get_brain_monitoring: {
        Args: { _hours?: number; _org_id: string }
        Returns: Json
      }
      get_brain_revenue_ops: { Args: { _org_id: string }; Returns: Json }
      get_guided_daily_mission: {
        Args: {
          _level?: number
          _persona?: string
          _top_domain?: string
          _user_id: string
        }
        Returns: Json
      }
      get_my_roles: {
        Args: never
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_next_best_action: { Args: { _user_id: string }; Returns: Json }
      get_openclaw_policy: { Args: { _org_id: string }; Returns: Json }
      get_org_billing_metrics: { Args: { _org_id: string }; Returns: Json }
      get_org_brain_analytics: { Args: { _org_id: string }; Returns: Json }
      get_org_invoices_list: {
        Args: { _limit?: number; _offset?: number; _org_id: string }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          description: string
          hosted_invoice_url: string
          id: string
          invoice_pdf_url: string
          paid_at: string
          period_end: string
          period_start: string
          seats: number
          status: string
          stripe_invoice_id: string
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: {
        Args: { p_date?: string; p_function: string; p_user_id: string }
        Returns: Json
      }
      increment_logging_errors: { Args: never; Returns: undefined }
      increment_marketplace_usage: {
        Args: { _item_id: string }
        Returns: undefined
      }
      increment_usage: {
        Args: {
          _amount?: number
          _kind: Database["public"]["Enums"]["usage_kind"]
          _org_id: string
          _user_id: string
        }
        Returns: Json
      }
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
      log_event: {
        Args: {
          _details?: Json
          _device?: string
          _duration_ms?: number
          _event_type: string
          _resource_id?: string
          _resource_type?: string
          _score?: number
          _session_id?: string
          _user_id: string
        }
        Returns: undefined
      }
      org_attestation_blocked: { Args: { _org_id: string }; Returns: boolean }
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
      resolve_org_invitation: {
        Args: { _email: string }
        Returns: {
          invitation_id: string
          invited_by: string
          org_id: string
        }[]
      }
      resolve_referral: { Args: { _code: string }; Returns: Json }
      search_knowledge_fts: {
        Args: { _limit?: number; _query: string; _user_id: string }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          similarity: number
          title: string
        }[]
      }
      search_knowledge_semantic: {
        Args: { _embedding: string; _limit?: number; _user_id: string }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          similarity: number
          title: string
        }[]
      }
      upsert_genie_brain: {
        Args: {
          _agent_states?: Json
          _knowledge?: Json
          _next_failure?: string
          _nodes?: string[]
          _risk_score?: number
          _user_id: string
        }
        Returns: Json
      }
      upsert_skill_mastery: {
        Args: { _p_mastery: number; _skill_id: string; _user_id: string }
        Returns: Json
      }
      validate_openclaw_job: {
        Args: {
          _job_type: string
          _org_id: string
          _runtime_id: string
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "learner"
      campaign_status: "draft" | "active" | "completed" | "archived"
      chat_role: "user" | "assistant" | "system"
      commission_status: "pending" | "paid" | "failed"
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
      partner_account_status: "active" | "paused"
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
      plan_type: "free" | "launch_59" | "pro" | "business" | "partner"
      preferred_mode_type: "enfant" | "normal" | "expert"
      progress_status: "not_started" | "in_progress" | "completed" | "failed"
      referral_status: "pending" | "completed" | "rewarded"
      usage_kind:
        | "ai_tokens_in"
        | "ai_tokens_out"
        | "tts_characters"
        | "tts_seconds"
        | "pdf_generated"
        | "labs_runs"
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
      commission_status: ["pending", "paid", "failed"],
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
      partner_account_status: ["active", "paused"],
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
      plan_type: ["free", "launch_59", "pro", "business", "partner"],
      preferred_mode_type: ["enfant", "normal", "expert"],
      progress_status: ["not_started", "in_progress", "completed", "failed"],
      referral_status: ["pending", "completed", "rewarded"],
      usage_kind: [
        "ai_tokens_in",
        "ai_tokens_out",
        "tts_characters",
        "tts_seconds",
        "pdf_generated",
        "labs_runs",
      ],
    },
  },
} as const
