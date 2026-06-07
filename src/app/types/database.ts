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
      about_content: {
        Row: {
          body: string | null
          id: string
          image_url: string | null
          key: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          id?: string
          image_url?: string | null
          key: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          id?: string
          image_url?: string | null
          key?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          entity: string
          entity_id: string | null
          id: string
          user_email: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
        }
        Relationships: []
      }
      allergen_matrix: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          celery: string | null
          compliance_standard: string | null
          created_at: string | null
          created_by: string | null
          crustacean: string | null
          declared: boolean | null
          effective_date: string | null
          eggs: string | null
          fish: string | null
          gluten: string | null
          id: string
          lupin: string | null
          milk: string | null
          molluscs: string | null
          mustard: string | null
          nuts: string | null
          org_id: string | null
          peanuts: string | null
          product_name: string
          sesame: string | null
          soy: string | null
          sulphites: string | null
          superseded_by: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          celery?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          crustacean?: string | null
          declared?: boolean | null
          effective_date?: string | null
          eggs?: string | null
          fish?: string | null
          gluten?: string | null
          id?: string
          lupin?: string | null
          milk?: string | null
          molluscs?: string | null
          mustard?: string | null
          nuts?: string | null
          org_id?: string | null
          peanuts?: string | null
          product_name: string
          sesame?: string | null
          soy?: string | null
          sulphites?: string | null
          superseded_by?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          celery?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          crustacean?: string | null
          declared?: boolean | null
          effective_date?: string | null
          eggs?: string | null
          fish?: string | null
          gluten?: string | null
          id?: string
          lupin?: string | null
          milk?: string | null
          molluscs?: string | null
          mustard?: string | null
          nuts?: string | null
          org_id?: string | null
          peanuts?: string | null
          product_name?: string
          sesame?: string | null
          soy?: string | null
          sulphites?: string | null
          superseded_by?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "allergen_matrix_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "allergen_matrix_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "allergen_matrix_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "allergen_matrix_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_matrix_history: {
        Row: {
          change_reason: string | null
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          matrix_id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
          version: number
        }
        Insert: {
          change_reason?: string | null
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          matrix_id: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          version: number
        }
        Update: {
          change_reason?: string | null
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          matrix_id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "allergen_matrix_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "allergen_matrix_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_matrix_history_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "allergen_matrix"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          module: string | null
          record_id: string | null
          record_label: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_id?: string | null
          record_label?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_id?: string | null
          record_label?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      batch_hours: {
        Row: {
          batch_id: string | null
          cost_center_id: string | null
          created_at: string | null
          hours_used: number | null
          id: string
          labor_hours: number | null
          machine_hours: number | null
          org_id: string | null
          start_time: string | null
        }
        Insert: {
          batch_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          hours_used?: number | null
          id?: string
          labor_hours?: number | null
          machine_hours?: number | null
          org_id?: string | null
          start_time?: string | null
        }
        Update: {
          batch_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          hours_used?: number | null
          id?: string
          labor_hours?: number | null
          machine_hours?: number | null
          org_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_costing_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cogs_actual"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "utility_allocation_per_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_hours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          actual_qty: number | null
          actual_rm_cost: number | null
          actual_yield: number | null
          batch_no: string
          coa_no: string | null
          comp_notes: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          dynamic_params: Json | null
          end_time: string | null
          fat_melting_temp: number | null
          id: string
          labour: number | null
          line: string | null
          line_operator: string | null
          mixing_temp: number | null
          notes: string | null
          operator: string | null
          org_id: string | null
          overhead: number | null
          pasteurization_temp: number | null
          planned_qty: number
          product: string
          production_floor: string | null
          qc_passed: boolean | null
          qc_remarks: string | null
          qc_verdict: string | null
          recipe_id: string | null
          recipe_name: string | null
          reject_qty: number | null
          start_time: string | null
          status: string | null
          target_fat_melting_temp: number | null
          target_mixing_temp: number | null
          target_pasteurization_temp: number | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
          yield_pct: number | null
        }
        Insert: {
          actual_qty?: number | null
          actual_rm_cost?: number | null
          actual_yield?: number | null
          batch_no: string
          coa_no?: string | null
          comp_notes?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          dynamic_params?: Json | null
          end_time?: string | null
          fat_melting_temp?: number | null
          id?: string
          labour?: number | null
          line?: string | null
          line_operator?: string | null
          mixing_temp?: number | null
          notes?: string | null
          operator?: string | null
          org_id?: string | null
          overhead?: number | null
          pasteurization_temp?: number | null
          planned_qty: number
          product: string
          production_floor?: string | null
          qc_passed?: boolean | null
          qc_remarks?: string | null
          qc_verdict?: string | null
          recipe_id?: string | null
          recipe_name?: string | null
          reject_qty?: number | null
          start_time?: string | null
          status?: string | null
          target_fat_melting_temp?: number | null
          target_mixing_temp?: number | null
          target_pasteurization_temp?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          yield_pct?: number | null
        }
        Update: {
          actual_qty?: number | null
          actual_rm_cost?: number | null
          actual_yield?: number | null
          batch_no?: string
          coa_no?: string | null
          comp_notes?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          dynamic_params?: Json | null
          end_time?: string | null
          fat_melting_temp?: number | null
          id?: string
          labour?: number | null
          line?: string | null
          line_operator?: string | null
          mixing_temp?: number | null
          notes?: string | null
          operator?: string | null
          org_id?: string | null
          overhead?: number | null
          pasteurization_temp?: number | null
          planned_qty?: number
          product?: string
          production_floor?: string | null
          qc_passed?: boolean | null
          qc_remarks?: string | null
          qc_verdict?: string | null
          recipe_id?: string | null
          recipe_name?: string | null
          reject_qty?: number | null
          start_time?: string | null
          status?: string | null
          target_fat_melting_temp?: number | null
          target_mixing_temp?: number | null
          target_pasteurization_temp?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          yield_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "batches_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          category: string
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          seo_desc: string | null
          seo_title: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          seo_desc?: string | null
          seo_title?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          seo_desc?: string | null
          seo_title?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_lots: {
        Row: {
          batch_id: string
          created_at: string | null
          id: string
          location_id: string | null
          product_id: string
          qty_available: number
          qty_produced: number
          status: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          id: string
          location_id?: string | null
          product_id: string
          qty_available: number
          qty_produced: number
          status?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          product_id?: string
          qty_available?: number
          qty_produced?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      capa_history: {
        Row: {
          capa_id: string
          change_reason: string
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
        }
        Insert: {
          capa_id: string
          change_reason: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
        }
        Update: {
          capa_id?: string
          change_reason?: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capa_history_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "capas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "capa_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
      capas: {
        Row: {
          capa_no: string
          closed_at: string | null
          closed_by: string | null
          corrective_action: string | null
          created_at: string | null
          description: string
          id: string
          initiated_at: string | null
          initiated_by: string | null
          org_id: string | null
          owner: string | null
          preventive_action: string | null
          rca_method: string | null
          rca_text: string | null
          root_cause_analysis: Json | null
          source: string
          source_id: string | null
          source_type: string | null
          status: string | null
          target_date: string
          verification_note: string | null
        }
        Insert: {
          capa_no: string
          closed_at?: string | null
          closed_by?: string | null
          corrective_action?: string | null
          created_at?: string | null
          description: string
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          org_id?: string | null
          owner?: string | null
          preventive_action?: string | null
          rca_method?: string | null
          rca_text?: string | null
          root_cause_analysis?: Json | null
          source: string
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          target_date: string
          verification_note?: string | null
        }
        Update: {
          capa_no?: string
          closed_at?: string | null
          closed_by?: string | null
          corrective_action?: string | null
          created_at?: string | null
          description?: string
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          org_id?: string | null
          owner?: string | null
          preventive_action?: string | null
          rca_method?: string | null
          rca_text?: string | null
          root_cause_analysis?: Json | null
          source?: string
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          target_date?: string
          verification_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capas_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capas_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "capas_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          visible: boolean
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          visible?: boolean
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          visible?: boolean
        }
        Relationships: []
      }
      ccp_live_log: {
        Row: {
          ccp_id: string
          deviation_detected: boolean | null
          equipment_id: string
          id: string
          logged_at: string | null
          logged_by: string | null
          reading: number
        }
        Insert: {
          ccp_id: string
          deviation_detected?: boolean | null
          equipment_id: string
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          reading: number
        }
        Update: {
          ccp_id?: string
          deviation_detected?: boolean | null
          equipment_id?: string
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          reading?: number
        }
        Relationships: [
          {
            foreignKeyName: "ccp_live_log_ccp_id_fkey"
            columns: ["ccp_id"]
            isOneToOne: false
            referencedRelation: "recipe_fsms_ccp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ccp_live_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ccp_live_log_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ccp_live_log_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ccp_live_log_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
      ccp_logs: {
        Row: {
          batch_no: string | null
          ccp_id: string
          ccp_name: string
          checked_by: string | null
          corrective_action: string | null
          created_at: string | null
          critical_limit: string | null
          id: string
          reading: number
          remarks: string | null
          result: string
          unit: string | null
        }
        Insert: {
          batch_no?: string | null
          ccp_id: string
          ccp_name: string
          checked_by?: string | null
          corrective_action?: string | null
          created_at?: string | null
          critical_limit?: string | null
          id?: string
          reading: number
          remarks?: string | null
          result: string
          unit?: string | null
        }
        Update: {
          batch_no?: string | null
          ccp_id?: string
          ccp_name?: string
          checked_by?: string | null
          corrective_action?: string | null
          created_at?: string | null
          critical_limit?: string | null
          id?: string
          reading?: number
          remarks?: string | null
          result?: string
          unit?: string | null
        }
        Relationships: []
      }
      consumed_lots: {
        Row: {
          batch_id: string | null
          batch_no: string
          cost: number | null
          created_at: string | null
          id: string
          lot_id: string | null
          lot_no: string | null
          material: string
          qty_consumed: number
          rate: number | null
        }
        Insert: {
          batch_id?: string | null
          batch_no: string
          cost?: number | null
          created_at?: string | null
          id?: string
          lot_id?: string | null
          lot_no?: string | null
          material: string
          qty_consumed: number
          rate?: number | null
        }
        Update: {
          batch_id?: string | null
          batch_no?: string
          cost?: number | null
          created_at?: string | null
          id?: string
          lot_id?: string | null
          lot_no?: string | null
          material?: string
          qty_consumed?: number
          rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consumed_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_costing_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumed_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumed_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cogs_actual"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumed_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "utility_allocation_per_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "consumed_lots_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string | null
          id: string
          name: string
          org_id: string | null
        }
        Insert: {
          code?: string | null
          id?: string
          name: string
          org_id?: string | null
        }
        Update: {
          code?: string | null
          id?: string
          name?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_complaints: {
        Row: {
          batch_no: string | null
          complaint_date: string
          corrective_action: string | null
          created_at: string | null
          customer_name: string
          id: string
          issue_description: string
          logged_by: string | null
          product_name: string | null
          ref_no: string
          severity: string
          status: string
        }
        Insert: {
          batch_no?: string | null
          complaint_date?: string
          corrective_action?: string | null
          created_at?: string | null
          customer_name: string
          id?: string
          issue_description: string
          logged_by?: string | null
          product_name?: string | null
          ref_no: string
          severity?: string
          status?: string
        }
        Update: {
          batch_no?: string | null
          complaint_date?: string
          corrective_action?: string | null
          created_at?: string | null
          customer_name?: string
          id?: string
          issue_description?: string
          logged_by?: string | null
          product_name?: string | null
          ref_no?: string
          severity?: string
          status?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          actual_output: number
          created_at: string
          downtime_mins: number
          downtime_reason: string | null
          id: string
          log_date: string
          observations: string | null
          operator: string
          output_unit: string
          planned_output: number
          power_kwh: number | null
          qc_checks_done: number
          qc_issues: string | null
          reject_qty: number
          safety_incidents: number
          shift: string
          supervisor: string | null
          water_kl: number | null
          work_center: string
        }
        Insert: {
          actual_output?: number
          created_at?: string
          downtime_mins?: number
          downtime_reason?: string | null
          id?: string
          log_date: string
          observations?: string | null
          operator: string
          output_unit?: string
          planned_output?: number
          power_kwh?: number | null
          qc_checks_done?: number
          qc_issues?: string | null
          reject_qty?: number
          safety_incidents?: number
          shift: string
          supervisor?: string | null
          water_kl?: number | null
          work_center: string
        }
        Update: {
          actual_output?: number
          created_at?: string
          downtime_mins?: number
          downtime_reason?: string | null
          id?: string
          log_date?: string
          observations?: string | null
          operator?: string
          output_unit?: string
          planned_output?: number
          power_kwh?: number | null
          qc_checks_done?: number
          qc_issues?: string | null
          reject_qty?: number
          safety_incidents?: number
          shift?: string
          supervisor?: string | null
          water_kl?: number | null
          work_center?: string
        }
        Relationships: []
      }
      dispatches: {
        Row: {
          approved_at: string | null
          batch_no: string | null
          checker_id: string | null
          created_at: string | null
          created_by: string | null
          customer: string
          dispatched_at: string | null
          do_no: string
          gst_amt: number | null
          gst_pct: number | null
          id: string
          lr_no: string | null
          maker_checker_status: string | null
          maker_id: string | null
          notes: string | null
          product: string
          qty: number
          rate: number
          rejection_reason: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          transporter: string | null
          unit: string | null
          vehicle_no: string | null
        }
        Insert: {
          approved_at?: string | null
          batch_no?: string | null
          checker_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer: string
          dispatched_at?: string | null
          do_no: string
          gst_amt?: number | null
          gst_pct?: number | null
          id?: string
          lr_no?: string | null
          maker_checker_status?: string | null
          maker_id?: string | null
          notes?: string | null
          product: string
          qty: number
          rate: number
          rejection_reason?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          transporter?: string | null
          unit?: string | null
          vehicle_no?: string | null
        }
        Update: {
          approved_at?: string | null
          batch_no?: string | null
          checker_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer?: string
          dispatched_at?: string | null
          do_no?: string
          gst_amt?: number | null
          gst_pct?: number | null
          id?: string
          lr_no?: string | null
          maker_checker_status?: string | null
          maker_id?: string | null
          notes?: string | null
          product?: string
          qty?: number
          rate?: number
          rejection_reason?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          transporter?: string | null
          unit?: string | null
          vehicle_no?: string | null
        }
        Relationships: []
      }
      dms_access_logs: {
        Row: {
          action: string
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dms_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_companies: {
        Row: {
          addr1: string | null
          addr2: string | null
          color1: string | null
          color2: string | null
          created_at: string | null
          default_designation: string | null
          default_signatory: string | null
          email: string | null
          footer_text: string | null
          gst: string | null
          id: string
          logo: string | null
          name: string
          phone: string | null
          prefix: string | null
          qr_on: boolean | null
          signature: string | null
          verify_url: string | null
          watermark_on: boolean | null
          watermark_text: string | null
          website: string | null
          year: string | null
        }
        Insert: {
          addr1?: string | null
          addr2?: string | null
          color1?: string | null
          color2?: string | null
          created_at?: string | null
          default_designation?: string | null
          default_signatory?: string | null
          email?: string | null
          footer_text?: string | null
          gst?: string | null
          id: string
          logo?: string | null
          name: string
          phone?: string | null
          prefix?: string | null
          qr_on?: boolean | null
          signature?: string | null
          verify_url?: string | null
          watermark_on?: boolean | null
          watermark_text?: string | null
          website?: string | null
          year?: string | null
        }
        Update: {
          addr1?: string | null
          addr2?: string | null
          color1?: string | null
          color2?: string | null
          created_at?: string | null
          default_designation?: string | null
          default_signatory?: string | null
          email?: string | null
          footer_text?: string | null
          gst?: string | null
          id?: string
          logo?: string | null
          name?: string
          phone?: string | null
          prefix?: string | null
          qr_on?: boolean | null
          signature?: string | null
          verify_url?: string | null
          watermark_on?: boolean | null
          watermark_text?: string | null
          website?: string | null
          year?: string | null
        }
        Relationships: []
      }
      dms_links: {
        Row: {
          created_at: string | null
          document_id: string | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dms_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          closing: string | null
          co_id: string | null
          content: string | null
          created_at: string | null
          date: string | null
          designation: string | null
          id: string
          issued_by: string | null
          parent_id: string | null
          priority: string | null
          ref_no: string | null
          salutation: string | null
          status: string | null
          subject: string | null
          to_address: string | null
          to_city: string | null
          to_company: string | null
          to_name: string | null
          type: string | null
          type_code: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          closing?: string | null
          co_id?: string | null
          content?: string | null
          created_at?: string | null
          date?: string | null
          designation?: string | null
          id: string
          issued_by?: string | null
          parent_id?: string | null
          priority?: string | null
          ref_no?: string | null
          salutation?: string | null
          status?: string | null
          subject?: string | null
          to_address?: string | null
          to_city?: string | null
          to_company?: string | null
          to_name?: string | null
          type?: string | null
          type_code?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          closing?: string | null
          co_id?: string | null
          content?: string | null
          created_at?: string | null
          date?: string | null
          designation?: string | null
          id?: string
          issued_by?: string | null
          parent_id?: string | null
          priority?: string | null
          ref_no?: string | null
          salutation?: string | null
          status?: string | null
          subject?: string | null
          to_address?: string | null
          to_city?: string | null
          to_company?: string | null
          to_name?: string | null
          type?: string | null
          type_code?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          asset_code: string
          calibration_cert_url: string | null
          calibration_frequency_days: number | null
          capacity: number | null
          capacity_unit: string | null
          category: string
          created_at: string
          equipment_code: string | null
          equipment_type: string | null
          id: string
          installation_date: string | null
          last_calibrated: string | null
          last_calibration_date: string | null
          last_maintenance: string | null
          last_maintenance_date: string | null
          maintenance_freq_days: number | null
          make: string | null
          make_model: string | null
          model: string | null
          name: string
          next_calibration_due: string | null
          next_maintenance: string | null
          next_maintenance_due: string | null
          notes: string | null
          org_id: string | null
          purchase_date: string | null
          serial_no: string | null
          status: string
          type: string | null
          work_center: string | null
          work_center_id: string | null
        }
        Insert: {
          asset_code: string
          calibration_cert_url?: string | null
          calibration_frequency_days?: number | null
          capacity?: number | null
          capacity_unit?: string | null
          category?: string
          created_at?: string
          equipment_code?: string | null
          equipment_type?: string | null
          id?: string
          installation_date?: string | null
          last_calibrated?: string | null
          last_calibration_date?: string | null
          last_maintenance?: string | null
          last_maintenance_date?: string | null
          maintenance_freq_days?: number | null
          make?: string | null
          make_model?: string | null
          model?: string | null
          name: string
          next_calibration_due?: string | null
          next_maintenance?: string | null
          next_maintenance_due?: string | null
          notes?: string | null
          org_id?: string | null
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          type?: string | null
          work_center?: string | null
          work_center_id?: string | null
        }
        Update: {
          asset_code?: string
          calibration_cert_url?: string | null
          calibration_frequency_days?: number | null
          capacity?: number | null
          capacity_unit?: string | null
          category?: string
          created_at?: string
          equipment_code?: string | null
          equipment_type?: string | null
          id?: string
          installation_date?: string | null
          last_calibrated?: string | null
          last_calibration_date?: string | null
          last_maintenance?: string | null
          last_maintenance_date?: string | null
          maintenance_freq_days?: number | null
          make?: string | null
          make_model?: string | null
          model?: string | null
          name?: string
          next_calibration_due?: string | null
          next_maintenance?: string | null
          next_maintenance_due?: string | null
          notes?: string | null
          org_id?: string | null
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          type?: string | null
          work_center?: string | null
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_calibration_log: {
        Row: {
          calibrated_by: string | null
          calibration_date: string
          certificate_url: string | null
          created_at: string | null
          equipment_id: string
          id: string
          next_due_date: string
          notes: string | null
          org_id: string
          result: string | null
          signed_at: string | null
          technician_signature: string | null
        }
        Insert: {
          calibrated_by?: string | null
          calibration_date: string
          certificate_url?: string | null
          created_at?: string | null
          equipment_id: string
          id?: string
          next_due_date: string
          notes?: string | null
          org_id: string
          result?: string | null
          signed_at?: string | null
          technician_signature?: string | null
        }
        Update: {
          calibrated_by?: string | null
          calibration_date?: string
          certificate_url?: string | null
          created_at?: string | null
          equipment_id?: string
          id?: string
          next_due_date?: string
          notes?: string | null
          org_id?: string
          result?: string | null
          signed_at?: string | null
          technician_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_calibration_log_calibrated_by_fkey"
            columns: ["calibrated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_calibration_log_calibrated_by_fkey"
            columns: ["calibrated_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "equipment_calibration_log_calibrated_by_fkey"
            columns: ["calibrated_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_calibration_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_calibration_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          id: string
          notes: string | null
          paid_by: string | null
          recorded_by_id: string | null
          source: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          recorded_by_id?: string | null
          source?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          recorded_by_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_recorded_by_id_fkey"
            columns: ["recorded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_id_fkey"
            columns: ["recorded_by_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_id_fkey"
            columns: ["recorded_by_id"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
      fg_lots: {
        Row: {
          available_qty: number | null
          batch_id: string | null
          batch_no: string | null
          coa_date: string | null
          coa_issued: boolean | null
          coa_no: string | null
          created_at: string | null
          holding_status: string | null
          id: string
          location_id: string | null
          org_id: string | null
          product: string
          qty: number | null
          release_date: string | null
          total_value: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          available_qty?: number | null
          batch_id?: string | null
          batch_no?: string | null
          coa_date?: string | null
          coa_issued?: boolean | null
          coa_no?: string | null
          created_at?: string | null
          holding_status?: string | null
          id?: string
          location_id?: string | null
          org_id?: string | null
          product: string
          qty?: number | null
          release_date?: string | null
          total_value?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          available_qty?: number | null
          batch_id?: string | null
          batch_no?: string | null
          coa_date?: string | null
          coa_issued?: boolean | null
          coa_no?: string | null
          created_at?: string | null
          holding_status?: string | null
          id?: string
          location_id?: string | null
          org_id?: string | null
          product?: string
          qty?: number | null
          release_date?: string | null
          total_value?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fg_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_costing_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fg_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fg_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cogs_actual"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fg_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "utility_allocation_per_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "fg_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fg_lots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fssai_audits: {
        Row: {
          audit_date: string
          audit_type: string
          auditor: string | null
          created_at: string | null
          findings: string | null
          id: string
          status: string | null
        }
        Insert: {
          audit_date: string
          audit_type: string
          auditor?: string | null
          created_at?: string | null
          findings?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          audit_date?: string
          audit_type?: string
          auditor?: string | null
          created_at?: string | null
          findings?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      fssai_docs: {
        Row: {
          created_at: string | null
          doc_no: string | null
          doc_type: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          doc_no?: string | null
          doc_type: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          doc_no?: string | null
          doc_type?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      grns: {
        Row: {
          created_at: string | null
          created_by: string | null
          erp_product_id: string | null
          expiry_date: string | null
          grn_no: string
          gst_amt: number | null
          gst_pct: number | null
          id: string
          invoice_no: string | null
          lot_no: string | null
          material: string
          mfg_date: string | null
          org_id: string | null
          qty: number
          rate: number
          reject_reason: string | null
          remarks: string | null
          status: string | null
          supplier: string
          total_cost: number
          uom: string | null
          vehicle_no: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          erp_product_id?: string | null
          expiry_date?: string | null
          grn_no: string
          gst_amt?: number | null
          gst_pct?: number | null
          id?: string
          invoice_no?: string | null
          lot_no?: string | null
          material: string
          mfg_date?: string | null
          org_id?: string | null
          qty: number
          rate: number
          reject_reason?: string | null
          remarks?: string | null
          status?: string | null
          supplier: string
          total_cost: number
          uom?: string | null
          vehicle_no?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          erp_product_id?: string | null
          expiry_date?: string | null
          grn_no?: string
          gst_amt?: number | null
          gst_pct?: number | null
          id?: string
          invoice_no?: string | null
          lot_no?: string | null
          material?: string
          mfg_date?: string | null
          org_id?: string | null
          qty?: number
          rate?: number
          reject_reason?: string | null
          remarks?: string | null
          status?: string | null
          supplier?: string
          total_cost?: number
          uom?: string | null
          vehicle_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grns_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grns_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          org_id: string | null
          plan_code: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          plan_code: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          plan_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          body: string | null
          cta_label: string | null
          cta_link: string | null
          id: string
          image_url: string | null
          key: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          body?: string | null
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string | null
          key: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          body?: string | null
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string | null
          key?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      hr_training_records: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          employee_id: string
          expiry_date: string
          id: string
          org_id: string
          score: number | null
          sop_id: string
          status: string | null
          trained_by: string | null
          trainee_signature: string | null
          trainee_signed_at: string | null
          trainee_user_id: string | null
          trainer_signature: string | null
          trainer_signed_at: string | null
          trainer_user_id: string | null
          training_date: string
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          employee_id: string
          expiry_date: string
          id?: string
          org_id: string
          score?: number | null
          sop_id: string
          status?: string | null
          trained_by?: string | null
          trainee_signature?: string | null
          trainee_signed_at?: string | null
          trainee_user_id?: string | null
          trainer_signature?: string | null
          trainer_signed_at?: string | null
          trainer_user_id?: string | null
          training_date?: string
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          employee_id?: string
          expiry_date?: string
          id?: string
          org_id?: string
          score?: number | null
          sop_id?: string
          status?: string | null
          trained_by?: string | null
          trainee_signature?: string | null
          trainee_signed_at?: string | null
          trainee_user_id?: string | null
          trainer_signature?: string | null
          trainer_signed_at?: string | null
          trainer_user_id?: string | null
          training_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "hr_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["sop_id"]
          },
          {
            foreignKeyName: "hr_training_records_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "hr_training_records_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "hr_training_records_trainee_user_id_fkey"
            columns: ["trainee_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_trainer_user_id_fkey"
            columns: ["trainer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_training_records_trainer_user_id_fkey"
            columns: ["trainer_user_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "hr_training_records_trainer_user_id_fkey"
            columns: ["trainer_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          read: boolean
          replied: boolean
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          read?: boolean
          replied?: boolean
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read?: boolean
          replied?: boolean
          subject?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          customer: string
          date: string | null
          do_id: string | null
          do_no: string | null
          gst_amt: number | null
          gst_pct: number | null
          id: string
          invoice_no: string
          paid_amt: number | null
          product: string | null
          qty: number | null
          rate: number | null
          status: string | null
          subtotal: number | null
          total: number
        }
        Insert: {
          created_at?: string | null
          customer: string
          date?: string | null
          do_id?: string | null
          do_no?: string | null
          gst_amt?: number | null
          gst_pct?: number | null
          id?: string
          invoice_no: string
          paid_amt?: number | null
          product?: string | null
          qty?: number | null
          rate?: number | null
          status?: string | null
          subtotal?: number | null
          total: number
        }
        Update: {
          created_at?: string | null
          customer?: string
          date?: string | null
          do_id?: string | null
          do_no?: string | null
          gst_amt?: number | null
          gst_pct?: number | null
          id?: string
          invoice_no?: string
          paid_amt?: number | null
          product?: string | null
          qty?: number | null
          rate?: number | null
          status?: string | null
          subtotal?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_do_id_fkey"
            columns: ["do_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_hours: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          employee_id: string | null
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          org_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          org_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_costing_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cogs_actual"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "labor_hours_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "utility_allocation_per_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "labor_hours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          temperature_zone: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          temperature_zone?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          temperature_zone?: string | null
          type?: string
        }
        Relationships: []
      }
      lots: {
        Row: {
          created_at: string | null
          erp_product_id: string | null
          expiry_date: string | null
          grn_id: string | null
          id: string
          lot_no: string | null
          material: string
          mfg_date: string | null
          org_id: string | null
          qc_status: string | null
          qty: number
          rate: number | null
          remaining_qty: number
          supplier: string | null
          total_cost: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          erp_product_id?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          lot_no?: string | null
          material: string
          mfg_date?: string | null
          org_id?: string | null
          qc_status?: string | null
          qty: number
          rate?: number | null
          remaining_qty: number
          supplier?: string | null
          total_cost?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          erp_product_id?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          lot_no?: string | null
          material?: string
          mfg_date?: string | null
          org_id?: string | null
          qc_status?: string | null
          qty?: number
          rate?: number | null
          remaining_qty?: number
          supplier?: string | null
          total_cost?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      master_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      packaging_runs: {
        Row: {
          bulk_lot_id: string | null
          bulk_qty_consumed: number
          fg_lot_id: string | null
          id: string
          notes: string | null
          operator_id: string | null
          org_id: string | null
          pm_lot_id: string | null
          pm_qty_consumed: number
          run_date: string | null
        }
        Insert: {
          bulk_lot_id?: string | null
          bulk_qty_consumed: number
          fg_lot_id?: string | null
          id: string
          notes?: string | null
          operator_id?: string | null
          org_id?: string | null
          pm_lot_id?: string | null
          pm_qty_consumed: number
          run_date?: string | null
        }
        Update: {
          bulk_lot_id?: string | null
          bulk_qty_consumed?: number
          fg_lot_id?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          org_id?: string | null
          pm_lot_id?: string | null
          pm_qty_consumed?: number
          run_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_runs_bulk_lot_id_fkey"
            columns: ["bulk_lot_id"]
            isOneToOne: false
            referencedRelation: "bulk_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          checker_id: string | null
          created_at: string | null
          customer: string | null
          id: string
          invoice_id: string | null
          invoice_no: string | null
          maker_checker_status: string | null
          maker_id: string | null
          mode: string | null
          payment_date: string | null
          recorded_by: string | null
          reference: string | null
          rejection_reason: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          checker_id?: string | null
          created_at?: string | null
          customer?: string | null
          id?: string
          invoice_id?: string | null
          invoice_no?: string | null
          maker_checker_status?: string | null
          maker_id?: string | null
          mode?: string | null
          payment_date?: string | null
          recorded_by?: string | null
          reference?: string | null
          rejection_reason?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          checker_id?: string | null
          created_at?: string | null
          customer?: string | null
          id?: string
          invoice_id?: string | null
          invoice_no?: string | null
          maker_checker_status?: string | null
          maker_id?: string | null
          mode?: string | null
          payment_date?: string | null
          recorded_by?: string | null
          reference?: string | null
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      product_allergens: {
        Row: {
          allergen: string
          contains: boolean | null
          id: string
          may_contain: boolean | null
          product_id: string
        }
        Insert: {
          allergen: string
          contains?: boolean | null
          id?: string
          may_contain?: boolean | null
          product_id: string
        }
        Update: {
          allergen?: string
          contains?: boolean | null
          id?: string
          may_contain?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_allergens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_allergens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
        ]
      }
      product_history: {
        Row: {
          change_reason: string
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
          product_id: string
          version: number
        }
        Insert: {
          change_reason: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          product_id: string
          version: number
        }
        Update: {
          change_reason?: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          product_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "product_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          benefits: string[]
          category: string
          created_at: string
          description: string | null
          featured: boolean
          gst_pct: number | null
          haccp_plan_id: string | null
          id: string
          images: string[]
          in_stock: boolean
          is_active: boolean | null
          name: string
          og_image: string | null
          org_id: string | null
          pack_sizes: string | null
          recipe_id: string | null
          seo_desc: string | null
          seo_title: string | null
          short_desc: string | null
          sku_code: string | null
          slug: string
          sort_order: number
          status: string | null
          superseded_by: string | null
          tagline: string | null
          tags: string[]
          unit: string | null
          updated_at: string
          usage_home: string | null
          usage_pro: string | null
          version: number | null
          visible: boolean
        }
        Insert: {
          benefits?: string[]
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          gst_pct?: number | null
          haccp_plan_id?: string | null
          id?: string
          images?: string[]
          in_stock?: boolean
          is_active?: boolean | null
          name: string
          og_image?: string | null
          org_id?: string | null
          pack_sizes?: string | null
          recipe_id?: string | null
          seo_desc?: string | null
          seo_title?: string | null
          short_desc?: string | null
          sku_code?: string | null
          slug: string
          sort_order?: number
          status?: string | null
          superseded_by?: string | null
          tagline?: string | null
          tags?: string[]
          unit?: string | null
          updated_at?: string
          usage_home?: string | null
          usage_pro?: string | null
          version?: number | null
          visible?: boolean
        }
        Update: {
          benefits?: string[]
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          gst_pct?: number | null
          haccp_plan_id?: string | null
          id?: string
          images?: string[]
          in_stock?: boolean
          is_active?: boolean | null
          name?: string
          og_image?: string | null
          org_id?: string | null
          pack_sizes?: string | null
          recipe_id?: string | null
          seo_desc?: string | null
          seo_title?: string | null
          short_desc?: string | null
          sku_code?: string | null
          slug?: string
          sort_order?: number
          status?: string | null
          superseded_by?: string | null
          tagline?: string | null
          tags?: string[]
          unit?: string | null
          updated_at?: string
          usage_home?: string | null
          usage_pro?: string | null
          version?: number | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_haccp_plan_id_fkey"
            columns: ["haccp_plan_id"]
            isOneToOne: false
            referencedRelation: "haccp_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          employee_code: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string | null
          org_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          employee_code?: string | null
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          name?: string | null
          org_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          employee_code?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          org_id?: string | null
          role?: string | null
          updated_at?: string | null
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
      prp_cleaning_tasks: {
        Row: {
          area: string
          created_by: string | null
          frequency: string
          id: string
          is_active: boolean | null
          org_id: string
          sop_code: string
          sort_order: number | null
          task_name: string
        }
        Insert: {
          area: string
          created_by?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          org_id: string
          sop_code: string
          sort_order?: number | null
          task_name: string
        }
        Update: {
          area?: string
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          org_id?: string
          sop_code?: string
          sort_order?: number | null
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "prp_cleaning_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_cleaning_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "prp_cleaning_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_cleaning_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prp_execution_history: {
        Row: {
          change_reason: string
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
          prp_log_id: string
          version: number
        }
        Insert: {
          change_reason: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          prp_log_id: string
          version: number
        }
        Update: {
          change_reason?: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          prp_log_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prp_execution_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_execution_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "prp_execution_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_execution_history_prp_log_id_fkey"
            columns: ["prp_log_id"]
            isOneToOne: false
            referencedRelation: "prp_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      prp_logs: {
        Row: {
          after_reading: string | null
          approved_at: string | null
          approved_by: string | null
          area: string | null
          batch_id: string | null
          before_reading: string | null
          capa_id: string | null
          chemical: string | null
          cleaning_agent: string | null
          compliance_standard: string | null
          created_at: string | null
          created_by: string | null
          done_by: string | null
          equipment: string | null
          equipment_id: string | null
          id: string
          method: string | null
          next_due: string | null
          org_id: string | null
          pco_name: string | null
          pest_type: string | null
          prp_type: string
          recipe_id: string | null
          remarks: string | null
          result: string | null
          standard: string | null
        }
        Insert: {
          after_reading?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          batch_id?: string | null
          before_reading?: string | null
          capa_id?: string | null
          chemical?: string | null
          cleaning_agent?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          done_by?: string | null
          equipment?: string | null
          equipment_id?: string | null
          id?: string
          method?: string | null
          next_due?: string | null
          org_id?: string | null
          pco_name?: string | null
          pest_type?: string | null
          prp_type: string
          recipe_id?: string | null
          remarks?: string | null
          result?: string | null
          standard?: string | null
        }
        Update: {
          after_reading?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          batch_id?: string | null
          before_reading?: string | null
          capa_id?: string | null
          chemical?: string | null
          cleaning_agent?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          done_by?: string | null
          equipment?: string | null
          equipment_id?: string | null
          id?: string
          method?: string | null
          next_due?: string | null
          org_id?: string | null
          pco_name?: string | null
          pest_type?: string | null
          prp_type?: string
          recipe_id?: string | null
          remarks?: string | null
          result?: string | null
          standard?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prp_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "prp_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_costing_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cogs_actual"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "prp_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "utility_allocation_per_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "prp_logs_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "capas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "prp_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prp_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_checks: {
        Row: {
          analyst: string | null
          batch_id: string | null
          batch_no: string | null
          capa_id: string | null
          coa_issued: boolean | null
          coa_number: string | null
          format_no: string | null
          id: string
          overall: string | null
          pack_size: string | null
          product: string | null
          remarks: string | null
          results: Json | null
          reviewer: string | null
          tested_at: string | null
          tested_by: string | null
        }
        Insert: {
          analyst?: string | null
          batch_id?: string | null
          batch_no?: string | null
          capa_id?: string | null
          coa_issued?: boolean | null
          coa_number?: string | null
          format_no?: string | null
          id?: string
          overall?: string | null
          pack_size?: string | null
          product?: string | null
          remarks?: string | null
          results?: Json | null
          reviewer?: string | null
          tested_at?: string | null
          tested_by?: string | null
        }
        Update: {
          analyst?: string | null
          batch_id?: string | null
          batch_no?: string | null
          capa_id?: string | null
          coa_issued?: boolean | null
          coa_number?: string | null
          format_no?: string | null
          id?: string
          overall?: string | null
          pack_size?: string | null
          product?: string | null
          remarks?: string | null
          results?: Json | null
          reviewer?: string | null
          tested_at?: string | null
          tested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_checks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_costing_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_checks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cogs_actual"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "qc_checks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "utility_allocation_per_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "qc_checks_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "capas"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_batch_freeze: {
        Row: {
          batch_id: string
          fg_lot_id: string | null
          frozen_at: string | null
          frozen_by: string | null
          id: string
          location: string | null
          org_id: string
          qty_frozen: number
          recall_id: string
        }
        Insert: {
          batch_id: string
          fg_lot_id?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          location?: string | null
          org_id: string
          qty_frozen: number
          recall_id: string
        }
        Update: {
          batch_id?: string
          fg_lot_id?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          location?: string | null
          org_id?: string
          qty_frozen?: number
          recall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_batch_freeze_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_costing_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cogs_actual"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "utility_allocation_per_batch"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_fg_lot_id_fkey"
            columns: ["fg_lot_id"]
            isOneToOne: false
            referencedRelation: "fg_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_frozen_by_fkey"
            columns: ["frozen_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_frozen_by_fkey"
            columns: ["frozen_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_frozen_by_fkey"
            columns: ["frozen_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_batch_freeze_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_history: {
        Row: {
          change_reason: string
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
          recall_id: string
        }
        Insert: {
          change_reason: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          recall_id: string
        }
        Update: {
          change_reason?: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          recall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recall_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_history_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      recalls: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_ref: string | null
          capa_id: string | null
          closed_at: string | null
          closed_by: string | null
          compliance_standard: string | null
          created_at: string | null
          created_by: string | null
          customers: string | null
          description: string | null
          fssai_notification_ref: string | null
          fssai_notified: boolean | null
          fssai_notified_at: string | null
          id: string
          initiated_by: string | null
          is_mock: boolean | null
          org_id: string | null
          qty_dispatched: number | null
          qty_recovered: number | null
          reason: string
          recall_no: string
          status: string | null
          trace_time: string | null
          unit: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_ref?: string | null
          capa_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          customers?: string | null
          description?: string | null
          fssai_notification_ref?: string | null
          fssai_notified?: boolean | null
          fssai_notified_at?: string | null
          id?: string
          initiated_by?: string | null
          is_mock?: boolean | null
          org_id?: string | null
          qty_dispatched?: number | null
          qty_recovered?: number | null
          reason: string
          recall_no: string
          status?: string | null
          trace_time?: string | null
          unit?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_ref?: string | null
          capa_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          customers?: string | null
          description?: string | null
          fssai_notification_ref?: string | null
          fssai_notified?: boolean | null
          fssai_notified_at?: string | null
          id?: string
          initiated_by?: string | null
          is_mock?: boolean | null
          org_id?: string | null
          qty_dispatched?: number | null
          qty_recovered?: number | null
          reason?: string
          recall_no?: string
          status?: string | null
          trace_time?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recalls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recalls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "capas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recalls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_fsms_ccp: {
        Row: {
          ccp_name: string
          ccp_no: string
          control_measure: string | null
          created_at: string | null
          critical_limit: string | null
          hazard: string | null
          id: string
          parameter: string | null
          recipe_id: string | null
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          ccp_name: string
          ccp_no: string
          control_measure?: string | null
          created_at?: string | null
          critical_limit?: string | null
          hazard?: string | null
          id?: string
          parameter?: string | null
          recipe_id?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          ccp_name?: string
          ccp_no?: string
          control_measure?: string | null
          created_at?: string | null
          critical_limit?: string | null
          hazard?: string | null
          id?: string
          parameter?: string | null
          recipe_id?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_fsms_ccp_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_fsms_prp: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          effective_date: string | null
          frequency: string | null
          id: string
          procedure: string | null
          prp_name: string
          prp_type: string
          recipe_id: string | null
          sort_order: number | null
          superseded_by: string | null
          target_area: string | null
          version: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          frequency?: string | null
          id?: string
          procedure?: string | null
          prp_name: string
          prp_type: string
          recipe_id?: string | null
          sort_order?: number | null
          superseded_by?: string | null
          target_area?: string | null
          version?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          frequency?: string | null
          id?: string
          procedure?: string | null
          prp_name?: string
          prp_type?: string
          recipe_id?: string | null
          sort_order?: number | null
          superseded_by?: string | null
          target_area?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_fsms_prp_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_fsms_prp_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recipe_fsms_prp_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_fsms_prp_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_fsms_prp_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recipe_fsms_prp_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_fsms_prp_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_fsms_prp_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "recipe_fsms_prp"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_inputs: {
        Row: {
          created_at: string | null
          id: string
          material: string
          notes: string | null
          qty: number
          recipe_id: string
          tolerance: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material: string
          notes?: string | null
          qty: number
          recipe_id: string
          tolerance?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material?: string
          notes?: string | null
          qty?: number
          recipe_id?: string
          tolerance?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_inputs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_qc_params: {
        Row: {
          category: string
          created_at: string | null
          id: string
          notes: string | null
          param_name: string
          recipe_id: string
          sort_order: number | null
          target_max: number | null
          target_min: number | null
          target_value: number | null
          test_method: string | null
          unit: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          param_name: string
          recipe_id: string
          sort_order?: number | null
          target_max?: number | null
          target_min?: number | null
          target_value?: number | null
          test_method?: string | null
          unit?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          param_name?: string
          recipe_id?: string
          sort_order?: number | null
          target_max?: number | null
          target_min?: number | null
          target_value?: number | null
          test_method?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_qc_params_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          created_at: string | null
          duration_min: number | null
          id: string
          instruction: string | null
          is_ccp: boolean | null
          machine: string | null
          recipe_id: string
          step_name: string
          step_no: number
          temp_max: number | null
          temp_min: number | null
        }
        Insert: {
          created_at?: string | null
          duration_min?: number | null
          id?: string
          instruction?: string | null
          is_ccp?: boolean | null
          machine?: string | null
          recipe_id: string
          step_name: string
          step_no: number
          temp_max?: number | null
          temp_min?: number | null
        }
        Update: {
          created_at?: string | null
          duration_min?: number | null
          id?: string
          instruction?: string | null
          is_ccp?: boolean | null
          machine?: string | null
          recipe_id?: string
          step_name?: string
          step_no?: number
          temp_max?: number | null
          temp_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          expected_loss: number | null
          id: string
          is_active: boolean | null
          locked: boolean | null
          name: string
          notes: string | null
          output_qty: number | null
          output_unit: string | null
          product_id: string | null
          shelf_life_days: number | null
          storage_temp: string | null
          version: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_loss?: number | null
          id?: string
          is_active?: boolean | null
          locked?: boolean | null
          name: string
          notes?: string | null
          output_qty?: number | null
          output_unit?: string | null
          product_id?: string | null
          shelf_life_days?: number | null
          storage_temp?: string | null
          version?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_loss?: number | null
          id?: string
          is_active?: boolean | null
          locked?: boolean | null
          name?: string
          notes?: string | null
          output_qty?: number | null
          output_unit?: string | null
          product_id?: string | null
          shelf_life_days?: number | null
          storage_temp?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
        ]
      }
      return_qc: {
        Row: {
          disposition_action: string
          id: string
          new_lot_id: string | null
          notes: string | null
          primary_pm_status: string
          product_status: string
          qc_by: string | null
          qc_date: string | null
          return_id: string | null
          secondary_pm_status: string
          tertiary_pm_status: string | null
        }
        Insert: {
          disposition_action: string
          id?: string
          new_lot_id?: string | null
          notes?: string | null
          primary_pm_status: string
          product_status: string
          qc_by?: string | null
          qc_date?: string | null
          return_id?: string | null
          secondary_pm_status: string
          tertiary_pm_status?: string | null
        }
        Update: {
          disposition_action?: string
          id?: string
          new_lot_id?: string | null
          notes?: string | null
          primary_pm_status?: string
          product_status?: string
          qc_by?: string | null
          qc_date?: string | null
          return_id?: string | null
          secondary_pm_status?: string
          tertiary_pm_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_qc_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_files: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      rnd_formula_items: {
        Row: {
          created_at: string | null
          formula_id: string | null
          id: string
          ingredient_id: string | null
          notes: string | null
          percentage: number
          phase: string | null
          tolerance_pct: number | null
        }
        Insert: {
          created_at?: string | null
          formula_id?: string | null
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          percentage: number
          phase?: string | null
          tolerance_pct?: number | null
        }
        Update: {
          created_at?: string | null
          formula_id?: string | null
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          percentage?: number
          phase?: string | null
          tolerance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rnd_formula_items_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "rnd_formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rnd_formula_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "rnd_ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_formula_params: {
        Row: {
          created_at: string | null
          formula_id: string
          id: string
          notes: string | null
          param_name: string
          sort_order: number | null
          target_max: number | null
          target_min: number | null
          target_value: number | null
          test_method: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          formula_id: string
          id?: string
          notes?: string | null
          param_name: string
          sort_order?: number | null
          target_max?: number | null
          target_min?: number | null
          target_value?: number | null
          test_method?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          formula_id?: string
          id?: string
          notes?: string | null
          param_name?: string
          sort_order?: number | null
          target_max?: number | null
          target_min?: number | null
          target_value?: number | null
          test_method?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rnd_formula_params_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "rnd_formulas"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_formulas: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          erp_product_id: string | null
          formula_code: string
          id: string
          locked_at: string | null
          locked_by: string | null
          name: string
          status: Database["public"]["Enums"]["rnd_formula_status"] | null
          target_brix: number | null
          target_ph: number | null
          target_sg: number | null
          total_cost_per_kg: number | null
          validation_notes: string | null
          validation_status: string | null
          version: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          erp_product_id?: string | null
          formula_code: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name: string
          status?: Database["public"]["Enums"]["rnd_formula_status"] | null
          target_brix?: number | null
          target_ph?: number | null
          target_sg?: number | null
          total_cost_per_kg?: number | null
          validation_notes?: string | null
          validation_status?: string | null
          version?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          erp_product_id?: string | null
          formula_code?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          status?: Database["public"]["Enums"]["rnd_formula_status"] | null
          target_brix?: number | null
          target_ph?: number | null
          target_sg?: number | null
          total_cost_per_kg?: number | null
          validation_notes?: string | null
          validation_status?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rnd_formulas_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rnd_formulas_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_ingredients: {
        Row: {
          category: string | null
          coa_url: string | null
          cost_per_kg: number | null
          created_at: string | null
          erp_product_id: string | null
          functionality: string | null
          heat_stability: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          ph_max: number | null
          ph_min: number | null
          supplier: string | null
          usage_max_pct: number | null
          usage_min_pct: number | null
        }
        Insert: {
          category?: string | null
          coa_url?: string | null
          cost_per_kg?: number | null
          created_at?: string | null
          erp_product_id?: string | null
          functionality?: string | null
          heat_stability?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          ph_max?: number | null
          ph_min?: number | null
          supplier?: string | null
          usage_max_pct?: number | null
          usage_min_pct?: number | null
        }
        Update: {
          category?: string | null
          coa_url?: string | null
          cost_per_kg?: number | null
          created_at?: string | null
          erp_product_id?: string | null
          functionality?: string | null
          heat_stability?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          ph_max?: number | null
          ph_min?: number | null
          supplier?: string | null
          usage_max_pct?: number | null
          usage_min_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rnd_ingredients_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rnd_ingredients_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_master_parameters: {
        Row: {
          category: string | null
          created_at: string | null
          default_unit: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_unit?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_unit?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      rnd_notebook: {
        Row: {
          author: string | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          tags: string[] | null
          title: string
          trial_id: string | null
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          tags?: string[] | null
          title: string
          trial_id?: string | null
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          tags?: string[] | null
          title?: string
          trial_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rnd_notebook_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "rnd_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_processes: {
        Row: {
          ccp: boolean | null
          created_at: string | null
          description: string
          duration_min: number | null
          formula_id: string | null
          id: string
          pressure_bar: number | null
          rpm: number | null
          step_no: number
          step_type: string | null
          temp_c: number | null
        }
        Insert: {
          ccp?: boolean | null
          created_at?: string | null
          description: string
          duration_min?: number | null
          formula_id?: string | null
          id?: string
          pressure_bar?: number | null
          rpm?: number | null
          step_no: number
          step_type?: string | null
          temp_c?: number | null
        }
        Update: {
          ccp?: boolean | null
          created_at?: string | null
          description?: string
          duration_min?: number | null
          formula_id?: string | null
          id?: string
          pressure_bar?: number | null
          rpm?: number | null
          step_no?: number
          step_type?: string | null
          temp_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rnd_processes_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "rnd_formulas"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_trial_params: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          param_name: string
          trial_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          param_name: string
          trial_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          param_name?: string
          trial_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rnd_trial_params_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "rnd_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      rnd_trials: {
        Row: {
          actual_brix: number | null
          actual_ph: number | null
          actual_sg: number | null
          actual_yield_kg: number | null
          batch_size_kg: number
          conducted_by: string | null
          created_at: string | null
          end_time: string | null
          f0_achieved: number | null
          failure_reason: string | null
          formula_id: string | null
          hold_time_min: number | null
          id: string
          retort_temp_c: number | null
          sensory_notes: string | null
          sensory_score: number | null
          stability_notes: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["rnd_trial_status"] | null
          trial_no: string
        }
        Insert: {
          actual_brix?: number | null
          actual_ph?: number | null
          actual_sg?: number | null
          actual_yield_kg?: number | null
          batch_size_kg: number
          conducted_by?: string | null
          created_at?: string | null
          end_time?: string | null
          f0_achieved?: number | null
          failure_reason?: string | null
          formula_id?: string | null
          hold_time_min?: number | null
          id?: string
          retort_temp_c?: number | null
          sensory_notes?: string | null
          sensory_score?: number | null
          stability_notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["rnd_trial_status"] | null
          trial_no: string
        }
        Update: {
          actual_brix?: number | null
          actual_ph?: number | null
          actual_sg?: number | null
          actual_yield_kg?: number | null
          batch_size_kg?: number
          conducted_by?: string | null
          created_at?: string | null
          end_time?: string | null
          f0_achieved?: number | null
          failure_reason?: string | null
          formula_id?: string | null
          hold_time_min?: number | null
          id?: string
          retort_temp_c?: number | null
          sensory_notes?: string | null
          sensory_score?: number | null
          stability_notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["rnd_trial_status"] | null
          trial_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "rnd_trials_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "rnd_formulas"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          dispatch_id: string | null
          fg_lot_id: string
          id: string
          invoice_no: string | null
          qty: number
          reason: string | null
          return_date: string | null
          status: string | null
        }
        Insert: {
          dispatch_id?: string | null
          fg_lot_id: string
          id?: string
          invoice_no?: string | null
          qty: number
          reason?: string | null
          return_date?: string | null
          status?: string | null
        }
        Update: {
          dispatch_id?: string | null
          fg_lot_id?: string
          id?: string
          invoice_no?: string | null
          qty?: number
          reason?: string | null
          return_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          description: string | null
          id: string
          og_image: string | null
          page: string
          title: string | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          og_image?: string | null
          page: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          og_image?: string | null
          page?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_value: string | null
          old_value: string | null
          org_id: string
          setting_key: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id: string
          setting_key: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id?: string
          setting_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "settings_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          group_name: string
          id: string
          key: string
          label: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          group_name?: string
          id?: string
          key: string
          label?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          group_name?: string
          id?: string
          key?: string
          label?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      sop_history: {
        Row: {
          change_reason: string
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
          sop_id: string
          version: string
        }
        Insert: {
          change_reason: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          sop_id: string
          version: string
        }
        Update: {
          change_reason?: string
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          sop_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "sop_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_history_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_history_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["sop_id"]
          },
        ]
      }
      sops: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          compliance_standard: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          document_path: string | null
          effective_date: string | null
          id: string
          notes: string | null
          org_id: string | null
          parent_sop_id: string | null
          prepared_by: string | null
          product_id: string | null
          recipe_id: string | null
          review_date: string | null
          sop_no: string
          status: string | null
          superseded_by: string | null
          title: string
          version: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          document_path?: string | null
          effective_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          parent_sop_id?: string | null
          prepared_by?: string | null
          product_id?: string | null
          recipe_id?: string | null
          review_date?: string | null
          sop_no: string
          status?: string | null
          superseded_by?: string | null
          title: string
          version?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          compliance_standard?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          document_path?: string | null
          effective_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          parent_sop_id?: string | null
          prepared_by?: string | null
          product_id?: string | null
          recipe_id?: string | null
          review_date?: string | null
          sop_no?: string
          status?: string | null
          superseded_by?: string | null
          title?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_parent_sop_id_fkey"
            columns: ["parent_sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_parent_sop_id_fkey"
            columns: ["parent_sop_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["sop_id"]
          },
          {
            foreignKeyName: "sops_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["sop_id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          created_at: string | null
          created_by: string | null
          erp_product_id: string | null
          fg_lot_id: string | null
          id: string
          lot_id: string | null
          notes: string | null
          org_id: string | null
          qty_change: number
          reference_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          erp_product_id?: string | null
          fg_lot_id?: string | null
          id?: string
          lot_id?: string | null
          notes?: string | null
          org_id?: string | null
          qty_change: number
          reference_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          erp_product_id?: string | null
          fg_lot_id?: string | null
          id?: string
          lot_id?: string | null
          notes?: string | null
          org_id?: string | null
          qty_change?: number
          reference_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_fg_lot_id_fkey"
            columns: ["fg_lot_id"]
            isOneToOne: false
            referencedRelation: "fg_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          from_location_id: string | null
          id: string
          item_type: string
          qty: number
          reason: string | null
          reference_id: string
          to_location_id: string | null
          transfer_date: string | null
          transferred_by: string | null
        }
        Insert: {
          from_location_id?: string | null
          id?: string
          item_type: string
          qty: number
          reason?: string | null
          reference_id: string
          to_location_id?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
        }
        Update: {
          from_location_id?: string | null
          id?: string
          item_type?: string
          qty?: number
          reason?: string | null
          reference_id?: string
          to_location_id?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_indents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          department: string
          equipment_tag: string | null
          id: string
          indent_no: string
          is_maintenance: boolean | null
          item_id: string | null
          item_name: string
          priority: string
          purpose: string | null
          qty_requested: number
          requested_by: string
          status: string
          unit: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department: string
          equipment_tag?: string | null
          id?: string
          indent_no: string
          is_maintenance?: boolean | null
          item_id?: string | null
          item_name: string
          priority?: string
          purpose?: string | null
          qty_requested: number
          requested_by: string
          status?: string
          unit?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department?: string
          equipment_tag?: string | null
          id?: string
          indent_no?: string
          is_maintenance?: boolean | null
          item_id?: string | null
          item_name?: string
          priority?: string
          purpose?: string | null
          qty_requested?: number
          requested_by?: string
          status?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_indents_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          category: string
          created_at: string | null
          current_stock: number
          equipment_tag: string | null
          id: string
          is_maintenance_part: boolean | null
          min_stock_level: number | null
          name: string
          notes: string | null
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          current_stock?: number
          equipment_tag?: string | null
          id?: string
          is_maintenance_part?: boolean | null
          min_stock_level?: number | null
          name: string
          notes?: string | null
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string | null
          current_stock?: number
          equipment_tag?: string | null
          id?: string
          is_maintenance_part?: boolean | null
          min_stock_level?: number | null
          name?: string
          notes?: string | null
          unit?: string
        }
        Relationships: []
      }
      store_transactions: {
        Row: {
          amount: number | null
          bill_no: string | null
          category: string
          created_at: string | null
          department: string | null
          entered_by: string | null
          equipment_tag: string | null
          has_bill: boolean | null
          id: string
          indent_id: string | null
          is_maintenance: boolean | null
          item_id: string | null
          item_name: string
          notes: string | null
          qty: number
          rate: number | null
          txn_date: string
          txn_type: string
          unit: string
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          bill_no?: string | null
          category?: string
          created_at?: string | null
          department?: string | null
          entered_by?: string | null
          equipment_tag?: string | null
          has_bill?: boolean | null
          id?: string
          indent_id?: string | null
          is_maintenance?: boolean | null
          item_id?: string | null
          item_name: string
          notes?: string | null
          qty: number
          rate?: number | null
          txn_date?: string
          txn_type: string
          unit?: string
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          bill_no?: string | null
          category?: string
          created_at?: string | null
          department?: string | null
          entered_by?: string | null
          equipment_tag?: string | null
          has_bill?: boolean | null
          id?: string
          indent_id?: string | null
          is_maintenance?: boolean | null
          item_id?: string | null
          item_name?: string
          notes?: string | null
          qty?: number
          rate?: number | null
          txn_date?: string
          txn_type?: string
          unit?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_transactions_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "store_indents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          id: string
          name: string
          quote: string
          rating: number
          role: string | null
          sort_order: number
          visible: boolean
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          name: string
          quote: string
          rating?: number
          role?: string | null
          sort_order?: number
          visible?: boolean
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          name?: string
          quote?: string
          rating?: number
          role?: string | null
          sort_order?: number
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "testimonials_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          created_at: string | null
          employee_id: string
          expiry_date: string | null
          id: string
          org_id: string
          sop_id: string
          status: string | null
          trainee_signature: string | null
          trainee_signed_at: string | null
          trainer_signature: string | null
          trainer_signed_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
          org_id: string
          sop_id: string
          status?: string | null
          trainee_signature?: string | null
          trainee_signed_at?: string | null
          trainer_signature?: string | null
          trainer_signed_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
          org_id?: string
          sop_id?: string
          status?: string | null
          trainee_signature?: string | null
          trainee_signed_at?: string | null
          trainer_signature?: string | null
          trainer_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["sop_id"]
          },
        ]
      }
      user_role_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_role: string | null
          old_role: string | null
          org_id: string
          reason: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          org_id: string
          reason: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          org_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "user_role_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "user_role_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
      wastage_logs: {
        Row: {
          created_at: string | null
          id: string
          item_type: string
          logged_by: string | null
          qty: number
          reason: string
          reference_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_type: string
          logged_by?: string | null
          qty: number
          reason: string
          reference_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_type?: string
          logged_by?: string | null
          qty?: number
          reason?: string
          reference_id?: string
        }
        Relationships: []
      }
      work_centers: {
        Row: {
          capacity: number
          capacity_unit: string
          code: string
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          org_id: string | null
          shift_hours: number
          status: string
          supervisor: string | null
          supervisor_id: string | null
          supervisor_name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          capacity_unit?: string
          code: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          org_id?: string | null
          shift_hours?: number
          status?: string
          supervisor?: string | null
          supervisor_id?: string | null
          supervisor_name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          capacity_unit?: string
          code?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          org_id?: string | null
          shift_hours?: number
          status?: string
          supervisor?: string | null
          supervisor_id?: string | null
          supervisor_name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_centers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_centers_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_centers_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_employee_competency"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "work_centers_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_user_training_status"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      batch_costing_view: {
        Row: {
          actual_qty: number | null
          batch_no: string | null
          id: string | null
          labor_cost: number | null
          overhead: number | null
          planned_qty: number | null
          product: string | null
          rm_cost: number | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
        }
        Relationships: []
      }
      cogs_actual: {
        Row: {
          actual_rm_cost: number | null
          batch_id: string | null
        }
        Relationships: []
      }
      utility_allocation_per_batch: {
        Row: {
          allocated_cost: number | null
          batch_id: string | null
          batch_no: string | null
          cost_center: string | null
          product: string | null
          utility_type: string | null
        }
        Relationships: []
      }
      v_audit_trail_unified: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          detail: string | null
          entity: string | null
          id: string | null
          module: string | null
          ref_id: string | null
        }
        Relationships: []
      }
      v_employee_competency: {
        Row: {
          department: string | null
          employee_code: string | null
          employee_id: string | null
          employee_name: string | null
          expiry_date: string | null
          is_qualified: boolean | null
          qualification_status: string | null
          role: string | null
          score: number | null
          sop_id: string | null
          sop_no: string | null
          sop_title: string | null
          status: string | null
          training_date: string | null
        }
        Relationships: []
      }
      v_products_fsms: {
        Row: {
          allergen_count: number | null
          allergen_list: string | null
          benefits: string[] | null
          category: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          gst_pct: number | null
          haccp_plan: string | null
          haccp_plan_id: string | null
          has_history: boolean | null
          id: string | null
          images: string[] | null
          in_stock: boolean | null
          is_active: boolean | null
          name: string | null
          og_image: string | null
          org_id: string | null
          pack_sizes: string | null
          recipe_id: string | null
          recipe_name: string | null
          recipe_version: number | null
          seo_desc: string | null
          seo_title: string | null
          short_desc: string | null
          sku_code: string | null
          slug: string | null
          sort_order: number | null
          status: string | null
          superseded_by: string | null
          tagline: string | null
          tags: string[] | null
          unit: string | null
          updated_at: string | null
          usage_home: string | null
          usage_pro: string | null
          version: number | null
          visible: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_haccp_plan_id_fkey"
            columns: ["haccp_plan_id"]
            isOneToOne: false
            referencedRelation: "haccp_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "v_products_fsms"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_training_status: {
        Row: {
          department: string | null
          employee_code: string | null
          expiring_trainings: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          org_id: string | null
          production_qualified: boolean | null
          role: string | null
          valid_trainings: number | null
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
    }
    Functions: {
      allocate_overhead: {
        Args: {
          p_allocation_basis: string
          p_allocation_date: string
          p_amount: number
          p_cost_center_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      approve_allergen_declaration: {
        Args: { p_matrix_id: string; p_user_id?: string }
        Returns: Json
      }
      approve_dispatch: {
        Args: {
          p_dispatch_id: string
          p_rejection_reason?: string
          p_status: string
        }
        Returns: undefined
      }
      approve_grn_and_create_lot: {
        Args: { p_grn_id: string; p_user_id?: string; p_user_name?: string }
        Returns: Json
      }
      approve_payment: {
        Args: {
          p_payment_id: string
          p_rejection_reason?: string
          p_status: string
        }
        Returns: undefined
      }
      approve_sop: {
        Args: { p_sop_id: string; p_user_id?: string }
        Returns: Json
      }
      approve_testimonial: {
        Args: { p_id: string; p_user_id?: string }
        Returns: undefined
      }
      bos_has_role: { Args: { required_roles: string[] }; Returns: boolean }
      calculate_oee: { Args: { p_days?: number }; Returns: number }
      check_expiring_lots: { Args: never; Returns: undefined }
      check_operator_qualification: {
        Args: { p_operator_id: string; p_recipe_id: string }
        Returns: boolean
      }
      complete_batch: {
        Args: {
          p_actual_qty: number
          p_batch_id: string
          p_labor_hours?: number
          p_notes?: string
          p_overhead_cost?: number
          p_reject_qty?: number
        }
        Returns: Json
      }
      complete_calibration: {
        Args: {
          p_cert_url: string
          p_equipment_id: string
          p_next_due: string
          p_notes: string
          p_result: string
          p_signature: string
          p_technician_id?: string
        }
        Returns: undefined
      }
      complete_packaging_run: {
        Args: {
          p_bulk_lot_id: string
          p_bulk_qty: number
          p_fg_lot_id: string
          p_fg_qty: number
          p_notes?: string
          p_operator_id?: string
          p_pm_lot_id?: string
          p_pm_qty?: number
        }
        Returns: Json
      }
      complete_production_batch: {
        Args: {
          p_batch_id: string
          p_fg_data: Json
          p_qc_data?: Json
          p_user_id?: string
        }
        Returns: Json
      }
      complete_training_with_signature: {
        Args: {
          p_score: number
          p_trainee_id: string
          p_trainee_signature: string
          p_trainer_id?: string
          p_trainer_signature: string
          p_training_id: string
        }
        Returns: Json
      }
      convert_sku: {
        Args: {
          p_pm_wastage_lot_id?: string
          p_pm_wastage_qty?: number
          p_qty_convert: number
          p_reason?: string
          p_source_fg_lot_id: string
          p_target_fg_lot_id: string
        }
        Returns: Json
      }
      count_open_capas_older_than: {
        Args: { p_days?: number }
        Returns: number
      }
      create_pallet_dispatch_order: {
        Args: {
          p_challan_no: string
          p_customer_id: string
          p_do_code: string
          p_notes: string
          p_user_id?: string
        }
        Returns: Json
      }
      create_single_dispatch: {
        Args: {
          p_batch_id: string
          p_batch_no: string
          p_customer: string
          p_do_no: string
          p_gst_amt: number
          p_gst_pct: number
          p_lr_no: string
          p_notes: string
          p_product: string
          p_quantity: number
          p_subtotal: number
          p_total: number
          p_unit: string
          p_unit_rate: number
          p_user_id?: string
          p_vehicle_no: string
        }
        Returns: Json
      }
      delete_expense: {
        Args: { p_expense_id: string; p_user_id?: string }
        Returns: Json
      }
      dispatch_do_and_create_invoice: {
        Args: { p_do_id: string; p_user_id?: string }
        Returns: Json
      }
      erp_begin_workflow_rpc: { Args: never; Returns: undefined }
      erp_healthcheck: { Args: never; Returns: Json }
      get_avg_mock_recall_time: { Args: never; Returns: number }
      get_ccp_compliance_24h: { Args: never; Returns: number }
      get_cto_dashboard_metrics: { Args: { p_user_id?: string }; Returns: Json }
      get_yield_variance: { Args: { p_days?: number }; Returns: number }
      initiate_recall: {
        Args: {
          p_batch_no: string
          p_compliance_standard?: string
          p_description: string
          p_initiated_by: string
          p_is_mock: boolean
          p_reason: string
          p_user_id?: string
        }
        Returns: Json
      }
      log_ccp_reading: {
        Args: {
          p_ccp_id: string
          p_equipment_id: string
          p_reading: number
          p_user_id?: string
        }
        Returns: Json
      }
      log_cleaning_checklist: {
        Args: {
          p_checklist: Json
          p_sop_code: string
          p_tasks_completed: number
          p_tasks_total: number
          p_user_id?: string
        }
        Returns: Json
      }
      log_prp_execution:
        | {
            Args: {
              p_batch_id?: string
              p_compliance_standard?: string
              p_done_by: string
              p_next_due?: string
              p_prp_id: string
              p_remarks?: string
              p_result: string
              p_user_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_batch_id?: string
              p_compliance_standard?: string
              p_done_by: string
              p_next_due?: string
              p_prp_id: string
              p_reading?: string
              p_remarks?: string
              p_result: string
              p_user_id?: string
            }
            Returns: Json
          }
      obsolete_product: {
        Args: { p_id: string; p_reason: string; p_user_id?: string }
        Returns: undefined
      }
      record_expense: {
        Args: {
          p_amount: number
          p_category: string
          p_date: string
          p_description: string
          p_notes?: string
          p_user_id?: string
        }
        Returns: Json
      }
      record_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_mode: string
          p_notes?: string
          p_payment_date?: string
          p_reference?: string
          p_user_id?: string
        }
        Returns: Json
      }
      record_utility_consumption: {
        Args: {
          p_cost_center_id: string
          p_qty_consumed: number
          p_rate: number
          p_reading_date: string
          p_unit: string
          p_user_id?: string
          p_utility_type: string
        }
        Returns: Json
      }
      reject_grn: {
        Args: { p_grn_id: string; p_reject_reason: string; p_user_id?: string }
        Returns: Json
      }
      submit_batch_qc: {
        Args: {
          p_batch_id: string
          p_qc_data: Json
          p_user_id?: string
          p_verdict: string
        }
        Returns: Json
      }
      trigger_capa: {
        Args: {
          p_description: string
          p_source_id: string
          p_source_type: string
          p_user_id?: string
        }
        Returns: string
      }
      update_capa: {
        Args: {
          p_capa_id: string
          p_corrective_action: string
          p_preventive_action: string
          p_root_cause_analysis: Json
          p_status: string
          p_user_id?: string
          p_verification_notes: string
        }
        Returns: Json
      }
      update_equipment_status: { Args: never; Returns: undefined }
      update_site_setting: {
        Args: { p_key: string; p_user_id?: string; p_value: string }
        Returns: Json
      }
      update_user_role: {
        Args: {
          p_changed_by?: string
          p_new_role: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_allergen_matrix: {
        Args: {
          p_allergens: Json
          p_change_reason?: string
          p_compliance_standard?: string
          p_declared: boolean
          p_matrix_id?: string
          p_product_name: string
          p_user_id?: string
        }
        Returns: Json
      }
      upsert_product: {
        Args: {
          p_allergens?: Json
          p_data?: Json
          p_id?: string
          p_name?: string
          p_reason?: string
          p_recipe_id?: string
          p_slug?: string
          p_user_id?: string
        }
        Returns: string
      }
      upsert_sop: {
        Args: {
          p_category: string
          p_change_reason?: string
          p_compliance_standard?: string
          p_department?: string
          p_effective_date?: string
          p_notes?: string
          p_prepared_by?: string
          p_recipe_id?: string
          p_review_date?: string
          p_sop_id?: string
          p_sop_no: string
          p_title: string
          p_user_id?: string
          p_version: string
        }
        Returns: Json
      }
    }
    Enums: {
      rnd_formula_status:
        | "DRAFT"
        | "UNDER_TRIAL"
        | "APPROVED"
        | "LOCKED"
        | "ARCHIVED"
      rnd_trial_status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
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
      rnd_formula_status: [
        "DRAFT",
        "UNDER_TRIAL",
        "APPROVED",
        "LOCKED",
        "ARCHIVED",
      ],
      rnd_trial_status: ["PLANNED", "IN_PROGRESS", "COMPLETED", "FAILED"],
    },
  },
} as const
