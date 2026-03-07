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
      aws_accounts: {
        Row: {
          account_alias: string | null
          account_id: string
          created_at: string
          external_id: string
          id: string
          last_scan_at: string | null
          organization_id: string
          risk_score: number | null
          role_arn: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          write_access_enabled: boolean
        }
        Insert: {
          account_alias?: string | null
          account_id: string
          created_at?: string
          external_id?: string
          id?: string
          last_scan_at?: string | null
          organization_id: string
          risk_score?: number | null
          role_arn?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          write_access_enabled?: boolean
        }
        Update: {
          account_alias?: string | null
          account_id?: string
          created_at?: string
          external_id?: string
          id?: string
          last_scan_at?: string | null
          organization_id?: string
          risk_score?: number | null
          role_arn?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          write_access_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "aws_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_assets: {
        Row: {
          cloud_account_id: string | null
          created_at: string
          id: string
          last_seen_at: string | null
          metadata: Json | null
          organization_id: string
          provider: Database["public"]["Enums"]["cloud_provider"]
          region: string | null
          resource_id: string
          resource_name: string | null
          resource_type: Database["public"]["Enums"]["cloud_resource_type"]
          risk_score: number | null
          status: Database["public"]["Enums"]["asset_status"]
          tags: Json | null
          updated_at: string
        }
        Insert: {
          cloud_account_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          organization_id: string
          provider: Database["public"]["Enums"]["cloud_provider"]
          region?: string | null
          resource_id: string
          resource_name?: string | null
          resource_type?: Database["public"]["Enums"]["cloud_resource_type"]
          risk_score?: number | null
          status?: Database["public"]["Enums"]["asset_status"]
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          cloud_account_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: Database["public"]["Enums"]["cloud_provider"]
          region?: string | null
          resource_id?: string
          resource_name?: string | null
          resource_type?: Database["public"]["Enums"]["cloud_resource_type"]
          risk_score?: number | null
          status?: Database["public"]["Enums"]["asset_status"]
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_assets_cloud_account_id_fkey"
            columns: ["cloud_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          language: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          language?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_score_history: {
        Row: {
          aws_account_id: string
          created_at: string
          id: string
          recorded_at: string
          score: number
        }
        Insert: {
          aws_account_id: string
          created_at?: string
          id?: string
          recorded_at?: string
          score: number
        }
        Update: {
          aws_account_id?: string
          created_at?: string
          id?: string
          recorded_at?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_score_history_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_jobs: {
        Row: {
          aws_account_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          findings_count: number | null
          id: string
          risk_score: number | null
          services_scanned: Database["public"]["Enums"]["aws_service"][] | null
          started_at: string | null
          status: Database["public"]["Enums"]["scan_status"]
        }
        Insert: {
          aws_account_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          findings_count?: number | null
          id?: string
          risk_score?: number | null
          services_scanned?: Database["public"]["Enums"]["aws_service"][] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scan_status"]
        }
        Update: {
          aws_account_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          findings_count?: number | null
          id?: string
          risk_score?: number | null
          services_scanned?: Database["public"]["Enums"]["aws_service"][] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scan_status"]
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_findings: {
        Row: {
          aws_account_id: string
          cloudformation_template: string | null
          compliance_tags: string[] | null
          created_at: string
          description: string | null
          execution_tag: string | null
          id: string
          impact_assessment: string | null
          is_resolved: boolean | null
          remediation_steps: string[] | null
          resolved_at: string | null
          resource_id: string
          resource_type: string
          risk_score_contribution: number | null
          rollback_guidance: string | null
          scan_job_id: string
          service: Database["public"]["Enums"]["aws_service"]
          severity: Database["public"]["Enums"]["finding_severity"]
          title: string
        }
        Insert: {
          aws_account_id: string
          cloudformation_template?: string | null
          compliance_tags?: string[] | null
          created_at?: string
          description?: string | null
          execution_tag?: string | null
          id?: string
          impact_assessment?: string | null
          is_resolved?: boolean | null
          remediation_steps?: string[] | null
          resolved_at?: string | null
          resource_id: string
          resource_type: string
          risk_score_contribution?: number | null
          rollback_guidance?: string | null
          scan_job_id: string
          service: Database["public"]["Enums"]["aws_service"]
          severity: Database["public"]["Enums"]["finding_severity"]
          title: string
        }
        Update: {
          aws_account_id?: string
          cloudformation_template?: string | null
          compliance_tags?: string[] | null
          created_at?: string
          description?: string | null
          execution_tag?: string | null
          id?: string
          impact_assessment?: string | null
          is_resolved?: boolean | null
          remediation_steps?: string[] | null
          resolved_at?: string | null
          resource_id?: string
          resource_type?: string
          risk_score_contribution?: number | null
          rollback_guidance?: string | null
          scan_job_id?: string
          service?: Database["public"]["Enums"]["aws_service"]
          severity?: Database["public"]["Enums"]["finding_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_findings_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_findings_scan_job_id_fkey"
            columns: ["scan_job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: never; Returns: string }
    }
    Enums: {
      account_status: "pending" | "connected" | "disconnected" | "error"
      asset_status: "active" | "inactive" | "unknown" | "deleted"
      aws_service:
        | "security_groups"
        | "iam"
        | "s3"
        | "ec2"
        | "rds"
        | "vpc"
        | "cost"
      cloud_provider: "aws" | "azure" | "gcp"
      cloud_resource_type:
        | "compute"
        | "container"
        | "serverless"
        | "storage"
        | "database"
        | "identity"
        | "networking"
        | "security"
        | "other"
      finding_severity: "critical" | "high" | "medium" | "low" | "info"
      scan_status: "pending" | "running" | "completed" | "failed"
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
      account_status: ["pending", "connected", "disconnected", "error"],
      asset_status: ["active", "inactive", "unknown", "deleted"],
      aws_service: [
        "security_groups",
        "iam",
        "s3",
        "ec2",
        "rds",
        "vpc",
        "cost",
      ],
      cloud_provider: ["aws", "azure", "gcp"],
      cloud_resource_type: [
        "compute",
        "container",
        "serverless",
        "storage",
        "database",
        "identity",
        "networking",
        "security",
        "other",
      ],
      finding_severity: ["critical", "high", "medium", "low", "info"],
      scan_status: ["pending", "running", "completed", "failed"],
    },
  },
} as const
