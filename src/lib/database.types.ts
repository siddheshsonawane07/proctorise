export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      answers: {
        Row: {
          attempt_id: string;
          graded_by: string | null;
          item_id: string;
          points_awarded: number | null;
          response: NonNullable<Json>;
          saved_at: string;
        };
        ComputedFields: never;
        Insert: {
          attempt_id: string;
          graded_by?: string | null;
          item_id: string;
          points_awarded?: number | null;
          response: NonNullable<Json>;
          saved_at?: string;
        };
        Update: {
          attempt_id?: string;
          graded_by?: string | null;
          item_id?: string;
          points_awarded?: number | null;
          response?: NonNullable<Json>;
          saved_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_graded_by_fkey";
            columns: ["graded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "test_items";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          attempt_no: number;
          consent_version: string | null;
          consented_at: string | null;
          deadline_at: string;
          id: string;
          integrity: Database["public"]["Enums"]["integrity_status"];
          item_order: string[];
          max_score: number | null;
          option_orders: NonNullable<Json>;
          primary_session: string;
          score: number | null;
          started_at: string;
          status: Database["public"]["Enums"]["attempt_status"];
          student_id: string | null;
          submitted_at: string | null;
          test_id: string;
        };
        ComputedFields: never;
        Insert: {
          attempt_no: number;
          consent_version?: string | null;
          consented_at?: string | null;
          deadline_at: string;
          id?: string;
          integrity?: Database["public"]["Enums"]["integrity_status"];
          item_order: string[];
          max_score?: number | null;
          option_orders?: NonNullable<Json>;
          primary_session: string;
          score?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["attempt_status"];
          student_id?: string | null;
          submitted_at?: string | null;
          test_id: string;
        };
        Update: {
          attempt_no?: number;
          consent_version?: string | null;
          consented_at?: string | null;
          deadline_at?: string;
          id?: string;
          integrity?: Database["public"]["Enums"]["integrity_status"];
          item_order?: string[];
          max_score?: number | null;
          option_orders?: NonNullable<Json>;
          primary_session?: string;
          score?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["attempt_status"];
          student_id?: string | null;
          submitted_at?: string | null;
          test_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          at: string;
          details: NonNullable<Json>;
          id: number;
          target_id: string | null;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      class_members: {
        Row: {
          class_id: string;
          joined_at: string;
          status: Database["public"]["Enums"]["member_status"];
          student_id: string;
          time_multiplier: number;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          joined_at?: string;
          status?: Database["public"]["Enums"]["member_status"];
          student_id: string;
          time_multiplier?: number;
        };
        Update: {
          class_id?: string;
          joined_at?: string;
          status?: Database["public"]["Enums"]["member_status"];
          student_id?: string;
          time_multiplier?: number;
        };
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_members_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      class_teachers: {
        Row: {
          added_at: string;
          class_id: string;
          kind: Database["public"]["Enums"]["class_teacher_kind"];
          teacher_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_at?: string;
          class_id: string;
          kind: Database["public"]["Enums"]["class_teacher_kind"];
          teacher_id: string;
        };
        Update: {
          added_at?: string;
          class_id?: string;
          kind?: Database["public"]["Enums"]["class_teacher_kind"];
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_teachers_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          join_code: string;
          join_open: boolean;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          join_code: string;
          join_open?: boolean;
          name: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          join_code?: string;
          join_open?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      device_pairings: {
        Row: {
          attempt_id: string | null;
          claimed_at: string | null;
          claimed_by: string | null;
          code_hash: string;
          created_at: string;
          device_label: string | null;
          expires_at: string;
          id: string;
          ready_at: string | null;
          revoked_at: string | null;
          student_id: string;
          test_id: string;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          attempt_id?: string | null;
          claimed_at?: string | null;
          claimed_by?: string | null;
          code_hash: string;
          created_at?: string;
          device_label?: string | null;
          expires_at: string;
          id?: string;
          ready_at?: string | null;
          revoked_at?: string | null;
          student_id: string;
          test_id: string;
          token_hash: string;
        };
        Update: {
          attempt_id?: string | null;
          claimed_at?: string | null;
          claimed_by?: string | null;
          code_hash?: string;
          created_at?: string;
          device_label?: string | null;
          expires_at?: string;
          id?: string;
          ready_at?: string | null;
          revoked_at?: string | null;
          student_id?: string;
          test_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_pairings_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "device_pairings_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "device_pairings_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence: {
        Row: {
          attempt_id: string;
          created_at: string;
          device: Database["public"]["Enums"]["proctor_device"];
          path: string;
          reason: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          attempt_id: string;
          created_at?: string;
          device: Database["public"]["Enums"]["proctor_device"];
          path: string;
          reason: string;
          source: string;
        };
        Update: {
          attempt_id?: string;
          created_at?: string;
          device?: Database["public"]["Enums"]["proctor_device"];
          path?: string;
          reason?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      flag_reviews: {
        Row: {
          event_id: number;
          note: string | null;
          reviewed_at: string;
          reviewer_id: string | null;
          verdict: Database["public"]["Enums"]["flag_verdict"];
        };
        ComputedFields: never;
        Insert: {
          event_id: number;
          note?: string | null;
          reviewed_at?: string;
          reviewer_id?: string | null;
          verdict: Database["public"]["Enums"]["flag_verdict"];
        };
        Update: {
          event_id?: number;
          note?: string | null;
          reviewed_at?: string;
          reviewer_id?: string | null;
          verdict?: Database["public"]["Enums"]["flag_verdict"];
        };
        Relationships: [
          {
            foreignKeyName: "flag_reviews_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "proctor_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flag_reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_enrolments: {
        Row: {
          consent_version: string;
          consented_at: string;
          liveness_passed_at: string | null;
          photo_path: string;
          student_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          consent_version: string;
          consented_at?: string;
          liveness_passed_at?: string | null;
          photo_path: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          consent_version?: string;
          consented_at?: string;
          liveness_passed_at?: string | null;
          photo_path?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "identity_enrolments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      join_failures: {
        Row: {
          at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          at?: string;
          user_id: string;
        };
        Update: {
          at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      proctor_events: {
        Row: {
          attempt_id: string;
          client_id: string;
          confidence: number | null;
          created_at: string;
          details: NonNullable<Json>;
          device: Database["public"]["Enums"]["proctor_device"];
          ended_at: string | null;
          id: number;
          kind: string;
          severity: Database["public"]["Enums"]["proctor_severity"];
          snapshot_path: string | null;
          started_at: string;
        };
        ComputedFields: never;
        Insert: {
          attempt_id: string;
          client_id: string;
          confidence?: number | null;
          created_at?: string;
          details?: NonNullable<Json>;
          device: Database["public"]["Enums"]["proctor_device"];
          ended_at?: string | null;
          id?: never;
          kind: string;
          severity: Database["public"]["Enums"]["proctor_severity"];
          snapshot_path?: string | null;
          started_at: string;
        };
        Update: {
          attempt_id?: string;
          client_id?: string;
          confidence?: number | null;
          created_at?: string;
          details?: NonNullable<Json>;
          device?: Database["public"]["Enums"]["proctor_device"];
          ended_at?: string | null;
          id?: never;
          kind?: string;
          severity?: Database["public"]["Enums"]["proctor_severity"];
          snapshot_path?: string | null;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "proctor_events_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          adult_confirmed_at: string | null;
          created_at: string;
          deletion_requested_at: string | null;
          full_name: string;
          id: string;
          institution: string | null;
          role: Database["public"]["Enums"]["user_role"];
          teacher_note: string | null;
          teacher_requested_at: string | null;
          teacher_status: Database["public"]["Enums"]["teacher_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          adult_confirmed_at?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          full_name?: string;
          id: string;
          institution?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          teacher_note?: string | null;
          teacher_requested_at?: string | null;
          teacher_status?: Database["public"]["Enums"]["teacher_status"];
          updated_at?: string;
        };
        Update: {
          adult_confirmed_at?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          full_name?: string;
          id?: string;
          institution?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          teacher_note?: string | null;
          teacher_requested_at?: string | null;
          teacher_status?: Database["public"]["Enums"]["teacher_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      question_keys: {
        Row: {
          case_sensitive: boolean;
          correct: NonNullable<Json>;
          question_id: string;
          tolerance: number;
        };
        ComputedFields: never;
        Insert: {
          case_sensitive?: boolean;
          correct: NonNullable<Json>;
          question_id: string;
          tolerance?: number;
        };
        Update: {
          case_sensitive?: boolean;
          correct?: NonNullable<Json>;
          question_id?: string;
          tolerance?: number;
        };
        Relationships: [
          {
            foreignKeyName: "question_keys_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: true;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          created_at: string;
          id: string;
          options: NonNullable<Json>;
          owner_id: string;
          points: number;
          prompt: string;
          tags: string[];
          type: Database["public"]["Enums"]["question_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          options?: NonNullable<Json>;
          owner_id: string;
          points?: number;
          prompt: string;
          tags?: string[];
          type: Database["public"]["Enums"]["question_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          options?: NonNullable<Json>;
          owner_id?: string;
          points?: number;
          prompt?: string;
          tags?: string[];
          type?: Database["public"]["Enums"]["question_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      test_item_keys: {
        Row: {
          case_sensitive: boolean;
          correct: NonNullable<Json>;
          item_id: string;
          tolerance: number;
        };
        ComputedFields: never;
        Insert: {
          case_sensitive: boolean;
          correct: NonNullable<Json>;
          item_id: string;
          tolerance: number;
        };
        Update: {
          case_sensitive?: boolean;
          correct?: NonNullable<Json>;
          item_id?: string;
          tolerance?: number;
        };
        Relationships: [
          {
            foreignKeyName: "test_item_keys_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "test_items";
            referencedColumns: ["id"];
          },
        ];
      };
      test_items: {
        Row: {
          id: string;
          options: NonNullable<Json>;
          points: number;
          position: number;
          prompt: string;
          test_id: string;
          type: Database["public"]["Enums"]["question_type"];
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          options: NonNullable<Json>;
          points: number;
          position: number;
          prompt: string;
          test_id: string;
          type: Database["public"]["Enums"]["question_type"];
        };
        Update: {
          id?: string;
          options?: NonNullable<Json>;
          points?: number;
          position?: number;
          prompt?: string;
          test_id?: string;
          type?: Database["public"]["Enums"]["question_type"];
        };
        Relationships: [
          {
            foreignKeyName: "test_items_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      test_questions: {
        Row: {
          points: number | null;
          position: number;
          question_id: string;
          test_id: string;
        };
        ComputedFields: never;
        Insert: {
          points?: number | null;
          position: number;
          question_id: string;
          test_id: string;
        };
        Update: {
          points?: number | null;
          position?: number;
          question_id?: string;
          test_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_questions_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      tests: {
        Row: {
          class_id: string;
          closes_at: string;
          created_at: string;
          created_by: string | null;
          duration_min: number;
          id: string;
          instructions: string;
          max_attempts: number;
          opens_at: string;
          proctoring: NonNullable<Json>;
          published_at: string | null;
          results_release: Database["public"]["Enums"]["results_release"];
          results_released_at: string | null;
          retention_days: number;
          reveal_answers: boolean;
          shuffle_items: boolean;
          shuffle_options: boolean;
          status: Database["public"]["Enums"]["test_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          class_id: string;
          closes_at?: string;
          created_at?: string;
          created_by?: string | null;
          duration_min?: number;
          id?: string;
          instructions?: string;
          max_attempts?: number;
          opens_at?: string;
          proctoring?: NonNullable<Json>;
          published_at?: string | null;
          results_release?: Database["public"]["Enums"]["results_release"];
          results_released_at?: string | null;
          retention_days?: number;
          reveal_answers?: boolean;
          shuffle_items?: boolean;
          shuffle_options?: boolean;
          status?: Database["public"]["Enums"]["test_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          closes_at?: string;
          created_at?: string;
          created_by?: string | null;
          duration_min?: number;
          id?: string;
          instructions?: string;
          max_attempts?: number;
          opens_at?: string;
          proctoring?: NonNullable<Json>;
          published_at?: string | null;
          results_release?: Database["public"]["Enums"]["results_release"];
          results_released_at?: string | null;
          retention_days?: number;
          reveal_answers?: boolean;
          shuffle_items?: boolean;
          shuffle_options?: boolean;
          status?: Database["public"]["Enums"]["test_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tests_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accounts_to_delete: {
        Args: Record<PropertyKey, never>;
        Returns: {
          files: Json;
          user_id: string;
        }[];
      };
      add_co_teacher: { Args: { p_class_id: string; p_email: string }; Returns: undefined };
      admin_list_people: {
        Args: { p_status?: Database["public"]["Enums"]["teacher_status"] };
        Returns: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          institution: string;
          role: Database["public"]["Enums"]["user_role"];
          teacher_note: string;
          teacher_requested_at: string;
          teacher_status: Database["public"]["Enums"]["teacher_status"];
        }[];
      };
      admin_set_teacher_status: {
        Args: { p_status: Database["public"]["Enums"]["teacher_status"]; p_user_id: string };
        Returns: undefined;
      };
      admin_usage: { Args: Record<PropertyKey, never>; Returns: Json };
      attempt_class: { Args: { p_attempt_id: string }; Returns: string };
      attempt_detail: { Args: { p_attempt_id: string }; Returns: Json };
      attempt_payload: { Args: { p_attempt_id: string }; Returns: Json };
      can_edit_test: { Args: { p_test_id: string }; Returns: boolean };
      can_read_topic: { Args: { p_topic: string }; Returns: boolean };
      can_use_pairing_channel: { Args: { p_topic: string }; Returns: boolean };
      can_write_topic: { Args: { p_topic: string }; Returns: boolean };
      cancel_account_deletion: { Args: Record<PropertyKey, never>; Returns: undefined };
      check_question: {
        Args: {
          p_correct: Json;
          p_options: Json;
          p_tolerance: number;
          p_type: Database["public"]["Enums"]["question_type"];
        };
        Returns: undefined;
      };
      check_response: {
        Args: {
          p_options: Json;
          p_response: Json;
          p_type: Database["public"]["Enums"]["question_type"];
        };
        Returns: boolean;
      };
      claim_pairing: {
        Args: { p_code?: string; p_device_label?: string; p_token: string };
        Returns: Json;
      };
      class_roster: {
        Args: { p_class_id: string };
        Returns: {
          email: string;
          enrolled_at: string;
          full_name: string;
          joined_at: string;
          status: Database["public"]["Enums"]["member_status"];
          student_id: string;
          time_multiplier: number;
        }[];
      };
      class_teacher_list: {
        Args: { p_class_id: string };
        Returns: {
          email: string;
          full_name: string;
          kind: Database["public"]["Enums"]["class_teacher_kind"];
          teacher_id: string;
        }[];
      };
      confirm_adult: { Args: Record<PropertyKey, never>; Returns: undefined };
      create_class: { Args: { p_name: string }; Returns: string };
      create_pairing: { Args: { p_test_id: string }; Returns: Json };
      dismiss_kind: {
        Args: { p_attempt_id: string; p_kind: string; p_note?: string };
        Returns: number;
      };
      draft_questions: {
        Args: { p_test_id: string };
        Returns: {
          bank_points: number;
          options: Json;
          owner_id: string;
          points: number;
          prompt: string;
          question_id: string;
          sort_order: number;
          type: Database["public"]["Enums"]["question_type"];
        }[];
      };
      event_class: { Args: { p_event_id: number }; Returns: string };
      evidence_slot_open: { Args: { p_path: string }; Returns: boolean };
      expired_evidence: {
        Args: { p_limit?: number };
        Returns: {
          path: string;
        }[];
      };
      extend_attempt: {
        Args: { p_attempt_id: string; p_minutes: number; p_reason: string };
        Returns: string;
      };
      finalize_expired_attempts: { Args: Record<PropertyKey, never>; Returns: number };
      finish_attempt: {
        Args: { p_attempt_id: string; p_status: Database["public"]["Enums"]["attempt_status"] };
        Returns: undefined;
      };
      fix_item_key: {
        Args: {
          p_case_sensitive?: boolean;
          p_correct: Json;
          p_item_id: string;
          p_tolerance?: number;
        };
        Returns: number;
      };
      forget_evidence: { Args: { p_paths: string[] }; Returns: number };
      grade_attempt: { Args: { p_attempt_id: string }; Returns: undefined };
      has_profile: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_approved_teacher: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_class_member: { Args: { p_class_id: string }; Returns: boolean };
      is_class_owner: { Args: { p_class_id: string }; Returns: boolean };
      is_class_teacher: { Args: { p_class_id: string }; Returns: boolean };
      join_class: { Args: { p_code: string }; Returns: Json };
      live_overview: {
        Args: { p_test_id: string };
        Returns: {
          attempt_id: string;
          deadline_at: string;
          full_name: string;
          high_count: number;
          integrity: Database["public"]["Enums"]["integrity_status"];
          last_at: string;
          last_kind: string;
          phone_paired: boolean;
          started_at: string;
          status: Database["public"]["Enums"]["attempt_status"];
          student_id: string;
          unreviewed: number;
          warn_count: number;
        }[];
      };
      mark_answer: {
        Args: { p_attempt_id: string; p_item_id: string; p_points: number };
        Returns: undefined;
      };
      mark_phone_ready: { Args: Record<PropertyKey, never>; Returns: undefined };
      my_data: { Args: Record<PropertyKey, never>; Returns: Json };
      my_pairing: {
        Args: Record<PropertyKey, never>;
        Returns: {
          attempt_id: string | null;
          claimed_at: string | null;
          claimed_by: string | null;
          code_hash: string;
          created_at: string;
          device_label: string | null;
          expires_at: string;
          id: string;
          ready_at: string | null;
          revoked_at: string | null;
          student_id: string;
          test_id: string;
          token_hash: string;
        };
        SetofOptions: {
          from: "*";
          to: "device_pairings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_result: { Args: { p_attempt_id: string }; Returns: Json };
      new_join_code: { Args: Record<PropertyKey, never>; Returns: string };
      normalise_answer: { Args: { p_case_sensitive: boolean; p_text: string }; Returns: string };
      owns_open_attempt: { Args: { p_attempt_id: string }; Returns: boolean };
      phone_owns_attempt: { Args: { p_attempt_id: string }; Returns: boolean };
      phone_status: { Args: Record<PropertyKey, never>; Returns: Json };
      publish_test: { Args: { p_test_id: string }; Returns: undefined };
      record_attempt_consent: {
        Args: { p_attempt_id: string; p_version: string };
        Returns: undefined;
      };
      release_results: { Args: { p_test_id: string }; Returns: undefined };
      remove_co_teacher: { Args: { p_class_id: string; p_teacher_id: string }; Returns: undefined };
      request_account_deletion: { Args: { p_confirm: string }; Returns: undefined };
      request_teacher: { Args: { p_institution: string; p_note: string }; Returns: undefined };
      reserve_evidence: {
        Args: { p_attempt_id: string; p_reason: string; p_source: string };
        Returns: string;
      };
      results_visible: {
        Args: {
          p_attempt: Omit<
            Database["public"]["Tables"]["attempts"]["Row"],
            Database["public"]["Tables"]["attempts"]["ComputedFields"]
          >;
          p_test: Omit<
            Database["public"]["Tables"]["tests"]["Row"],
            Database["public"]["Tables"]["tests"]["ComputedFields"]
          >;
        };
        Returns: boolean;
      };
      review_flag: {
        Args: {
          p_event_id: number;
          p_note?: string;
          p_verdict: Database["public"]["Enums"]["flag_verdict"];
        };
        Returns: undefined;
      };
      rotate_join_code: { Args: { p_class_id: string }; Returns: string };
      save_answer: {
        Args: { p_attempt_id: string; p_item_id: string; p_response: Json };
        Returns: string;
      };
      save_enrolment: {
        Args: { p_consent_version: string; p_liveness_passed: boolean };
        Returns: undefined;
      };
      save_question: {
        Args: {
          p_case_sensitive?: boolean;
          p_correct: Json;
          p_id: string;
          p_options: Json;
          p_points: number;
          p_prompt: string;
          p_tags: string[];
          p_tolerance?: number;
          p_type: Database["public"]["Enums"]["question_type"];
        };
        Returns: string;
      };
      score_item: {
        Args: {
          p_case_sensitive: boolean;
          p_correct: Json;
          p_points: number;
          p_response: Json;
          p_tolerance: number;
          p_type: Database["public"]["Enums"]["question_type"];
        };
        Returns: number;
      };
      set_integrity: {
        Args: {
          p_attempt_id: string;
          p_note?: string;
          p_verdict: Database["public"]["Enums"]["integrity_status"];
        };
        Returns: undefined;
      };
      set_member: {
        Args: {
          p_class_id: string;
          p_status: Database["public"]["Enums"]["member_status"];
          p_student_id: string;
          p_time_multiplier: number;
        };
        Returns: undefined;
      };
      start_attempt: { Args: { p_session: string; p_test_id: string }; Returns: Json };
      submit_attempt: { Args: { p_attempt_id: string }; Returns: undefined };
      teaches_student: { Args: { p_student_id: string }; Returns: boolean };
      terminate_attempt: { Args: { p_attempt_id: string; p_reason: string }; Returns: undefined };
      test_class: { Args: { p_test_id: string }; Returns: string };
      test_results: {
        Args: { p_test_id: string };
        Returns: {
          attempt_id: string;
          attempt_no: number;
          email: string;
          full_name: string;
          integrity: Database["public"]["Enums"]["integrity_status"];
          max_score: number;
          score: number;
          started_at: string;
          status: Database["public"]["Enums"]["attempt_status"];
          student_id: string;
          submitted_at: string;
          to_mark: number;
        }[];
      };
      unpublish_test: { Args: { p_test_id: string }; Returns: undefined };
      update_proctor_events: { Args: { p_updates: Json }; Returns: undefined };
      valid_proctoring: { Args: { p: Json }; Returns: boolean };
      void_attempt: { Args: { p_attempt_id: string; p_reason: string }; Returns: undefined };
      warn_student: { Args: { p_attempt_id: string; p_message: string }; Returns: undefined };
      write_audit: {
        Args: { p_action: string; p_details?: Json; p_target_id: string; p_target_type: string };
        Returns: undefined;
      };
    };
    Enums: {
      attempt_status: "in_progress" | "submitted" | "auto_submitted" | "terminated" | "voided";
      class_teacher_kind: "owner" | "co_teacher";
      flag_verdict: "dismissed" | "confirmed";
      integrity_status: "clean" | "flagged" | "reviewed_ok" | "reviewed_violation";
      member_status: "active" | "removed";
      proctor_device: "laptop" | "phone";
      proctor_severity: "info" | "warn" | "high";
      question_type: "single" | "multiple" | "true_false" | "short_text" | "numeric";
      results_release: "immediate" | "manual" | "after_close";
      teacher_status: "none" | "requested" | "approved" | "rejected" | "suspended";
      test_status: "draft" | "published" | "closed";
      user_role: "student" | "teacher" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attempt_status: ["in_progress", "submitted", "auto_submitted", "terminated", "voided"],
      class_teacher_kind: ["owner", "co_teacher"],
      flag_verdict: ["dismissed", "confirmed"],
      integrity_status: ["clean", "flagged", "reviewed_ok", "reviewed_violation"],
      member_status: ["active", "removed"],
      proctor_device: ["laptop", "phone"],
      proctor_severity: ["info", "warn", "high"],
      question_type: ["single", "multiple", "true_false", "short_text", "numeric"],
      results_release: ["immediate", "manual", "after_close"],
      teacher_status: ["none", "requested", "approved", "rejected", "suspended"],
      test_status: ["draft", "published", "closed"],
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const;
