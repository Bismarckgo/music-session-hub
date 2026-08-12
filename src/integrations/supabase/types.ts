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
      collaborators: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          ipi: string | null
          name: string
          pro: string | null
          publisher: string | null
          role: string
          split_percent: number
          user_id: string
          work_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          ipi?: string | null
          name: string
          pro?: string | null
          publisher?: string | null
          role: string
          split_percent?: number
          user_id: string
          work_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          ipi?: string | null
          name?: string
          pro?: string | null
          publisher?: string | null
          role?: string
          split_percent?: number
          user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      composition_shares: {
        Row: {
          composition_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          person_id: string | null
          publisher_share: number
          role: string
          territory: string
          user_id: string
          writer_share: number
        }
        Insert: {
          composition_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          person_id?: string | null
          publisher_share?: number
          role: string
          territory?: string
          user_id: string
          writer_share?: number
        }
        Update: {
          composition_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          person_id?: string | null
          publisher_share?: number
          role?: string
          territory?: string
          user_id?: string
          writer_share?: number
        }
        Relationships: [
          {
            foreignKeyName: "composition_shares_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composition_shares_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["composition_id"]
          },
          {
            foreignKeyName: "composition_shares_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      compositions: {
        Row: {
          bpm: number | null
          created_at: string
          genre: string | null
          id: string
          iswc: string | null
          musical_key: string | null
          title: string
          updated_at: string
          user_id: string
          work_id: string | null
        }
        Insert: {
          bpm?: number | null
          created_at?: string
          genre?: string | null
          id?: string
          iswc?: string | null
          musical_key?: string | null
          title: string
          updated_at?: string
          user_id: string
          work_id?: string | null
        }
        Update: {
          bpm?: number | null
          created_at?: string
          genre?: string | null
          id?: string
          iswc?: string | null
          musical_key?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compositions_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compositions_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          default_role: string | null
          email: string | null
          id: string
          ipi: string | null
          name: string
          notes: string | null
          pro: string | null
          publisher: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_role?: string | null
          email?: string | null
          id?: string
          ipi?: string | null
          name: string
          notes?: string | null
          pro?: string | null
          publisher?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_role?: string | null
          email?: string | null
          id?: string
          ipi?: string | null
          name?: string
          notes?: string | null
          pro?: string | null
          publisher?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mie_events: {
        Row: {
          actor: string
          created_at: string
          id: string
          occurred_at: string
          payload: Json
          session_id: string | null
          type: string
          user_id: string
          work_id: string | null
        }
        Insert: {
          actor?: string
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json
          session_id?: string | null
          type: string
          user_id: string
          work_id?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json
          session_id?: string | null
          type?: string
          user_id?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mie_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mie_events_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mie_events_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      mie_feedback: {
        Row: {
          code: string
          created_at: string
          decision: string
          id: string
          note: string | null
          updated_at: string
          user_id: string
          work_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id: string
          work_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mie_feedback_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mie_feedback_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      mie_memory: {
        Row: {
          confidence: number
          created_at: string
          id: string
          key: string
          last_seen: string
          observations: number
          scope: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          key: string
          last_seen?: string
          observations?: number
          scope: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          key?: string
          last_seen?: string
          observations?: number
          scope?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      publishing_profiles: {
        Row: {
          created_at: string
          external_identifiers: Json
          id: string
          last_sync: string | null
          pro: string | null
          publisher_ipi: string | null
          publisher_name: string | null
          publishing_type: string
          updated_at: string
          user_id: string
          writer_ipi: string | null
        }
        Insert: {
          created_at?: string
          external_identifiers?: Json
          id?: string
          last_sync?: string | null
          pro?: string | null
          publisher_ipi?: string | null
          publisher_name?: string | null
          publishing_type?: string
          updated_at?: string
          user_id: string
          writer_ipi?: string | null
        }
        Update: {
          created_at?: string
          external_identifiers?: Json
          id?: string
          last_sync?: string | null
          pro?: string | null
          publisher_ipi?: string | null
          publisher_name?: string | null
          publishing_type?: string
          updated_at?: string
          user_id?: string
          writer_ipi?: string | null
        }
        Relationships: []
      }
      recording_shares: {
        Row: {
          artist_share: number
          created_at: string
          id: string
          is_active: boolean
          label_share: number
          name: string | null
          person_id: string | null
          points_type: string
          producer_points: number
          recording_id: string
          role: string
          user_id: string
        }
        Insert: {
          artist_share?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label_share?: number
          name?: string | null
          person_id?: string | null
          points_type?: string
          producer_points?: number
          recording_id: string
          role: string
          user_id: string
        }
        Update: {
          artist_share?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label_share?: number
          name?: string | null
          person_id?: string | null
          points_type?: string
          producer_points?: number
          recording_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_shares_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["recording_id"]
          },
        ]
      }
      recordings: {
        Row: {
          channel_links: Json
          composition_id: string | null
          cover_path: string | null
          created_at: string
          distribution_status: string
          distributor_name: string | null
          distributor_url: string | null
          duration_sec: number | null
          id: string
          isrc: string | null
          title: string
          updated_at: string
          user_id: string
          work_id: string | null
        }
        Insert: {
          channel_links?: Json
          composition_id?: string | null
          cover_path?: string | null
          created_at?: string
          distribution_status?: string
          distributor_name?: string | null
          distributor_url?: string | null
          duration_sec?: number | null
          id?: string
          isrc?: string | null
          title: string
          updated_at?: string
          user_id: string
          work_id?: string | null
        }
        Update: {
          channel_links?: Json
          composition_id?: string | null
          cover_path?: string | null
          created_at?: string
          distribution_status?: string
          distributor_name?: string | null
          distributor_url?: string | null
          duration_sec?: number | null
          id?: string
          isrc?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["composition_id"]
          },
          {
            foreignKeyName: "recordings_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      release_tracks: {
        Row: {
          created_at: string
          id: string
          isrc: string | null
          release_id: string
          track_no: number
          updated_at: string
          user_id: string
          version_id: string | null
          work_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          isrc?: string | null
          release_id: string
          track_no?: number
          updated_at?: string
          user_id: string
          version_id?: string | null
          work_id: string
        }
        Update: {
          created_at?: string
          id?: string
          isrc?: string | null
          release_id?: string
          track_no?: number
          updated_at?: string
          user_id?: string
          version_id?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_tracks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "work_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_tracks_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_tracks_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          cover_path: string | null
          created_at: string
          distributor: string | null
          id: string
          label_name: string | null
          notes: string | null
          release_date: string | null
          release_type: string
          status: string
          title: string
          upc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          distributor?: string | null
          id?: string
          label_name?: string | null
          notes?: string | null
          release_date?: string | null
          release_type?: string
          status?: string
          title: string
          upc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          distributor?: string | null
          id?: string
          label_name?: string | null
          notes?: string | null
          release_date?: string | null
          release_type?: string
          status?: string
          title?: string
          upc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      royalty_lines: {
        Row: {
          amount: number
          artist: string | null
          created_at: string
          currency: string
          id: string
          isrc: string | null
          match_method: string
          platform: string | null
          report_id: string
          territory: string | null
          title: string | null
          units: number
          user_id: string
          version_id: string | null
          work_id: string | null
        }
        Insert: {
          amount?: number
          artist?: string | null
          created_at?: string
          currency?: string
          id?: string
          isrc?: string | null
          match_method?: string
          platform?: string | null
          report_id: string
          territory?: string | null
          title?: string | null
          units?: number
          user_id: string
          version_id?: string | null
          work_id?: string | null
        }
        Update: {
          amount?: number
          artist?: string | null
          created_at?: string
          currency?: string
          id?: string
          isrc?: string | null
          match_method?: string
          platform?: string | null
          report_id?: string
          territory?: string | null
          title?: string | null
          units?: number
          user_id?: string
          version_id?: string | null
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "royalty_lines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "royalty_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_lines_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "work_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_lines_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_lines_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_reports: {
        Row: {
          created_at: string
          currency: string
          file_name: string | null
          id: string
          line_count: number
          matched_count: number
          period_end: string | null
          period_start: string | null
          source: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          file_name?: string | null
          id?: string
          line_count?: number
          matched_count?: number
          period_end?: string | null
          period_start?: string | null
          source: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          file_name?: string | null
          id?: string
          line_count?: number
          matched_count?: number
          period_end?: string | null
          period_start?: string | null
          source?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          daw: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          started_at: string
          user_id: string
          work_id: string
        }
        Insert: {
          created_at?: string
          daw?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id: string
          work_id: string
        }
        Update: {
          created_at?: string
          daw?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      work_registrations: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          last_checked: string | null
          notes: string | null
          platform: string
          registration_date: string | null
          status: string
          updated_at: string
          user_id: string
          work_id: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_checked?: string | null
          notes?: string | null
          platform: string
          registration_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          work_id: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_checked?: string | null
          notes?: string | null
          platform?: string
          registration_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_registrations_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_registrations_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      work_versions: {
        Row: {
          created_at: string
          duration_sec: number | null
          id: string
          isrc: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
          version_type: string
          work_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          isrc?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
          version_type?: string
          work_id: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          isrc?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          version_type?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_versions_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_versions_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works_view"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          bpm: number | null
          channel_links: Json
          channels: string[]
          cover_path: string | null
          created_at: string
          distribution_status: string
          distributor_name: string | null
          distributor_url: string | null
          fingerprint: string
          genre: string | null
          id: string
          isrc: string | null
          iswc: string | null
          musical_key: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bpm?: number | null
          channel_links?: Json
          channels?: string[]
          cover_path?: string | null
          created_at?: string
          distribution_status?: string
          distributor_name?: string | null
          distributor_url?: string | null
          fingerprint?: string
          genre?: string | null
          id?: string
          isrc?: string | null
          iswc?: string | null
          musical_key?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bpm?: number | null
          channel_links?: Json
          channels?: string[]
          cover_path?: string | null
          created_at?: string
          distribution_status?: string
          distributor_name?: string | null
          distributor_url?: string | null
          fingerprint?: string
          genre?: string | null
          id?: string
          isrc?: string | null
          iswc?: string | null
          musical_key?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      works_view: {
        Row: {
          bpm: number | null
          channel_links: Json | null
          channels: string[] | null
          composition_id: string | null
          cover_path: string | null
          created_at: string | null
          distribution_status: string | null
          distributor_name: string | null
          distributor_url: string | null
          duration_sec: number | null
          fingerprint: string | null
          genre: string | null
          id: string | null
          isrc: string | null
          iswc: string | null
          musical_key: string | null
          recording_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
