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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_questions: {
        Row: {
          answer: string | null
          created_at: string
          created_by: string
          id: string
          mode: string
          question: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          created_by?: string
          id?: string
          mode: string
          question: string
        }
        Update: { [key: string]: never }
        Relationships: []
      }
      health_protocols: {
        Row: {
          active: boolean
          anchor: string
          created_at: string
          created_by: string | null
          dose_instructions: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          offset_days: number
          product: string | null
          repeat_every_days: number | null
          target: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validated_by_name: string | null
        }
        Insert: {
          active?: boolean
          anchor: string
          created_at?: string
          created_by?: string | null
          dose_instructions?: string | null
          id?: string
          kind: string
          name: string
          notes?: string | null
          offset_days: number
          product?: string | null
          repeat_every_days?: number | null
          target: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_name?: string | null
        }
        Update: {
          active?: boolean
          anchor?: string
          created_at?: string
          created_by?: string | null
          dose_instructions?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          offset_days?: number
          product?: string | null
          repeat_every_days?: number | null
          target?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_name?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string | null
          current_stock: number
          id: string
          location: string | null
          minimum_stock: number
          name: string
          notes: string | null
          supplier_id: string | null
          unit: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          created_by?: string | null
          current_stock?: number
          id?: string
          location?: string | null
          minimum_stock?: number
          name: string
          notes?: string | null
          supplier_id?: string | null
          unit: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          current_stock?: number
          id?: string
          location?: string | null
          minimum_stock?: number
          name?: string
          notes?: string | null
          supplier_id?: string | null
          unit?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          balance_after: number | null
          created_at: string
          created_by: string | null
          expiry_date: string | null
          from_location: string | null
          id: string
          invoice_number: string | null
          item_id: string
          lot: string | null
          movement_date: string
          movement_type: string
          quantity: number
          reason: string | null
          responsible: string | null
          supplier_id: string | null
          to_location: string | null
          unit_cost: number | null
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          from_location?: string | null
          id?: string
          invoice_number?: string | null
          item_id: string
          lot?: string | null
          movement_date?: string
          movement_type: string
          quantity: number
          reason?: string | null
          responsible?: string | null
          supplier_id?: string | null
          to_location?: string | null
          unit_cost?: number | null
        }
        Update: { [key: string]: never }
        Relationships: []
      }
      farm_settings: {
        Row: {
          approach_day: number
          attention_start_day: number
          diagnosis_day: number | null
          farm_name: string
          gestation_days: number
          heat_end_day: number
          heat_prep_day: number
          heat_start_day: number
          id: boolean
          intensive_day: number
          maternity_transfer_day: number | null
          updated_at: string
          updated_by: string | null
          weaning_age_days: number | null
        }
        Insert: { [key: string]: never }
        Update: {
          approach_day?: number
          attention_start_day?: number
          diagnosis_day?: number | null
          farm_name?: string
          gestation_days?: number
          heat_end_day?: number
          heat_prep_day?: number
          heat_start_day?: number
          intensive_day?: number
          maternity_transfer_day?: number | null
          weaning_age_days?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          changed_fields: string[] | null
          id: number
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          origin: string
          record_id: string | null
          table_name: string
        }
        Insert: { [key: string]: never }
        Update: { [key: string]: never }
        Relationships: []
      }
      user_access: {
        Row: {
          active: boolean
          last_seen_at: string | null
          role: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: { [key: string]: never }
        Update: { [key: string]: never }
        Relationships: []
      }
      ai_health_analyses: {
        Row: {
          affected_count: number | null
          ai_response: Json
          animal_category: string | null
          animal_count: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_path: string | null
          linked_health_event_id: string | null
          model_name: string | null
          onset_date: string | null
          pen_id: string | null
          production_phase: string | null
          sector: string | null
          severity_reported: string | null
          veterinarian_name: string | null
          veterinarian_review_date: string | null
          veterinarian_reviewed: boolean
        }
        Insert: {
          affected_count?: number | null
          ai_response: Json
          animal_category?: string | null
          animal_count?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          image_path?: string | null
          linked_health_event_id?: string | null
          model_name?: string | null
          onset_date?: string | null
          pen_id?: string | null
          production_phase?: string | null
          sector?: string | null
          severity_reported?: string | null
          veterinarian_name?: string | null
          veterinarian_review_date?: string | null
          veterinarian_reviewed?: boolean
        }
        Update: {
          affected_count?: number | null
          ai_response?: Json
          animal_category?: string | null
          animal_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_path?: string | null
          linked_health_event_id?: string | null
          model_name?: string | null
          onset_date?: string | null
          pen_id?: string | null
          production_phase?: string | null
          sector?: string | null
          severity_reported?: string | null
          veterinarian_name?: string | null
          veterinarian_review_date?: string | null
          veterinarian_reviewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_health_analyses_linked_health_event_id_fkey"
            columns: ["linked_health_event_id"]
            isOneToOne: false
            referencedRelation: "health_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_health_analyses_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_events: {
        Row: {
          batch_id: string
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type: string
          id?: string
          notes?: string | null
          quantity: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_feed_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          unit_cost: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          unit_cost?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_feed_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_feed_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "batch_feed_products"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_feed_products: {
        Row: {
          cost_per_unit: number
          created_at: string
          current_stock: number
          feed_stage: string
          id: string
          minimum_stock: number
          name: string
          notes: string | null
          supplier: string | null
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          feed_stage: string
          id?: string
          minimum_stock?: number
          name: string
          notes?: string | null
          supplier?: string | null
          unit?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          feed_stage?: string
          id?: string
          minimum_stock?: number
          name?: string
          notes?: string | null
          supplier?: string | null
          unit?: string
        }
        Relationships: []
      }
      batch_weights: {
        Row: {
          average_weight_kg: number
          batch_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          sample_size: number
          weigh_date: string
        }
        Insert: {
          average_weight_kg: number
          batch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          sample_size: number
          weigh_date?: string
        }
        Update: {
          average_weight_kg?: number
          batch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          sample_size?: number
          weigh_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_weights_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      biosecurity_checks: {
        Row: {
          check_date: string
          check_point: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          responsible: string | null
          result: string
          sector: string | null
          verified_at: string | null
        }
        Insert: {
          check_date?: string
          check_point: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string | null
          result: string
          sector?: string | null
          verified_at?: string | null
        }
        Update: {
          check_date?: string
          check_point?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string | null
          result?: string
          sector?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      boars: {
        Row: {
          birth_date: string | null
          breed: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          notes: string | null
          origin: string | null
          status: string
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          origin?: string | null
          status?: string
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          origin?: string | null
          status?: string
        }
        Relationships: []
      }
      breedings: {
        Row: {
          boar: string | null
          boar_id: string | null
          breeding_date: string
          breeding_time: string | null
          breeding_type: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          cycle_status: string
          dose_number: string | null
          expected_farrowing: string | null
          heat_check: string
          heat_check_date: string | null
          heat_notes: string | null
          id: string
          notes: string | null
          pregnancy_check: string
          prep_checklist: Json
          responsible: string | null
          semen_code: string | null
          services_count: number
          sow_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          boar?: string | null
          boar_id?: string | null
          breeding_date: string
          breeding_time?: string | null
          breeding_type?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          cycle_status?: string
          dose_number?: string | null
          expected_farrowing?: string | null
          heat_check?: string
          heat_check_date?: string | null
          heat_notes?: string | null
          id?: string
          notes?: string | null
          pregnancy_check?: string
          prep_checklist?: Json
          responsible?: string | null
          semen_code?: string | null
          services_count?: number
          sow_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          boar?: string | null
          boar_id?: string | null
          breeding_date?: string
          breeding_time?: string | null
          breeding_type?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          cycle_status?: string
          dose_number?: string | null
          expected_farrowing?: string | null
          heat_check?: string
          heat_check_date?: string | null
          heat_notes?: string | null
          id?: string
          notes?: string | null
          pregnancy_check?: string
          prep_checklist?: Json
          responsible?: string | null
          semen_code?: string | null
          services_count?: number
          sow_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breedings_boar_id_fkey"
            columns: ["boar_id"]
            isOneToOne: false
            referencedRelation: "boars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breedings_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_access_codes: {
        Row: {
          active: boolean
          code_hash: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          active?: boolean
          code_hash: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          active?: boolean
          code_hash?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: []
      }
      farm_medication_lots: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          lot_number: string
          medication_id: string
          purchase_date: string | null
          quantity: number
          storage_instructions: string | null
          storage_location: string | null
          supplier: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number: string
          medication_id: string
          purchase_date?: string | null
          quantity?: number
          storage_instructions?: string | null
          storage_location?: string | null
          supplier?: string | null
          unit?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number?: string
          medication_id?: string
          purchase_date?: string | null
          quantity?: number
          storage_instructions?: string | null
          storage_location?: string | null
          supplier?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_medication_lots_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "farm_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_medication_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          lot_id: string | null
          medication_id: string
          movement_date: string
          movement_type: string
          quantity: number
          reason: string | null
          reference_text: string | null
          responsible: string | null
          supplier_id: string | null
          unit: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          lot_id?: string | null
          medication_id: string
          movement_date?: string
          movement_type: string
          quantity: number
          reason?: string | null
          reference_text?: string | null
          responsible?: string | null
          supplier_id?: string | null
          unit: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          lot_id?: string | null
          medication_id?: string
          movement_date?: string
          movement_type?: string
          quantity?: number
          reason?: string | null
          reference_text?: string | null
          responsible?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_medication_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "farm_medication_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_medication_movements_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "farm_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_medications: {
        Row: {
          active_ingredient: string | null
          administration_routes: string[]
          concentration: string | null
          contraindications: string | null
          created_at: string
          created_by: string | null
          id: string
          indications: string | null
          interactions: string | null
          label_file_path: string | null
          label_text: string | null
          manufacturer: string | null
          meat_withdrawal_days: number | null
          milk_withdrawal_days: number | null
          name: string
          notes: string | null
          package_volume: string | null
          presentation: string | null
          requires_veterinary_prescription: boolean
          therapeutic_class: string | null
          updated_at: string
          warnings: string | null
        }
        Insert: {
          active_ingredient?: string | null
          administration_routes?: string[]
          concentration?: string | null
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          indications?: string | null
          interactions?: string | null
          label_file_path?: string | null
          label_text?: string | null
          manufacturer?: string | null
          meat_withdrawal_days?: number | null
          milk_withdrawal_days?: number | null
          name: string
          notes?: string | null
          package_volume?: string | null
          presentation?: string | null
          requires_veterinary_prescription?: boolean
          therapeutic_class?: string | null
          updated_at?: string
          warnings?: string | null
        }
        Update: {
          active_ingredient?: string | null
          administration_routes?: string[]
          concentration?: string | null
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          indications?: string | null
          interactions?: string | null
          label_file_path?: string | null
          label_text?: string | null
          manufacturer?: string | null
          meat_withdrawal_days?: number | null
          milk_withdrawal_days?: number | null
          name?: string
          notes?: string | null
          package_volume?: string | null
          presentation?: string | null
          requires_veterinary_prescription?: boolean
          therapeutic_class?: string | null
          updated_at?: string
          warnings?: string | null
        }
        Relationships: []
      }
      farm_pens: {
        Row: {
          animal_type: string | null
          building: string | null
          capacity: number
          code: string
          created_at: string
          id: string
          notes: string | null
          room: string | null
          sector: string
          status: string
        }
        Insert: {
          animal_type?: string | null
          building?: string | null
          capacity: number
          code: string
          created_at?: string
          id?: string
          notes?: string | null
          room?: string | null
          sector: string
          status?: string
        }
        Update: {
          animal_type?: string | null
          building?: string | null
          capacity?: number
          code?: string
          created_at?: string
          id?: string
          notes?: string | null
          room?: string | null
          sector?: string
          status?: string
        }
        Relationships: []
      }
      farm_visit_reports: {
        Row: {
          created_at: string
          created_by: string | null
          findings: string | null
          id: string
          notes: string | null
          recommendations: string | null
          records_reviewed: string | null
          return_date: string | null
          sectors_reviewed: string | null
          visit_date: string
          visitor_name: string
          visitor_role: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          recommendations?: string | null
          records_reviewed?: string | null
          return_date?: string | null
          sectors_reviewed?: string | null
          visit_date?: string
          visitor_name: string
          visitor_role?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          recommendations?: string | null
          records_reviewed?: string | null
          return_date?: string | null
          sectors_reviewed?: string | null
          visit_date?: string
          visitor_name?: string
          visitor_role?: string | null
        }
        Relationships: []
      }
      feed_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          movement_date: string
          movement_type: string
          notes: string | null
          pen_id: string | null
          pen_record_id: string | null
          product_id: string
          quantity_kg: number
          supplier_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          movement_date?: string
          movement_type: string
          notes?: string | null
          pen_id?: string | null
          pen_record_id?: string | null
          product_id: string
          quantity_kg: number
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          movement_date?: string
          movement_type?: string
          notes?: string | null
          pen_id?: string | null
          pen_record_id?: string | null
          product_id?: string
          quantity_kg?: number
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_movements_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_movements_pen_record_id_fkey"
            columns: ["pen_record_id"]
            isOneToOne: true
            referencedRelation: "pen_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "feed_products"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_products: {
        Row: {
          bag_weight_kg: number | null
          cost_per_kg: number | null
          created_at: string
          id: string
          minimum_stock_kg: number
          name: string
          phase: string
          stock_kg: number
          supplier: string | null
        }
        Insert: {
          bag_weight_kg?: number | null
          cost_per_kg?: number | null
          created_at?: string
          id?: string
          minimum_stock_kg?: number
          name: string
          phase: string
          stock_kg?: number
          supplier?: string | null
        }
        Update: {
          bag_weight_kg?: number | null
          cost_per_kg?: number | null
          created_at?: string
          id?: string
          minimum_stock_kg?: number
          name?: string
          phase?: string
          stock_kg?: number
          supplier?: string | null
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          batch_id: string | null
          category: string
          cost_center: string | null
          counterpart: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_number: string | null
          due_date: string | null
          entry_date: string
          entry_type: string
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          supplier_id: string | null
        }
        Insert: {
          amount: number
          batch_id?: string | null
          category: string
          cost_center?: string | null
          counterpart?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_number?: string | null
          due_date?: string | null
          entry_date?: string
          entry_type: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          category?: string
          cost_center?: string | null
          counterpart?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_number?: string | null
          due_date?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      gestation_events: {
        Row: {
          breeding_id: string | null
          confirmed: boolean
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          loss_count: number | null
          notes: string | null
          possible_cause: string | null
          responsible: string | null
          signs: string | null
          sow_id: string
          vet_evaluation: string | null
        }
        Insert: {
          breeding_id?: string | null
          confirmed?: boolean
          created_at?: string
          created_by?: string | null
          event_date: string
          event_type: string
          id?: string
          loss_count?: number | null
          notes?: string | null
          possible_cause?: string | null
          responsible?: string | null
          signs?: string | null
          sow_id: string
          vet_evaluation?: string | null
        }
        Update: {
          breeding_id?: string | null
          confirmed?: boolean
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          loss_count?: number | null
          notes?: string | null
          possible_cause?: string | null
          responsible?: string | null
          signs?: string | null
          sow_id?: string
          vet_evaluation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gestation_events_breeding_id_fkey"
            columns: ["breeding_id"]
            isOneToOne: false
            referencedRelation: "breedings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestation_events_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      health_events: {
        Row: {
          action_taken: string | null
          affected_count: number
          animal_count: number
          clinical_signs: string
          created_at: string
          created_by: string | null
          death_count: number
          event_date: string
          feed_change: boolean
          follow_up_date: string | null
          id: string
          isolation_started: boolean
          notes: string | null
          onset_date: string | null
          pen_id: string | null
          production_phase: string | null
          sector: string
          severity: string
          sign_group: string
          status: string
          suspected_condition: string | null
          veterinarian_name: string | null
          veterinarian_notified: boolean
          water_change: boolean
        }
        Insert: {
          action_taken?: string | null
          affected_count?: number
          animal_count?: number
          clinical_signs: string
          created_at?: string
          created_by?: string | null
          death_count?: number
          event_date?: string
          feed_change?: boolean
          follow_up_date?: string | null
          id?: string
          isolation_started?: boolean
          notes?: string | null
          onset_date?: string | null
          pen_id?: string | null
          production_phase?: string | null
          sector: string
          severity?: string
          sign_group: string
          status?: string
          suspected_condition?: string | null
          veterinarian_name?: string | null
          veterinarian_notified?: boolean
          water_change?: boolean
        }
        Update: {
          action_taken?: string | null
          affected_count?: number
          animal_count?: number
          clinical_signs?: string
          created_at?: string
          created_by?: string | null
          death_count?: number
          event_date?: string
          feed_change?: boolean
          follow_up_date?: string | null
          id?: string
          isolation_started?: boolean
          notes?: string | null
          onset_date?: string | null
          pen_id?: string | null
          production_phase?: string | null
          sector?: string
          severity?: string
          sign_group?: string
          status?: string
          suspected_condition?: string | null
          veterinarian_name?: string | null
          veterinarian_notified?: boolean
          water_change?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "health_events_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          animal_group: string
          batch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          dosage: string | null
          id: string
          litter_id: string | null
          notes: string
          product: string | null
          record_date: string
          responsible: string | null
          sow_id: string | null
          withdrawal_days: number
        }
        Insert: {
          animal_group: string
          batch_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          id?: string
          litter_id?: string | null
          notes: string
          product?: string | null
          record_date?: string
          responsible?: string | null
          sow_id?: string | null
          withdrawal_days?: number
        }
        Update: {
          animal_group?: string
          batch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          id?: string
          litter_id?: string | null
          notes?: string
          product?: string | null
          record_date?: string
          responsible?: string | null
          sow_id?: string | null
          withdrawal_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      health_samples: {
        Row: {
          collected_by: string | null
          created_at: string
          created_by: string | null
          health_event_id: string | null
          id: string
          laboratory: string | null
          notes: string | null
          requested_tests: string | null
          result_status: string
          result_summary: string | null
          reviewed_at: string | null
          reviewed_by_vet: string | null
          sample_date: string
          sample_origin: string | null
          sample_type: string
          storage_condition: string | null
        }
        Insert: {
          collected_by?: string | null
          created_at?: string
          created_by?: string | null
          health_event_id?: string | null
          id?: string
          laboratory?: string | null
          notes?: string | null
          requested_tests?: string | null
          result_status?: string
          result_summary?: string | null
          reviewed_at?: string | null
          reviewed_by_vet?: string | null
          sample_date?: string
          sample_origin?: string | null
          sample_type: string
          storage_condition?: string | null
        }
        Update: {
          collected_by?: string | null
          created_at?: string
          created_by?: string | null
          health_event_id?: string | null
          id?: string
          laboratory?: string | null
          notes?: string | null
          requested_tests?: string | null
          result_status?: string
          result_summary?: string | null
          reviewed_at?: string | null
          reviewed_by_vet?: string | null
          sample_date?: string
          sample_origin?: string | null
          sample_type?: string
          storage_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_samples_health_event_id_fkey"
            columns: ["health_event_id"]
            isOneToOne: false
            referencedRelation: "health_events"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_checks: {
        Row: {
          check_date: string
          confidence: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          observed_status: string
          pen_code: string | null
          piglets_counted: number | null
          sow_id: string | null
        }
        Insert: {
          check_date?: string
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          observed_status?: string
          pen_code?: string | null
          piglets_counted?: number | null
          sow_id?: string | null
        }
        Update: {
          check_date?: string
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          observed_status?: string
          pen_code?: string | null
          piglets_counted?: number | null
          sow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_checks_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      litter_events: {
        Row: {
          cause: string | null
          created_at: string
          created_by: string | null
          destination: string | null
          destination_pen_id: string | null
          event_date: string
          event_type: string
          females: number | null
          id: string
          litter_id: string
          males: number | null
          note: string | null
          piglet_id: string | null
          quantity: number
          related_litter_id: string | null
          responsible: string | null
          value: number | null
          weight_kg: number | null
        }
        Insert: {
          cause?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          destination_pen_id?: string | null
          event_date?: string
          event_type: string
          females?: number | null
          id?: string
          litter_id: string
          males?: number | null
          note?: string | null
          piglet_id?: string | null
          quantity?: number
          related_litter_id?: string | null
          responsible?: string | null
          value?: number | null
          weight_kg?: number | null
        }
        Update: {
          cause?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          destination_pen_id?: string | null
          event_date?: string
          event_type?: string
          females?: number | null
          id?: string
          litter_id?: string
          males?: number | null
          note?: string | null
          piglet_id?: string | null
          quantity?: number
          related_litter_id?: string | null
          responsible?: string | null
          value?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "litter_events_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      litters: {
        Row: {
          avg_weight: number | null
          born_alive: number
          born_total: number
          breeding_id: string | null
          complications: string[]
          created_at: string
          created_by: string | null
          deaths: number
          end_time: string | null
          farrowing_date: string
          farrowing_notes: string | null
          id: string
          mummified: number
          pen_id: string | null
          responsible: string | null
          runts: number | null
          sow_id: string
          start_time: string | null
          status: string
          stillborn: number
          transfers_in: number
          transfers_out: number
          weaned: number | null
          weaning_date: string | null
        }
        Insert: {
          avg_weight?: number | null
          born_alive?: number
          born_total?: number
          breeding_id?: string | null
          complications?: string[]
          created_at?: string
          created_by?: string | null
          deaths?: number
          end_time?: string | null
          farrowing_date: string
          farrowing_notes?: string | null
          id?: string
          mummified?: number
          pen_id?: string | null
          responsible?: string | null
          runts?: number | null
          sow_id: string
          start_time?: string | null
          status?: string
          stillborn?: number
          transfers_in?: number
          transfers_out?: number
          weaned?: number | null
          weaning_date?: string | null
        }
        Update: {
          avg_weight?: number | null
          born_alive?: number
          born_total?: number
          breeding_id?: string | null
          complications?: string[]
          created_at?: string
          created_by?: string | null
          deaths?: number
          end_time?: string | null
          farrowing_date?: string
          farrowing_notes?: string | null
          id?: string
          mummified?: number
          pen_id?: string | null
          responsible?: string | null
          runts?: number | null
          sow_id?: string
          start_time?: string | null
          status?: string
          stillborn?: number
          transfers_in?: number
          transfers_out?: number
          weaned?: number | null
          weaning_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "litters_breeding_id_fkey"
            columns: ["breeding_id"]
            isOneToOne: false
            referencedRelation: "breedings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_records: {
        Row: {
          active_ingredient: string | null
          administration_end: string | null
          administration_start: string
          animal_scope: string
          animals_treated: number
          batch: string | null
          created_at: string
          created_by: string | null
          dose_as_prescribed: string | null
          feed_amount_kg: number | null
          frequency: string | null
          health_event_id: string | null
          id: string
          is_antimicrobial: boolean
          litter_id: string | null
          notes: string | null
          piglet_identifier: string | null
          prescription_reference: string | null
          product_name: string
          responsible: string | null
          route: string | null
          sow_id: string | null
          therapeutic_class: string | null
          veterinarian: string | null
          water_amount_liters: number | null
          withdrawal_days: number
        }
        Insert: {
          active_ingredient?: string | null
          administration_end?: string | null
          administration_start?: string
          animal_scope?: string
          animals_treated?: number
          batch?: string | null
          created_at?: string
          created_by?: string | null
          dose_as_prescribed?: string | null
          feed_amount_kg?: number | null
          frequency?: string | null
          health_event_id?: string | null
          id?: string
          is_antimicrobial?: boolean
          litter_id?: string | null
          notes?: string | null
          piglet_identifier?: string | null
          prescription_reference?: string | null
          product_name: string
          responsible?: string | null
          route?: string | null
          sow_id?: string | null
          therapeutic_class?: string | null
          veterinarian?: string | null
          water_amount_liters?: number | null
          withdrawal_days?: number
        }
        Update: {
          active_ingredient?: string | null
          administration_end?: string | null
          administration_start?: string
          animal_scope?: string
          animals_treated?: number
          batch?: string | null
          created_at?: string
          created_by?: string | null
          dose_as_prescribed?: string | null
          feed_amount_kg?: number | null
          frequency?: string | null
          health_event_id?: string | null
          id?: string
          is_antimicrobial?: boolean
          litter_id?: string | null
          notes?: string | null
          piglet_identifier?: string | null
          prescription_reference?: string | null
          product_name?: string
          responsible?: string | null
          route?: string | null
          sow_id?: string | null
          therapeutic_class?: string | null
          veterinarian?: string | null
          water_amount_liters?: number | null
          withdrawal_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "medication_records_health_event_id_fkey"
            columns: ["health_event_id"]
            isOneToOne: false
            referencedRelation: "health_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_records_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_records_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_records: {
        Row: {
          animals_affected: number
          animals_observed: number
          created_at: string
          created_by: string | null
          deaths: number
          duration_days: number | null
          id: string
          indicator: string
          monitoring_date: string
          monitoring_type: string
          notes: string | null
          pen_id: string | null
          production_phase: string | null
          score: string | null
        }
        Insert: {
          animals_affected?: number
          animals_observed?: number
          created_at?: string
          created_by?: string | null
          deaths?: number
          duration_days?: number | null
          id?: string
          indicator: string
          monitoring_date?: string
          monitoring_type: string
          notes?: string | null
          pen_id?: string | null
          production_phase?: string | null
          score?: string | null
        }
        Update: {
          animals_affected?: number
          animals_observed?: number
          created_at?: string
          created_by?: string | null
          deaths?: number
          duration_days?: number | null
          id?: string
          indicator?: string
          monitoring_date?: string
          monitoring_type?: string
          notes?: string | null
          pen_id?: string | null
          production_phase?: string | null
          score?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_records_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
            referencedColumns: ["id"]
          },
        ]
      }
      pen_records: {
        Row: {
          animal_count: number | null
          created_at: string
          created_by: string | null
          event_date: string
          feed_kg: number
          feed_product_id: string | null
          id: string
          notes: string | null
          pen_id: string
          record_type: string
          temperature_c: number | null
          water_liters: number | null
        }
        Insert: {
          animal_count?: number | null
          created_at?: string
          created_by?: string | null
          event_date?: string
          feed_kg?: number
          feed_product_id?: string | null
          id?: string
          notes?: string | null
          pen_id: string
          record_type: string
          temperature_c?: number | null
          water_liters?: number | null
        }
        Update: {
          animal_count?: number | null
          created_at?: string
          created_by?: string | null
          event_date?: string
          feed_kg?: number
          feed_product_id?: string | null
          id?: string
          notes?: string | null
          pen_id?: string
          record_type?: string
          temperature_c?: number | null
          water_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pen_records_feed_product_id_fkey"
            columns: ["feed_product_id"]
            isOneToOne: false
            referencedRelation: "feed_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pen_records_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
            referencedColumns: ["id"]
          },
        ]
      }
      piglet_identifications: {
        Row: {
          australian_number: number
          birth_condition: string | null
          birth_date: string | null
          birth_weight_kg: number | null
          castration_date: string | null
          colostrum_checked: boolean | null
          created_at: string
          created_by: string | null
          death_cause: string | null
          death_date: string | null
          id: string
          iron_date: string | null
          litter_id: string
          marked_date: string
          notes: string | null
          pen_id: string | null
          piglet_number: number
          sex: string | null
          status: string
          tail_dock_date: string | null
          weaning_date: string | null
          weaning_weight_kg: number | null
        }
        Insert: {
          australian_number: number
          birth_condition?: string | null
          birth_date?: string | null
          birth_weight_kg?: number | null
          castration_date?: string | null
          colostrum_checked?: boolean | null
          created_at?: string
          created_by?: string | null
          death_cause?: string | null
          death_date?: string | null
          id?: string
          iron_date?: string | null
          litter_id: string
          marked_date?: string
          notes?: string | null
          pen_id?: string | null
          piglet_number: number
          sex?: string | null
          status?: string
          tail_dock_date?: string | null
          weaning_date?: string | null
          weaning_weight_kg?: number | null
        }
        Update: {
          australian_number?: number
          birth_condition?: string | null
          birth_date?: string | null
          birth_weight_kg?: number | null
          castration_date?: string | null
          colostrum_checked?: boolean | null
          created_at?: string
          created_by?: string | null
          death_cause?: string | null
          death_date?: string | null
          id?: string
          iron_date?: string | null
          litter_id?: string
          marked_date?: string
          notes?: string | null
          pen_id?: string | null
          piglet_number?: number
          sex?: string | null
          status?: string
          tail_dock_date?: string | null
          weaning_date?: string | null
          weaning_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "piglet_identifications_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      pregnancy_diagnoses: {
        Row: {
          breeding_id: string
          created_at: string
          created_by: string | null
          diagnosis_date: string
          id: string
          method: string
          next_check_date: string | null
          notes: string | null
          responsible: string | null
          result: string
          sow_id: string
        }
        Insert: {
          breeding_id: string
          created_at?: string
          created_by?: string | null
          diagnosis_date: string
          id?: string
          method: string
          next_check_date?: string | null
          notes?: string | null
          responsible?: string | null
          result: string
          sow_id: string
        }
        Update: {
          breeding_id?: string
          created_at?: string
          created_by?: string | null
          diagnosis_date?: string
          id?: string
          method?: string
          next_check_date?: string | null
          notes?: string | null
          responsible?: string | null
          result?: string
          sow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregnancy_diagnoses_breeding_id_fkey"
            columns: ["breeding_id"]
            isOneToOne: false
            referencedRelation: "breedings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_diagnoses_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          created_at: string
          current_headcount: number
          entry_date: string
          id: string
          initial_headcount: number
          name: string
          notes: string | null
          origin: string | null
          pen: string | null
          phase: string
          status: string
        }
        Insert: {
          created_at?: string
          current_headcount: number
          entry_date?: string
          id?: string
          initial_headcount: number
          name: string
          notes?: string | null
          origin?: string | null
          pen?: string | null
          phase: string
          status?: string
        }
        Update: {
          created_at?: string
          current_headcount?: number
          entry_date?: string
          id?: string
          initial_headcount?: number
          name?: string
          notes?: string | null
          origin?: string | null
          pen?: string | null
          phase?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      sow_events: {
        Row: {
          created_at: string
          created_by: string | null
          destination: string | null
          event_date: string
          event_type: string
          id: string
          notes: string | null
          sale_value: number | null
          sow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          event_date?: string
          event_type: string
          id?: string
          notes?: string | null
          sale_value?: number | null
          sow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          sale_value?: number | null
          sow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sow_events_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      sows: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
          birth_date: string | null
          breed: string | null
          category: string | null
          condition: string | null
          created_at: string
          dam: string | null
          ear_tag: string
          entry_date: string | null
          group_label: string | null
          id: string
          lineage: string | null
          name: string | null
          notes: string | null
          origin: string | null
          pen_id: string | null
          photo_path: string | null
          sire: string | null
          status: string
          weight_date: string | null
          weight_kg: number | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          birth_date?: string | null
          breed?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          dam?: string | null
          ear_tag: string
          entry_date?: string | null
          group_label?: string | null
          id?: string
          lineage?: string | null
          name?: string | null
          notes?: string | null
          origin?: string | null
          pen_id?: string | null
          photo_path?: string | null
          sire?: string | null
          status?: string
          weight_date?: string | null
          weight_kg?: number | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          birth_date?: string | null
          breed?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          dam?: string | null
          ear_tag?: string
          entry_date?: string | null
          group_label?: string | null
          id?: string
          lineage?: string | null
          name?: string | null
          notes?: string | null
          origin?: string | null
          pen_id?: string | null
          photo_path?: string | null
          sire?: string | null
          status?: string
          weight_date?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          litter_id: string | null
          notes: string | null
          priority: string
          sector: string | null
          sow_id: string | null
          status: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          litter_id?: string | null
          notes?: string | null
          priority?: string
          sector?: string | null
          sow_id?: string | null
          status?: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          litter_id?: string | null
          notes?: string | null
          priority?: string
          sector?: string | null
          sow_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccination_records: {
        Row: {
          animal_scope: string
          animals_planned: number
          animals_vaccinated: number
          batch: string | null
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          litter_id: string | null
          manufacturer: string | null
          next_due_date: string | null
          notes: string | null
          pen_id: string | null
          piglet_identifier: string | null
          protocol_reference: string | null
          responsible: string | null
          route: string | null
          sow_id: string | null
          target_group: string
          vaccination_date: string
          vaccine_name: string
          veterinarian: string | null
        }
        Insert: {
          animal_scope?: string
          animals_planned?: number
          animals_vaccinated?: number
          batch?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          litter_id?: string | null
          manufacturer?: string | null
          next_due_date?: string | null
          notes?: string | null
          pen_id?: string | null
          piglet_identifier?: string | null
          protocol_reference?: string | null
          responsible?: string | null
          route?: string | null
          sow_id?: string | null
          target_group: string
          vaccination_date?: string
          vaccine_name: string
          veterinarian?: string | null
        }
        Update: {
          animal_scope?: string
          animals_planned?: number
          animals_vaccinated?: number
          batch?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          litter_id?: string | null
          manufacturer?: string | null
          next_due_date?: string | null
          notes?: string | null
          pen_id?: string | null
          piglet_identifier?: string | null
          protocol_reference?: string | null
          responsible?: string | null
          route?: string | null
          sow_id?: string | null
          target_group?: string
          vaccination_date?: string
          vaccine_name?: string
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_records_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_records_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      veterinary_treatment_records: {
        Row: {
          administration_route: string | null
          animal_group: string | null
          animals_treated: number | null
          created_at: string
          created_by: string | null
          end_date: string | null
          frequency: string | null
          health_event_id: string | null
          id: string
          lot_id: string | null
          medication_id: string | null
          notes: string | null
          pen_id: string | null
          prescribed_dose: string
          prescription_reference: string
          responsible: string | null
          start_date: string
          status: string
          veterinarian_name: string
          withdrawal_meat_until: string | null
          withdrawal_milk_until: string | null
        }
        Insert: {
          administration_route?: string | null
          animal_group?: string | null
          animals_treated?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          frequency?: string | null
          health_event_id?: string | null
          id?: string
          lot_id?: string | null
          medication_id?: string | null
          notes?: string | null
          pen_id?: string | null
          prescribed_dose: string
          prescription_reference: string
          responsible?: string | null
          start_date: string
          status?: string
          veterinarian_name: string
          withdrawal_meat_until?: string | null
          withdrawal_milk_until?: string | null
        }
        Update: {
          administration_route?: string | null
          animal_group?: string | null
          animals_treated?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          frequency?: string | null
          health_event_id?: string | null
          id?: string
          lot_id?: string | null
          medication_id?: string | null
          notes?: string | null
          pen_id?: string | null
          prescribed_dose?: string
          prescription_reference?: string
          responsible?: string | null
          start_date?: string
          status?: string
          veterinarian_name?: string
          withdrawal_meat_until?: string | null
          withdrawal_milk_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veterinary_treatment_records_health_event_id_fkey"
            columns: ["health_event_id"]
            isOneToOne: false
            referencedRelation: "health_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinary_treatment_records_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "farm_medication_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinary_treatment_records_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "farm_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veterinary_treatment_records_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
            referencedColumns: ["id"]
          },
        ]
      }
      weaning_feed_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          litter_id: string
          notes: string | null
          ration_1_days: number
          ration_1_name: string
          ration_2_days: number
          ration_2_name: string
          ration_3_days: number
          ration_3_name: string
          ration_4_days: number
          ration_4_name: string
          ration_5_days: number
          ration_5_name: string
          ration_6_days: number
          ration_6_name: string
          ration_7_days: number
          ration_7_name: string
          updated_at: string
          weaning_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          litter_id: string
          notes?: string | null
          ration_1_days?: number
          ration_1_name?: string
          ration_2_days?: number
          ration_2_name?: string
          ration_3_days?: number
          ration_3_name?: string
          ration_4_days?: number
          ration_4_name?: string
          ration_5_days?: number
          ration_5_name?: string
          ration_6_days?: number
          ration_6_name?: string
          ration_7_days?: number
          ration_7_name?: string
          updated_at?: string
          weaning_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          litter_id?: string
          notes?: string | null
          ration_1_days?: number
          ration_1_name?: string
          ration_2_days?: number
          ration_2_name?: string
          ration_3_days?: number
          ration_3_name?: string
          ration_4_days?: number
          ration_4_name?: string
          ration_5_days?: number
          ration_5_name?: string
          ration_6_days?: number
          ration_6_name?: string
          ration_7_days?: number
          ration_7_name?: string
          updated_at?: string
          weaning_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weaning_feed_schedules_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: true
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      access_role: { Args: never; Returns: string | null }
      can_delete: { Args: never; Returns: boolean }
      can_manage_farm: { Args: never; Returns: boolean }
      can_manage_health: { Args: never; Returns: boolean }
      can_view_audit: { Args: never; Returns: boolean }
      can_write: { Args: never; Returns: boolean }
      farm_users: {
        Args: never
        Returns: {
          active: boolean
          display_name: string | null
          email: string | null
          joined_at: string | null
          last_seen_at: string | null
          role: string
          user_id: string
        }[]
      }
      is_farm_admin: { Args: never; Returns: boolean }
      set_user_access: {
        Args: { p_active: boolean; p_role: string; p_user_id: string }
        Returns: undefined
      }
      touch_last_seen: { Args: never; Returns: undefined }
      transfer_piglets: {
        Args: { p_date: string; p_from: string; p_quantity: number; p_reason: string; p_responsible: string; p_to: string }
        Returns: undefined
      }
      create_farm_access_code: { Args: { p_code: string }; Returns: undefined }
      delete_sow: { Args: { p_sow_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "member"
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
    Enums: {
      app_role: ["member"],
    },
  },
} as const
