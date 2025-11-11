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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      amazon_credentials: {
        Row: {
          created_at: string
          credentials_status: string | null
          id: string
          last_sync_at: string | null
          marketplace_id: string
          refresh_token_encrypted: string | null
          seller_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials_status?: string | null
          id?: string
          last_sync_at?: string | null
          marketplace_id?: string
          refresh_token_encrypted?: string | null
          seller_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials_status?: string | null
          id?: string
          last_sync_at?: string | null
          marketplace_id?: string
          refresh_token_encrypted?: string | null
          seller_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      claim_invoices: {
        Row: {
          claim_id: string
          created_at: string | null
          file_name: string
          file_path: string
          id: string
          invoice_date: string | null
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          claim_id: string
          created_at?: string | null
          file_name: string
          file_path: string
          id?: string
          invoice_date?: string | null
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          claim_id?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          invoice_date?: string | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          actual_recovered: number
          amount: number
          asin: string | null
          bill_sent_at: string | null
          case_id: string | null
          claim_date: string
          claim_id: string
          company_name: string | null
          created_at: string
          discrepancy: number
          feedback: string | null
          id: string
          item_name: string
          last_updated: string
          reimbursement_id: string | null
          shipment_id: string
          shipment_type: string
          sku: string
          status: string
          total_qty_expected: number
          total_qty_received: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_recovered?: number
          amount?: number
          asin?: string | null
          bill_sent_at?: string | null
          case_id?: string | null
          claim_date: string
          claim_id: string
          company_name?: string | null
          created_at?: string
          discrepancy: number
          feedback?: string | null
          id?: string
          item_name: string
          last_updated?: string
          reimbursement_id?: string | null
          shipment_id: string
          shipment_type: string
          sku: string
          status?: string
          total_qty_expected: number
          total_qty_received: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_recovered?: number
          amount?: number
          asin?: string | null
          bill_sent_at?: string | null
          case_id?: string | null
          claim_date?: string
          claim_id?: string
          company_name?: string | null
          created_at?: string
          discrepancy?: number
          feedback?: string | null
          id?: string
          item_name?: string
          last_updated?: string
          reimbursement_id?: string | null
          shipment_id?: string
          shipment_type?: string
          sku?: string
          status?: string
          total_qty_expected?: number
          total_qty_received?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_name: string
          country: string | null
          created_at: string | null
          email: string
          id: string
          phone: string | null
          state: string | null
          status: string | null
          total_claims: number | null
          total_reimbursed: number | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_name: string
          country?: string | null
          created_at?: string | null
          email: string
          id?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          total_claims?: number | null
          total_reimbursed?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          total_claims?: number | null
          total_reimbursed?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          analysis_status: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          line_items: Json | null
          updated_at: string | null
          upload_date: string | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          analysis_status?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          line_items?: Json | null
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
          vendor?: string | null
        }
        Update: {
          analysis_status?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          line_items?: Json | null
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      missing_invoice_notifications: {
        Row: {
          claim_ids: string[] | null
          client_email: string
          client_name: string
          company_name: string
          created_at: string
          description: string | null
          document_type: string
          id: string
          missing_count: number | null
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string | null
          status: string
          updated_at: string
          uploaded_invoice_id: string | null
        }
        Insert: {
          claim_ids?: string[] | null
          client_email: string
          client_name: string
          company_name: string
          created_at?: string
          description?: string | null
          document_type?: string
          id?: string
          missing_count?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          uploaded_invoice_id?: string | null
        }
        Update: {
          claim_ids?: string[] | null
          client_email?: string
          client_name?: string
          company_name?: string
          created_at?: string
          description?: string | null
          document_type?: string
          id?: string
          missing_count?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          uploaded_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missing_invoice_notifications_uploaded_invoice_id_fkey"
            columns: ["uploaded_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      proof_of_delivery: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          shipment_id: string | null
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          shipment_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          shipment_id?: string | null
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_delivery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_discrepancies: {
        Row: {
          actual_quantity: number
          created_at: string
          difference: number
          discrepancy_type: string
          expected_quantity: number
          id: string
          notes: string | null
          shipment_id: string
          shipment_item_id: string | null
          sku: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_quantity: number
          created_at?: string
          difference: number
          discrepancy_type: string
          expected_quantity: number
          id?: string
          notes?: string | null
          shipment_id: string
          shipment_item_id?: string | null
          sku: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          difference?: number
          discrepancy_type?: string
          expected_quantity?: number
          id?: string
          notes?: string | null
          shipment_id?: string
          shipment_item_id?: string | null
          sku?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_discrepancies_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_discrepancies_shipment_item_id_fkey"
            columns: ["shipment_item_id"]
            isOneToOne: false
            referencedRelation: "shipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          created_at: string
          fnsku: string | null
          id: string
          prep_details: Json | null
          quantity_in_case: number | null
          quantity_received: number
          quantity_shipped: number
          shipment_id: string
          sku: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fnsku?: string | null
          id?: string
          prep_details?: Json | null
          quantity_in_case?: number | null
          quantity_received?: number
          quantity_shipped?: number
          shipment_id: string
          sku: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fnsku?: string | null
          id?: string
          prep_details?: Json | null
          quantity_in_case?: number | null
          quantity_received?: number
          quantity_shipped?: number
          shipment_id?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          amazon_reference_id: string | null
          created_at: string
          created_date: string | null
          destination_fulfillment_center: string | null
          id: string
          items: Json | null
          label_prep_type: string | null
          last_updated_date: string | null
          ship_from_address: Json | null
          ship_to_address: Json | null
          shipment_id: string
          shipment_name: string | null
          shipment_status: string | null
          shipment_type: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amazon_reference_id?: string | null
          created_at?: string
          created_date?: string | null
          destination_fulfillment_center?: string | null
          id?: string
          items?: Json | null
          label_prep_type?: string | null
          last_updated_date?: string | null
          ship_from_address?: Json | null
          ship_to_address?: Json | null
          shipment_id: string
          shipment_name?: string | null
          shipment_status?: string | null
          shipment_type: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amazon_reference_id?: string | null
          created_at?: string
          created_date?: string | null
          destination_fulfillment_center?: string | null
          id?: string
          items?: Json | null
          label_prep_type?: string | null
          last_updated_date?: string | null
          ship_from_address?: Json | null
          ship_to_address?: Json | null
          shipment_id?: string
          shipment_name?: string | null
          shipment_status?: string | null
          shipment_type?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_notification_invoice_status: {
        Args: { p_invoice_id: string; p_notification_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
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
      app_role: ["admin", "customer"],
    },
  },
} as const
