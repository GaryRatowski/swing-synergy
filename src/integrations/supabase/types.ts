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
      assessment_logs: {
        Row: {
          assessed_by: string
          assessed_date: string | null
          attachments: Json | null
          client_id: string
          created_at: string | null
          id: string
          notes: string | null
          results: Json
          template_id: string | null
        }
        Insert: {
          assessed_by: string
          assessed_date?: string | null
          attachments?: Json | null
          client_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          results?: Json
          template_id?: string | null
        }
        Update: {
          assessed_by?: string
          assessed_date?: string | null
          attachments?: Json | null
          client_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          results?: Json
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_templates: {
        Row: {
          checklist_items: Json
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          checklist_items?: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          checklist_items?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_event_mappings: {
        Row: {
          client_id: string
          created_at: string | null
          event_start: string | null
          event_title: string | null
          google_event_id: string
          id: string
          workout_log_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          event_start?: string | null
          event_title?: string | null
          google_event_id: string
          id?: string
          workout_log_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          event_start?: string | null
          event_title?: string | null
          google_event_id?: string
          id?: string
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_mappings_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_active_metrics: {
        Row: {
          client_id: string
          created_at: string | null
          enabled_by: string
          enabled_date: string | null
          id: string
          metric_type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          enabled_by: string
          enabled_date?: string | null
          id?: string
          metric_type: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          enabled_by?: string
          enabled_date?: string | null
          id?: string
          metric_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_active_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_active_metrics_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_active_metrics_metric_type_fkey"
            columns: ["metric_type"]
            isOneToOne: false
            referencedRelation: "metric_definitions"
            referencedColumns: ["metric_type"]
          },
        ]
      }
      client_documents: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          notes: string | null
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          notes?: string | null
          uploaded_by: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          notes?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      client_programs: {
        Row: {
          assigned_by: string
          client_id: string
          created_at: string | null
          current_day: number | null
          current_week: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          last_workout_date: string | null
          program_id: string | null
          start_date: string | null
        }
        Insert: {
          assigned_by: string
          client_id: string
          created_at?: string | null
          current_day?: number | null
          current_week?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_workout_date?: string | null
          program_id?: string | null
          start_date?: string | null
        }
        Update: {
          assigned_by?: string
          client_id?: string
          created_at?: string | null
          current_day?: number | null
          current_week?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_workout_date?: string | null
          program_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_appointments: {
        Row: {
          appointment_type: string | null
          client_id: string | null
          coach_id: string
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          parent_appointment_id: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          appointment_type?: string | null
          client_id?: string | null
          coach_id: string
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          parent_appointment_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          appointment_type?: string | null
          client_id?: string | null
          coach_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          parent_appointment_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_appointments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_appointments_parent_appointment_id_fkey"
            columns: ["parent_appointment_id"]
            isOneToOne: false
            referencedRelation: "coach_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_flags: {
        Row: {
          client_id: string
          coach_response: string | null
          created_at: string | null
          description: string
          exercise_id: string | null
          exercise_log_id: string | null
          flag_type: string
          flagged_date: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          client_id: string
          coach_response?: string | null
          created_at?: string | null
          description: string
          exercise_id?: string | null
          exercise_log_id?: string | null
          flag_type?: string
          flagged_date?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          client_id?: string
          coach_response?: string | null
          created_at?: string | null
          description?: string
          exercise_id?: string | null
          exercise_log_id?: string | null
          flag_type?: string
          flagged_date?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_flags_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_flags_exercise_log_id_fkey"
            columns: ["exercise_log_id"]
            isOneToOne: false
            referencedRelation: "exercise_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          notes: string | null
          order_index: number | null
          reps_completed: string | null
          rpe: number | null
          sets_completed: number | null
          weight_used: string | null
          workout_log_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          reps_completed?: string | null
          rpe?: number | null
          sets_completed?: number | null
          weight_used?: string | null
          workout_log_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          reps_completed?: string | null
          rpe?: number | null
          sets_completed?: number | null
          weight_used?: string | null
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_part: string | null
          coaching_cues: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          equipment_needed: string | null
          exercise_type: Database["public"]["Enums"]["exercise_category"] | null
          id: string
          name: string
          thumbnail_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          body_part?: string | null
          coaching_cues?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          equipment_needed?: string | null
          exercise_type?:
            | Database["public"]["Enums"]["exercise_category"]
            | null
          id?: string
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          body_part?: string | null
          coaching_cues?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          equipment_needed?: string | null
          exercise_type?:
            | Database["public"]["Enums"]["exercise_category"]
            | null
          id?: string
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          coach_id: string
          created_at: string | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          id: string
          last_synced_at: string | null
          sync_enabled: boolean | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          id?: string
          last_synced_at?: string | null
          sync_enabled?: boolean | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          id?: string
          last_synced_at?: string | null
          sync_enabled?: boolean | null
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          habit_id: string | null
          id: string
          logged_date: string | null
          value: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          habit_id?: string | null
          id?: string
          logged_date?: string | null
          value?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          habit_id?: string | null
          id?: string
          logged_date?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          target_value: number | null
          unit: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          target_value?: number | null
          unit?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          target_value?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      homework_assignments: {
        Row: {
          assigned_by: string
          client_id: string
          created_at: string | null
          end_date: string | null
          frequency_count: number | null
          frequency_type: string
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          assigned_by: string
          client_id: string
          created_at?: string | null
          end_date?: string | null
          frequency_count?: number | null
          frequency_type?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          start_date?: string
        }
        Update: {
          assigned_by?: string
          client_id?: string
          created_at?: string | null
          end_date?: string | null
          frequency_count?: number | null
          frequency_type?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          homework_assignment_id: string
          id: string
          notes: string | null
          order_index: number | null
          reps: string | null
          sets: number | null
          tempo: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          homework_assignment_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          sets?: number | null
          tempo?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          homework_assignment_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          sets?: number | null
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_exercises_homework_assignment_id_fkey"
            columns: ["homework_assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      metric_definitions: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_bilateral: boolean | null
          is_system_default: boolean | null
          metric_type: string
          unit: string
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_bilateral?: boolean | null
          is_system_default?: boolean | null
          metric_type: string
          unit: string
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_bilateral?: boolean | null
          is_system_default?: boolean | null
          metric_type?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          client_display_trend: string | null
          client_display_value: string | null
          client_id: string
          created_at: string | null
          id: string
          is_bilateral: boolean | null
          metric_type: string
          notes: string | null
          recorded_date: string | null
          unit: string | null
          value: number
          value_left: number | null
          value_right: number | null
          workout_log_id: string | null
        }
        Insert: {
          client_display_trend?: string | null
          client_display_value?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          is_bilateral?: boolean | null
          metric_type: string
          notes?: string | null
          recorded_date?: string | null
          unit?: string | null
          value: number
          value_left?: number | null
          value_right?: number | null
          workout_log_id?: string | null
        }
        Update: {
          client_display_trend?: string | null
          client_display_value?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          is_bilateral?: boolean | null
          metric_type?: string
          notes?: string | null
          recorded_date?: string | null
          unit?: string | null
          value?: number
          value_left?: number | null
          value_right?: number | null
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coach_id: string | null
          created_at: string | null
          email: string
          fitness_level: string | null
          full_name: string
          goals: string | null
          golf_experience: string | null
          handicap: number | null
          id: string
          injury_history: string | null
          membership_type: Database["public"]["Enums"]["membership_type"] | null
          onboarding_completed: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string | null
          email: string
          fitness_level?: string | null
          full_name: string
          goals?: string | null
          golf_experience?: string | null
          handicap?: number | null
          id?: string
          injury_history?: string | null
          membership_type?:
            | Database["public"]["Enums"]["membership_type"]
            | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string | null
          email?: string
          fitness_level?: string | null
          full_name?: string
          goals?: string | null
          golf_experience?: string | null
          handicap?: number | null
          id?: string
          injury_history?: string | null
          membership_type?:
            | Database["public"]["Enums"]["membership_type"]
            | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          created_at: string | null
          day_number: number | null
          exercise_id: string | null
          id: string
          notes: string | null
          order_index: number | null
          program_id: string | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          superset_group: string | null
          target_rpe: number | null
          tempo: string | null
          week_number: number | null
        }
        Insert: {
          created_at?: string | null
          day_number?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          program_id?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          superset_group?: string | null
          target_rpe?: number | null
          tempo?: string | null
          week_number?: number | null
        }
        Update: {
          created_at?: string | null
          day_number?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          order_index?: number | null
          program_id?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          superset_group?: string | null
          target_rpe?: number | null
          tempo?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          coach_id: string
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          id: string
          is_template: boolean | null
          name: string
          session_type: string | null
          training_phase: string | null
          updated_at: string | null
          workouts_per_week: number | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_template?: boolean | null
          name: string
          session_type?: string | null
          training_phase?: string | null
          updated_at?: string | null
          workouts_per_week?: number | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_template?: boolean | null
          name?: string
          session_type?: string | null
          training_phase?: string | null
          updated_at?: string | null
          workouts_per_week?: number | null
        }
        Relationships: []
      }
      swing_videos: {
        Row: {
          client_id: string
          club_type: string
          context: string
          created_at: string | null
          id: string
          notes: string | null
          recorded_date: string | null
          thumbnail_url: string | null
          uploaded_by: string
          video_url: string
        }
        Insert: {
          client_id: string
          club_type?: string
          context?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_date?: string | null
          thumbnail_url?: string | null
          uploaded_by: string
          video_url: string
        }
        Update: {
          client_id?: string
          club_type?: string
          context?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_date?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string
          video_url?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          appointment_id: string | null
          client_homework_notes: string | null
          client_id: string
          coach_notes: string | null
          completed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          energy_level: number | null
          homework_assignment_id: string | null
          id: string
          key_findings: string | null
          notes: string | null
          overall_rpe: number | null
          program_id: string | null
          session_type: string | null
          workout_date: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_homework_notes?: string | null
          client_id: string
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          energy_level?: number | null
          homework_assignment_id?: string | null
          id?: string
          key_findings?: string | null
          notes?: string | null
          overall_rpe?: number | null
          program_id?: string | null
          session_type?: string | null
          workout_date?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_homework_notes?: string | null
          client_id?: string
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          energy_level?: number | null
          homework_assignment_id?: string | null
          id?: string
          key_findings?: string | null
          notes?: string | null
          overall_rpe?: number | null
          program_id?: string | null
          session_type?: string | null
          workout_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "coach_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_homework_assignment_id_fkey"
            columns: ["homework_assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_coach: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      difficulty_level: "beginner" | "intermediate" | "advanced"
      exercise_category:
        | "power"
        | "strength"
        | "mobility"
        | "plyometric"
        | "speed"
        | "stability"
        | "rotation"
        | "recovery"
      membership_type: "individual_coaching" | "community" | "program_only"
      user_role: "coach" | "client"
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
      difficulty_level: ["beginner", "intermediate", "advanced"],
      exercise_category: [
        "power",
        "strength",
        "mobility",
        "plyometric",
        "speed",
        "stability",
        "rotation",
        "recovery",
      ],
      membership_type: ["individual_coaching", "community", "program_only"],
      user_role: ["coach", "client"],
    },
  },
} as const
