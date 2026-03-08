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
      attack_path_steps: {
        Row: {
          attack_path_id: string
          created_at: string
          description: string | null
          edge_id: string | null
          id: string
          metadata: Json | null
          node_id: string
          step_order: number
          technique: string | null
        }
        Insert: {
          attack_path_id: string
          created_at?: string
          description?: string | null
          edge_id?: string | null
          id?: string
          metadata?: Json | null
          node_id: string
          step_order: number
          technique?: string | null
        }
        Update: {
          attack_path_id?: string
          created_at?: string
          description?: string | null
          edge_id?: string | null
          id?: string
          metadata?: Json | null
          node_id?: string
          step_order?: number
          technique?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attack_path_steps_attack_path_id_fkey"
            columns: ["attack_path_id"]
            isOneToOne: false
            referencedRelation: "attack_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_path_steps_edge_id_fkey"
            columns: ["edge_id"]
            isOneToOne: false
            referencedRelation: "security_graph_edges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_path_steps_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "security_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      attack_paths: {
        Row: {
          aws_account_id: string | null
          blast_radius: number
          created_at: string
          description: string | null
          detected_at: string
          entry_point_node_id: string | null
          id: string
          metadata: Json | null
          mitigated_at: string | null
          organization_id: string
          path_length: number
          risk_score: number
          severity: Database["public"]["Enums"]["attack_path_severity"]
          status: Database["public"]["Enums"]["attack_path_status"]
          target_node_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          aws_account_id?: string | null
          blast_radius?: number
          created_at?: string
          description?: string | null
          detected_at?: string
          entry_point_node_id?: string | null
          id?: string
          metadata?: Json | null
          mitigated_at?: string | null
          organization_id: string
          path_length?: number
          risk_score?: number
          severity: Database["public"]["Enums"]["attack_path_severity"]
          status?: Database["public"]["Enums"]["attack_path_status"]
          target_node_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          aws_account_id?: string | null
          blast_radius?: number
          created_at?: string
          description?: string | null
          detected_at?: string
          entry_point_node_id?: string | null
          id?: string
          metadata?: Json | null
          mitigated_at?: string | null
          organization_id?: string
          path_length?: number
          risk_score?: number
          severity?: Database["public"]["Enums"]["attack_path_severity"]
          status?: Database["public"]["Enums"]["attack_path_status"]
          target_node_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attack_paths_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_paths_entry_point_node_id_fkey"
            columns: ["entry_point_node_id"]
            isOneToOne: false
            referencedRelation: "security_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_paths_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attack_paths_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "security_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cloud_accounts: {
        Row: {
          account_identifier: string
          account_name: string
          created_at: string
          credentials_encrypted: Json
          id: string
          last_scan_at: string | null
          metadata: Json | null
          organization_id: string
          provider: Database["public"]["Enums"]["cloud_provider"]
          risk_score: number | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          account_identifier: string
          account_name: string
          created_at?: string
          credentials_encrypted?: Json
          id?: string
          last_scan_at?: string | null
          metadata?: Json | null
          organization_id: string
          provider: Database["public"]["Enums"]["cloud_provider"]
          risk_score?: number | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          account_identifier?: string
          account_name?: string
          created_at?: string
          credentials_encrypted?: Json
          id?: string
          last_scan_at?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: Database["public"]["Enums"]["cloud_provider"]
          risk_score?: number | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_accounts_organization_id_fkey"
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
          generic_cloud_account_id: string | null
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
          generic_cloud_account_id?: string | null
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
          generic_cloud_account_id?: string | null
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
            foreignKeyName: "cloud_assets_generic_cloud_account_id_fkey"
            columns: ["generic_cloud_account_id"]
            isOneToOne: false
            referencedRelation: "cloud_accounts"
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
      policy_enforcement_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string
          enforcement_mode: Database["public"]["Enums"]["enforcement_mode"]
          execution_details: Json | null
          id: string
          initiated_by: string | null
          organization_id: string
          policy_id: string
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["enforcement_action_status"]
          violation_id: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string
          enforcement_mode: Database["public"]["Enums"]["enforcement_mode"]
          execution_details?: Json | null
          id?: string
          initiated_by?: string | null
          organization_id: string
          policy_id: string
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enforcement_action_status"]
          violation_id: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string
          enforcement_mode?: Database["public"]["Enums"]["enforcement_mode"]
          execution_details?: Json | null
          id?: string
          initiated_by?: string | null
          organization_id?: string
          policy_id?: string
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enforcement_action_status"]
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_enforcement_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_enforcement_actions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "security_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_enforcement_actions_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "policy_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_violations: {
        Row: {
          aws_account_id: string | null
          created_at: string
          detected_at: string
          id: string
          organization_id: string
          policy_id: string
          region: string | null
          resolved_at: string | null
          resource_arn: string | null
          resource_id: string
          resource_name: string | null
          resource_type: string
          severity: string
          status: Database["public"]["Enums"]["violation_status"]
          updated_at: string
          violation_details: Json | null
        }
        Insert: {
          aws_account_id?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          organization_id: string
          policy_id: string
          region?: string | null
          resolved_at?: string | null
          resource_arn?: string | null
          resource_id: string
          resource_name?: string | null
          resource_type: string
          severity?: string
          status?: Database["public"]["Enums"]["violation_status"]
          updated_at?: string
          violation_details?: Json | null
        }
        Update: {
          aws_account_id?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          organization_id?: string
          policy_id?: string
          region?: string | null
          resolved_at?: string | null
          resource_arn?: string | null
          resource_id?: string
          resource_name?: string | null
          resource_type?: string
          severity?: string
          status?: Database["public"]["Enums"]["violation_status"]
          updated_at?: string
          violation_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_violations_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_violations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "security_policies"
            referencedColumns: ["id"]
          },
        ]
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
      remediation_actions: {
        Row: {
          action_type: string
          attack_path_id: string | null
          aws_account_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          execution_plan: Json | null
          finding_id: string | null
          id: string
          initiated_by: string | null
          mode: Database["public"]["Enums"]["remediation_mode"]
          organization_id: string
          priority: number | null
          result: Json | null
          rollback_plan: Json | null
          status: Database["public"]["Enums"]["remediation_status"]
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          attack_path_id?: string | null
          aws_account_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          execution_plan?: Json | null
          finding_id?: string | null
          id?: string
          initiated_by?: string | null
          mode?: Database["public"]["Enums"]["remediation_mode"]
          organization_id: string
          priority?: number | null
          result?: Json | null
          rollback_plan?: Json | null
          status?: Database["public"]["Enums"]["remediation_status"]
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          attack_path_id?: string | null
          aws_account_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          execution_plan?: Json | null
          finding_id?: string | null
          id?: string
          initiated_by?: string | null
          mode?: Database["public"]["Enums"]["remediation_mode"]
          organization_id?: string
          priority?: number | null
          result?: Json | null
          rollback_plan?: Json | null
          status?: Database["public"]["Enums"]["remediation_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_actions_attack_path_id_fkey"
            columns: ["attack_path_id"]
            isOneToOne: false
            referencedRelation: "attack_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_actions_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_actions_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "security_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_actions_organization_id_fkey"
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
      security_graph_edges: {
        Row: {
          created_at: string
          edge_type: Database["public"]["Enums"]["graph_edge_type"]
          id: string
          is_risky: boolean
          metadata: Json | null
          organization_id: string
          source_node_id: string
          target_node_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          edge_type: Database["public"]["Enums"]["graph_edge_type"]
          id?: string
          is_risky?: boolean
          metadata?: Json | null
          organization_id: string
          source_node_id: string
          target_node_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          edge_type?: Database["public"]["Enums"]["graph_edge_type"]
          id?: string
          is_risky?: boolean
          metadata?: Json | null
          organization_id?: string
          source_node_id?: string
          target_node_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "security_graph_edges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_graph_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "security_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_graph_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "security_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      security_graph_nodes: {
        Row: {
          aws_account_id: string | null
          created_at: string
          id: string
          is_public: boolean
          is_sensitive: boolean
          metadata: Json | null
          node_type: Database["public"]["Enums"]["graph_node_type"]
          organization_id: string
          provider: string
          region: string | null
          resource_arn: string | null
          resource_id: string
          resource_name: string | null
          risk_score: number | null
          updated_at: string
        }
        Insert: {
          aws_account_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          is_sensitive?: boolean
          metadata?: Json | null
          node_type: Database["public"]["Enums"]["graph_node_type"]
          organization_id: string
          provider?: string
          region?: string | null
          resource_arn?: string | null
          resource_id: string
          resource_name?: string | null
          risk_score?: number | null
          updated_at?: string
        }
        Update: {
          aws_account_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          is_sensitive?: boolean
          metadata?: Json | null
          node_type?: Database["public"]["Enums"]["graph_node_type"]
          organization_id?: string
          provider?: string
          region?: string | null
          resource_arn?: string | null
          resource_id?: string
          resource_name?: string | null
          risk_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_graph_nodes_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_graph_nodes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_policies: {
        Row: {
          asset_filter: Json | null
          aws_account_id: string | null
          created_at: string
          description: string | null
          enforcement_mode: Database["public"]["Enums"]["enforcement_mode"]
          evaluation_criteria: Json | null
          id: string
          is_enabled: boolean
          name: string
          organization_id: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          remediation_template: Json | null
          scope: Database["public"]["Enums"]["policy_scope"]
          severity: string
          updated_at: string
        }
        Insert: {
          asset_filter?: Json | null
          aws_account_id?: string | null
          created_at?: string
          description?: string | null
          enforcement_mode?: Database["public"]["Enums"]["enforcement_mode"]
          evaluation_criteria?: Json | null
          id?: string
          is_enabled?: boolean
          name: string
          organization_id: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          remediation_template?: Json | null
          scope?: Database["public"]["Enums"]["policy_scope"]
          severity?: string
          updated_at?: string
        }
        Update: {
          asset_filter?: Json | null
          aws_account_id?: string | null
          created_at?: string
          description?: string | null
          enforcement_mode?: Database["public"]["Enums"]["enforcement_mode"]
          evaluation_criteria?: Json | null
          id?: string
          is_enabled?: boolean
          name?: string
          organization_id?: string
          policy_type?: Database["public"]["Enums"]["policy_type"]
          remediation_template?: Json | null
          scope?: Database["public"]["Enums"]["policy_scope"]
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_policies_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      attack_path_severity: "critical" | "high" | "medium" | "low"
      attack_path_status: "active" | "mitigated" | "accepted" | "false_positive"
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
      enforcement_action_status:
        | "pending"
        | "executing"
        | "completed"
        | "failed"
        | "rolled_back"
      enforcement_mode: "advisory" | "autopilot"
      finding_severity: "critical" | "high" | "medium" | "low" | "info"
      graph_edge_type:
        | "has_permission"
        | "can_assume_role"
        | "trusts"
        | "network_access"
        | "attached_to"
        | "member_of"
        | "exposes"
        | "encrypts"
        | "routes_to"
        | "contains"
      graph_node_type:
        | "iam_user"
        | "iam_role"
        | "iam_group"
        | "iam_policy"
        | "ec2_instance"
        | "s3_bucket"
        | "rds_instance"
        | "security_group"
        | "vpc"
        | "subnet"
        | "lambda_function"
        | "ecs_cluster"
        | "eks_cluster"
        | "internet_gateway"
        | "nat_gateway"
        | "load_balancer"
        | "kms_key"
        | "secrets_manager"
        | "external_internet"
      policy_scope: "global" | "account" | "asset"
      policy_type:
        | "no_public_storage"
        | "admin_mfa_required"
        | "encryption_required"
        | "backup_required"
        | "no_open_ssh"
        | "no_public_databases"
        | "logging_required"
        | "credential_rotation"
        | "custom"
      remediation_mode: "read_only" | "write"
      remediation_status:
        | "recommended"
        | "approved"
        | "in_progress"
        | "completed"
        | "failed"
        | "rolled_back"
        | "skipped"
      scan_status: "pending" | "running" | "completed" | "failed"
      violation_status:
        | "open"
        | "remediating"
        | "resolved"
        | "accepted"
        | "suppressed"
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
      attack_path_severity: ["critical", "high", "medium", "low"],
      attack_path_status: ["active", "mitigated", "accepted", "false_positive"],
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
      enforcement_action_status: [
        "pending",
        "executing",
        "completed",
        "failed",
        "rolled_back",
      ],
      enforcement_mode: ["advisory", "autopilot"],
      finding_severity: ["critical", "high", "medium", "low", "info"],
      graph_edge_type: [
        "has_permission",
        "can_assume_role",
        "trusts",
        "network_access",
        "attached_to",
        "member_of",
        "exposes",
        "encrypts",
        "routes_to",
        "contains",
      ],
      graph_node_type: [
        "iam_user",
        "iam_role",
        "iam_group",
        "iam_policy",
        "ec2_instance",
        "s3_bucket",
        "rds_instance",
        "security_group",
        "vpc",
        "subnet",
        "lambda_function",
        "ecs_cluster",
        "eks_cluster",
        "internet_gateway",
        "nat_gateway",
        "load_balancer",
        "kms_key",
        "secrets_manager",
        "external_internet",
      ],
      policy_scope: ["global", "account", "asset"],
      policy_type: [
        "no_public_storage",
        "admin_mfa_required",
        "encryption_required",
        "backup_required",
        "no_open_ssh",
        "no_public_databases",
        "logging_required",
        "credential_rotation",
        "custom",
      ],
      remediation_mode: ["read_only", "write"],
      remediation_status: [
        "recommended",
        "approved",
        "in_progress",
        "completed",
        "failed",
        "rolled_back",
        "skipped",
      ],
      scan_status: ["pending", "running", "completed", "failed"],
      violation_status: [
        "open",
        "remediating",
        "resolved",
        "accepted",
        "suppressed",
      ],
    },
  },
} as const
