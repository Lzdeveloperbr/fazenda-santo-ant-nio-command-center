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
      breedings: {
        Row: {
          boar: string | null
          breeding_date: string
          created_at: string
          expected_farrowing: string | null
          id: string
          pregnancy_check: string
          sow_id: string
        }
        Insert: {
          boar?: string | null
          breeding_date: string
          created_at?: string
          expected_farrowing?: string | null
          id?: string
          pregnancy_check?: string
          sow_id: string
        }
        Update: {
          boar?: string | null
          breeding_date?: string
          created_at?: string
          expected_farrowing?: string | null
          id?: string
          pregnancy_check?: string
          sow_id?: string
        }
        Relationships: [
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
          lot_id: string | null
          medication_id: string
          movement_date: string
          movement_type: string
          quantity: number
          reason: string | null
          reference_text: string | null
          responsible: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lot_id?: string | null
          medication_id: string
          movement_date?: string
          movement_type: string
          quantity: number
          reason?: string | null
          reference_text?: string | null
          responsible?: string | null
          unit: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lot_id?: string | null
          medication_id?: string
          movement_date?: string
          movement_type?: string
          quantity?: number
          reason?: string | null
          reference_text?: string | null
          responsible?: string | null
          unit?: string
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
          capacity: number
          code: string
          created_at: string
          id: string
          notes: string | null
          sector: string
          status: string
        }
        Insert: {
          capacity: number
          code: string
          created_at?: string
          id?: string
          notes?: string | null
          sector: string
          status?: string
        }
        Update: {
          capacity?: number
          code?: string
          created_at?: string
          id?: string
          notes?: string | null
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
          movement_date: string
          movement_type: string
          notes: string | null
          pen_id: string | null
          pen_record_id: string | null
          product_id: string
          quantity_kg: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          pen_id?: string | null
          pen_record_id?: string | null
          product_id: string
          quantity_kg: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          pen_id?: string | null
          pen_record_id?: string | null
          product_id?: string
          quantity_kg?: number
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
          counterpart: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          entry_date: string
          entry_type: string
          id: string
          status: string
        }
        Insert: {
          amount: number
          batch_id?: string | null
          category: string
          counterpart?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entry_date?: string
          entry_type: string
          id?: string
          status?: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          category?: string
          counterpart?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          status?: string
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
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          litter_id: string
          note: string | null
          quantity: number
          value: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type: string
          id?: string
          litter_id: string
          note?: string | null
          quantity?: number
          value?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          litter_id?: string
          note?: string | null
          quantity?: number
          value?: number | null
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
          created_at: string
          deaths: number
          farrowing_date: string
          id: string
          sow_id: string
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
          created_at?: string
          deaths?: number
          farrowing_date: string
          id?: string
          sow_id: string
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
          created_at?: string
          deaths?: number
          farrowing_date?: string
          id?: string
          sow_id?: string
          status?: string
          stillborn?: number
          transfers_in?: number
          transfers_out?: number
          weaned?: number | null
          weaning_date?: string | null
        }
        Relationships: [
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
          notes: string | null
          prescription_reference: string | null
          product_name: string
          responsible: string | null
          route: string | null
          therapeutic_class: string | null
          veterinarian: string | null
          water_amount_liters: number | null
          withdrawal_days: number
        }
        Insert: {
          active_ingredient?: string | null
          administration_end?: string | null
          administration_start?: string
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
          notes?: string | null
          prescription_reference?: string | null
          product_name: string
          responsible?: string | null
          route?: string | null
          therapeutic_class?: string | null
          veterinarian?: string | null
          water_amount_liters?: number | null
          withdrawal_days?: number
        }
        Update: {
          active_ingredient?: string | null
          administration_end?: string | null
          administration_start?: string
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
          notes?: string | null
          prescription_reference?: string | null
          product_name?: string
          responsible?: string | null
          route?: string | null
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
          birth_date: string | null
          birth_weight_kg: number | null
          created_at: string
          created_by: string | null
          id: string
          litter_id: string
          marked_date: string
          notes: string | null
          piglet_number: number
          sex: string | null
        }
        Insert: {
          australian_number: number
          birth_date?: string | null
          birth_weight_kg?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          litter_id: string
          marked_date?: string
          notes?: string | null
          piglet_number: number
          sex?: string | null
        }
        Update: {
          australian_number?: number
          birth_date?: string | null
          birth_weight_kg?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          litter_id?: string
          marked_date?: string
          notes?: string | null
          piglet_number?: number
          sex?: string | null
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
          event_date: string
          event_type: string
          id: string
          notes: string | null
          sow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type: string
          id?: string
          notes?: string | null
          sow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
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
          birth_date: string | null
          breed: string | null
          created_at: string
          ear_tag: string
          id: string
          name: string | null
          notes: string | null
          status: string
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          ear_tag: string
          id?: string
          name?: string | null
          notes?: string | null
          status?: string
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          ear_tag?: string
          id?: string
          name?: string | null
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          litter_id: string | null
          priority: string
          sector: string | null
          sow_id: string | null
          status: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          litter_id?: string | null
          priority?: string
          sector?: string | null
          sow_id?: string | null
          status?: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          litter_id?: string | null
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
          animals_planned: number
          animals_vaccinated: number
          batch: string | null
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          manufacturer: string | null
          next_due_date: string | null
          notes: string | null
          pen_id: string | null
          protocol_reference: string | null
          responsible: string | null
          route: string | null
          target_group: string
          vaccination_date: string
          vaccine_name: string
          veterinarian: string | null
        }
        Insert: {
          animals_planned?: number
          animals_vaccinated?: number
          batch?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          manufacturer?: string | null
          next_due_date?: string | null
          notes?: string | null
          pen_id?: string | null
          protocol_reference?: string | null
          responsible?: string | null
          route?: string | null
          target_group: string
          vaccination_date?: string
          vaccine_name: string
          veterinarian?: string | null
        }
        Update: {
          animals_planned?: number
          animals_vaccinated?: number
          batch?: string | null
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          manufacturer?: string | null
          next_due_date?: string | null
          notes?: string | null
          pen_id?: string | null
          protocol_reference?: string | null
          responsible?: string | null
          route?: string | null
          target_group?: string
          vaccination_date?: string
          vaccine_name?: string
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "farm_pens"
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
      create_farm_access_code: { Args: { p_code: string }; Returns: undefined }
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
