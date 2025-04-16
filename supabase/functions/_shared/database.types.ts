export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      klaviyo_campaigns: {
        Row: {
          average_order_value: number | null
          bounce_rate: number | null
          bounced: number | null
          bounced_or_failed: number | null
          bounced_or_failed_rate: number | null
          campaign_id: string
          click_rate: number | null
          click_to_open_rate: number | null
          clicks: number | null
          clicks_unique: number | null
          conversion_rate: number | null
          conversion_uniques: number | null
          conversion_value: number | null
          conversions: number | null
          delivered: number | null
          delivery_rate: number | null
          failed: number | null
          failed_rate: number | null
          open_rate: number | null
          opens: number | null
          opens_unique: number | null
          recipients: number | null
          revenue_per_recipient: number | null
          spam_complaint_rate: number | null
          spam_complaints: number | null
          store_name: string | null
          unsubscribe_rate: number | null
          unsubscribe_uniques: number | null
          unsubscribes: number | null
        }
        Insert: {
          average_order_value?: number | null
          bounce_rate?: number | null
          bounced?: number | null
          bounced_or_failed?: number | null
          bounced_or_failed_rate?: number | null
          campaign_id: string
          click_rate?: number | null
          click_to_open_rate?: number | null
          clicks?: number | null
          clicks_unique?: number | null
          conversion_rate?: number | null
          conversion_uniques?: number | null
          conversion_value?: number | null
          conversions?: number | null
          delivered?: number | null
          delivery_rate?: number | null
          failed?: number | null
          failed_rate?: number | null
          open_rate?: number | null
          opens?: number | null
          opens_unique?: number | null
          recipients?: number | null
          revenue_per_recipient?: number | null
          spam_complaint_rate?: number | null
          spam_complaints?: number | null
          store_name?: string | null
          unsubscribe_rate?: number | null
          unsubscribe_uniques?: number | null
          unsubscribes?: number | null
        }
        Update: {
          average_order_value?: number | null
          bounce_rate?: number | null
          bounced?: number | null
          bounced_or_failed?: number | null
          bounced_or_failed_rate?: number | null
          campaign_id?: string
          click_rate?: number | null
          click_to_open_rate?: number | null
          clicks?: number | null
          clicks_unique?: number | null
          conversion_rate?: number | null
          conversion_uniques?: number | null
          conversion_value?: number | null
          conversions?: number | null
          delivered?: number | null
          delivery_rate?: number | null
          failed?: number | null
          failed_rate?: number | null
          open_rate?: number | null
          opens?: number | null
          opens_unique?: number | null
          recipients?: number | null
          revenue_per_recipient?: number | null
          spam_complaint_rate?: number | null
          spam_complaints?: number | null
          store_name?: string | null
          unsubscribe_rate?: number | null
          unsubscribe_uniques?: number | null
          unsubscribes?: number | null
        }
        Relationships: []
      }
      shopify_data: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          confirmation_number: string | null
          created_at: string
          current_shipping_price_set: Json | null
          current_subtotal_price_set: Json | null
          customer: Json | null
          display_refund_status: string | null
          email: string | null
          fetched_at: string | null
          fully_paid: boolean | null
          order_name: string | null
          processed_at: string | null
          refunds: Json | null
          shopify_order_id: string
          store_name: string
          subtotal_price_set: Json | null
          total_refunded_set: Json | null
          transactions: Json | null
          unpaid: boolean | null
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmation_number?: string | null
          created_at: string
          current_shipping_price_set?: Json | null
          current_subtotal_price_set?: Json | null
          customer?: Json | null
          display_refund_status?: string | null
          email?: string | null
          fetched_at?: string | null
          fully_paid?: boolean | null
          order_name?: string | null
          processed_at?: string | null
          refunds?: Json | null
          shopify_order_id: string
          store_name: string
          subtotal_price_set?: Json | null
          total_refunded_set?: Json | null
          transactions?: Json | null
          unpaid?: boolean | null
          updated_at: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          confirmation_number?: string | null
          created_at?: string
          current_shipping_price_set?: Json | null
          current_subtotal_price_set?: Json | null
          customer?: Json | null
          display_refund_status?: string | null
          email?: string | null
          fetched_at?: string | null
          fully_paid?: boolean | null
          order_name?: string | null
          processed_at?: string | null
          refunds?: Json | null
          shopify_order_id?: string
          store_name?: string
          subtotal_price_set?: Json | null
          total_refunded_set?: Json | null
          transactions?: Json | null
          unpaid?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
