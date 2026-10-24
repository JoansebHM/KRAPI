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
      categorias: {
        Row: {
          color: string
          created_at: string
          icono: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icono?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icono?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      estudio_responsables: {
        Row: {
          estudio_id: string
          responsable_id: string
        }
        Insert: {
          estudio_id: string
          responsable_id: string
        }
        Update: {
          estudio_id?: string
          responsable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudio_responsables_estudio_id_fkey"
            columns: ["estudio_id"]
            isOneToOne: false
            referencedRelation: "estudios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estudio_responsables_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "responsables"
            referencedColumns: ["id"]
          },
        ]
      }
      estudios: {
        Row: {
          archivado_en: string | null
          created_at: string
          descripcion: string | null
          entrevistado: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          titulo: string
          ubicacion_id: string
          updated_at: string
        }
        Insert: {
          archivado_en?: string | null
          created_at?: string
          descripcion?: string | null
          entrevistado?: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          titulo: string
          ubicacion_id: string
          updated_at?: string
        }
        Update: {
          archivado_en?: string | null
          created_at?: string
          descripcion?: string | null
          entrevistado?: string | null
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          titulo?: string
          ubicacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudios_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evidencias: {
        Row: {
          archivo_bytes: number | null
          archivo_mime: string | null
          archivo_nombre: string | null
          archivo_path: string | null
          created_at: string
          estudio_id: string
          id: string
          proveedor:
            | Database["public"]["Enums"]["proveedor_almacenamiento"]
            | null
          texto: string | null
          tipo: Database["public"]["Enums"]["tipo_evidencia"]
          titulo: string | null
          updated_at: string
          url_externa: string | null
        }
        Insert: {
          archivo_bytes?: number | null
          archivo_mime?: string | null
          archivo_nombre?: string | null
          archivo_path?: string | null
          created_at?: string
          estudio_id: string
          id?: string
          proveedor?:
            | Database["public"]["Enums"]["proveedor_almacenamiento"]
            | null
          texto?: string | null
          tipo: Database["public"]["Enums"]["tipo_evidencia"]
          titulo?: string | null
          updated_at?: string
          url_externa?: string | null
        }
        Update: {
          archivo_bytes?: number | null
          archivo_mime?: string | null
          archivo_nombre?: string | null
          archivo_path?: string | null
          created_at?: string
          estudio_id?: string
          id?: string
          proveedor?:
            | Database["public"]["Enums"]["proveedor_almacenamiento"]
            | null
          texto?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evidencia"]
          titulo?: string | null
          updated_at?: string
          url_externa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_estudio_id_fkey"
            columns: ["estudio_id"]
            isOneToOne: false
            referencedRelation: "estudios"
            referencedColumns: ["id"]
          },
        ]
      }
      responsables: {
        Row: {
          avatar_semilla: string | null
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          avatar_semilla?: string | null
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          avatar_semilla?: string | null
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      ubicaciones: {
        Row: {
          archivada_en: string | null
          categoria_id: string | null
          complemento: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_ubicacion"]
          geom: unknown
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
          updated_at: string
        }
        Insert: {
          archivada_en?: string | null
          categoria_id?: string | null
          complemento?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_ubicacion"]
          geom: unknown
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
          updated_at?: string
        }
        Update: {
          archivada_en?: string | null
          categoria_id?: string | null
          complemento?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_ubicacion"]
          geom?: unknown
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_ubicacion"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ubicaciones_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      limite_manila: { Args: never; Returns: unknown }
      ubicaciones_cercanas: {
        Args: { lat: number; lng: number; metros?: number }
        Returns: {
          distancia_m: number
          estado: Database["public"]["Enums"]["estado_ubicacion"]
          id: string
          nombre: string
        }[]
      }
      ubicaciones_en_zona: {
        Args: { zona_id: string }
        Returns: {
          archivada_en: string | null
          categoria_id: string | null
          complemento: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_ubicacion"]
          geom: unknown
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ubicaciones"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      estado_ubicacion: "activa" | "cerrada"
      proveedor_almacenamiento: "supabase" | "sharepoint" | "otro"
      tipo_evidencia: "foto" | "audio" | "documento" | "texto" | "video"
      tipo_ubicacion: "punto" | "zona"
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
      estado_ubicacion: ["activa", "cerrada"],
      proveedor_almacenamiento: ["supabase", "sharepoint", "otro"],
      tipo_evidencia: ["foto", "audio", "documento", "texto", "video"],
      tipo_ubicacion: ["punto", "zona"],
    },
  },
} as const
