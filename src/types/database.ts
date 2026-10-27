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
      asignacion_participantes: {
        Row: {
          asignacion_id: string
          hora_fin: string | null
          porcentaje: number | null
          reportado_en: string | null
          usuario_id: string
        }
        Insert: {
          asignacion_id: string
          hora_fin?: string | null
          porcentaje?: number | null
          reportado_en?: string | null
          usuario_id: string
        }
        Update: {
          asignacion_id?: string
          hora_fin?: string | null
          porcentaje?: number | null
          reportado_en?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignacion_participantes_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones: {
        Row: {
          actualizado_por: string | null
          creado_por: string | null
          created_at: string
          forma: Json | null
          geom: unknown
          id: string
          nombre: string
          salida_id: string
          updated_at: string
          zona_id: string | null
        }
        Insert: {
          actualizado_por?: string | null
          creado_por?: string | null
          created_at?: string
          forma?: Json | null
          geom: unknown
          id?: string
          nombre: string
          salida_id: string
          updated_at?: string
          zona_id?: string | null
        }
        Update: {
          actualizado_por?: string | null
          creado_por?: string | null
          created_at?: string
          forma?: Json | null
          geom?: unknown
          id?: string
          nombre?: string
          salida_id?: string
          updated_at?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_salida_id_fkey"
            columns: ["salida_id"]
            isOneToOne: false
            referencedRelation: "salidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      bitacora: {
        Row: {
          accion: Database["public"]["Enums"]["accion_bitacora"]
          cambios: Json | null
          id: number
          ocurrio_en: string
          registro_borrado: Json | null
          registro_id: string
          tabla: string
          usuario_id: string | null
        }
        Insert: {
          accion: Database["public"]["Enums"]["accion_bitacora"]
          cambios?: Json | null
          id?: never
          ocurrio_en?: string
          registro_borrado?: Json | null
          registro_id: string
          tabla: string
          usuario_id?: string | null
        }
        Update: {
          accion?: Database["public"]["Enums"]["accion_bitacora"]
          cambios?: Json | null
          id?: never
          ocurrio_en?: string
          registro_borrado?: Json | null
          registro_id?: string
          tabla?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          actualizado_por: string | null
          color: string
          creado_por: string | null
          created_at: string
          icono: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          color?: string
          creado_por?: string | null
          created_at?: string
          icono?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          color?: string
          creado_por?: string | null
          created_at?: string
          icono?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      comentarios_zona: {
        Row: {
          actualizado_por: string | null
          creado_por: string | null
          created_at: string
          id: string
          texto: string
          ubicacion_id: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          creado_por?: string | null
          created_at?: string
          id?: string
          texto: string
          ubicacion_id: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          creado_por?: string | null
          created_at?: string
          id?: string
          texto?: string
          ubicacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_zona_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      estudio_participantes: {
        Row: {
          estudio_id: string
          usuario_id: string
        }
        Insert: {
          estudio_id: string
          usuario_id: string
        }
        Update: {
          estudio_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudio_participantes_estudio_id_fkey"
            columns: ["estudio_id"]
            isOneToOne: false
            referencedRelation: "estudios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estudio_participantes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estudios: {
        Row: {
          actualizado_por: string | null
          archivado_en: string | null
          archivado_por: string | null
          creado_por: string | null
          created_at: string
          entrevistado: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          notas: string[]
          participantes_anteriores: string[]
          salida_id: string | null
          ubicacion_id: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          archivado_en?: string | null
          archivado_por?: string | null
          creado_por?: string | null
          created_at?: string
          entrevistado?: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          notas?: string[]
          participantes_anteriores?: string[]
          salida_id?: string | null
          ubicacion_id: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          archivado_en?: string | null
          archivado_por?: string | null
          creado_por?: string | null
          created_at?: string
          entrevistado?: string | null
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          notas?: string[]
          participantes_anteriores?: string[]
          salida_id?: string | null
          ubicacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudios_salida_id_fkey"
            columns: ["salida_id"]
            isOneToOne: false
            referencedRelation: "salidas"
            referencedColumns: ["id"]
          },
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
          actualizado_por: string | null
          archivo_bytes: number | null
          archivo_mime: string | null
          archivo_nombre: string | null
          archivo_path: string | null
          creado_por: string | null
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
          actualizado_por?: string | null
          archivo_bytes?: number | null
          archivo_mime?: string | null
          archivo_nombre?: string | null
          archivo_path?: string | null
          creado_por?: string | null
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
          actualizado_por?: string | null
          archivo_bytes?: number | null
          archivo_mime?: string | null
          archivo_nombre?: string | null
          archivo_path?: string | null
          creado_por?: string | null
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
      perfiles: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          avatar_semilla: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
          usuario: string
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          avatar_semilla?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          updated_at?: string
          usuario: string
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          avatar_semilla?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuenta"]
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          updated_at?: string
          usuario?: string
        }
        Relationships: []
      }
      salidas: {
        Row: {
          actualizado_por: string | null
          cancelada_en: string | null
          creado_por: string | null
          created_at: string
          fecha: string
          hora_inicio: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          cancelada_en?: string | null
          creado_por?: string | null
          created_at?: string
          fecha: string
          hora_inicio: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          cancelada_en?: string | null
          creado_por?: string | null
          created_at?: string
          fecha?: string
          hora_inicio?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_zona: {
        Row: {
          actualizado_por: string | null
          color: string
          creado_por: string | null
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          color?: string
          creado_por?: string | null
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          color?: string
          creado_por?: string | null
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      ubicaciones: {
        Row: {
          actualizado_por: string | null
          archivada_en: string | null
          archivada_por: string | null
          categoria_id: string | null
          complemento: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          creado_por: string | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_ubicacion"]
          geom: unknown
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
          tipo_zona_id: string | null
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          archivada_en?: string | null
          archivada_por?: string | null
          categoria_id?: string | null
          complemento?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_ubicacion"]
          geom: unknown
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
          tipo_zona_id?: string | null
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          archivada_en?: string | null
          archivada_por?: string | null
          categoria_id?: string | null
          complemento?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_ubicacion"]
          geom?: unknown
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_ubicacion"]
          tipo_zona_id?: string | null
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
          {
            foreignKeyName: "ubicaciones_tipo_zona_id_fkey"
            columns: ["tipo_zona_id"]
            isOneToOne: false
            referencedRelation: "tipos_zona"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aprobar_usuario: {
        Args: { usuario_id: string }
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          avatar_semilla: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
          usuario: string
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cambiar_rol: {
        Args: {
          rol: Database["public"]["Enums"]["rol_usuario"]
          usuario_id: string
        }
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          avatar_semilla: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
          usuario: string
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cerrar_sesiones: { Args: { usuario_id: string }; Returns: undefined }
      desactivar_usuario: {
        Args: { usuario_id: string }
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          avatar_semilla: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
          usuario: string
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      es_admin: { Args: never; Returns: boolean }
      es_miembro_activo: { Args: never; Returns: boolean }
      limite_manila: { Args: never; Returns: unknown }
      locales_en_zona: {
        Args: { zona_id: string }
        Returns: {
          categoria_id: string
          estado: Database["public"]["Enums"]["estado_ubicacion"]
          id: string
          nombre: string
          ultimo_estudio: string
        }[]
      }
      lugares_mapa: {
        Args: never
        Returns: {
          categoria_id: string
          estado: Database["public"]["Enums"]["estado_ubicacion"]
          geojson: Json
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
          tipo_zona_id: string
        }[]
      }
      notas_validas: { Args: { notas: string[] }; Returns: boolean }
      reactivar_usuario: {
        Args: { usuario_id: string }
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          avatar_semilla: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
          usuario: string
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rechazar_usuario: {
        Args: { usuario_id: string }
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          avatar_semilla: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
          usuario: string
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
          actualizado_por: string | null
          archivada_en: string | null
          archivada_por: string | null
          categoria_id: string | null
          complemento: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          creado_por: string | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_ubicacion"]
          geom: unknown
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
          tipo_zona_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ubicaciones"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      usuario_disponible: { Args: { usuario: string }; Returns: boolean }
      validar_cambio_de_cuenta: {
        Args: { usuario_id: string }
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          avatar_semilla: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
          usuario: string
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      accion_bitacora: "crear" | "editar" | "archivar" | "recuperar" | "borrar"
      estado_cuenta: "pendiente" | "activo" | "rechazado" | "desactivado"
      estado_ubicacion: "activa" | "cerrada"
      proveedor_almacenamiento: "supabase" | "sharepoint" | "otro"
      rol_usuario: "miembro" | "admin"
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
      accion_bitacora: ["crear", "editar", "archivar", "recuperar", "borrar"],
      estado_cuenta: ["pendiente", "activo", "rechazado", "desactivado"],
      estado_ubicacion: ["activa", "cerrada"],
      proveedor_almacenamiento: ["supabase", "sharepoint", "otro"],
      rol_usuario: ["miembro", "admin"],
      tipo_evidencia: ["foto", "audio", "documento", "texto", "video"],
      tipo_ubicacion: ["punto", "zona"],
    },
  },
} as const
