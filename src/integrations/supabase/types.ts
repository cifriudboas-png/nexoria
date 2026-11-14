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
      builder_games: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
          world: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
          world: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          world?: Json
        }
        Relationships: [
          {
            foreignKeyName: "builder_games_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          last_activity_at: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          last_activity_at?: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          last_activity_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          acquired_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_number: number
          banned_at: string | null
          body_colors: Json
          created_at: string
          equipped_accessory: string | null
          equipped_face: string | null
          equipped_hair: string | null
          equipped_shirt: string | null
          id: string
          is_verified: boolean
          nexos: number
          username: string
        }
        Insert: {
          account_number?: number
          banned_at?: string | null
          body_colors?: Json
          created_at?: string
          equipped_accessory?: string | null
          equipped_face?: string | null
          equipped_hair?: string | null
          equipped_shirt?: string | null
          id: string
          is_verified?: boolean
          nexos?: number
          username: string
        }
        Update: {
          account_number?: number
          banned_at?: string | null
          body_colors?: Json
          created_at?: string
          equipped_accessory?: string | null
          equipped_face?: string | null
          equipped_hair?: string | null
          equipped_shirt?: string | null
          id?: string
          is_verified?: boolean
          nexos?: number
          username?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_nexos: {
        Args: { _delta: number; _user_id: string }
        Returns: number
      }
      admin_list_players: {
        Args: { _search?: string }
        Returns: {
          account_number: number
          banned_at: string
          created_at: string
          id: string
          is_admin: boolean
          nexos: number
          username: string
        }[]
      }
      admin_set_banned: {
        Args: { _banned: boolean; _user_id: string }
        Returns: undefined
      }
      builder_is_active_player: { Args: never; Returns: boolean }
      builder_my_game_count: { Args: never; Returns: number }
      catalog_price: { Args: { _item: string }; Returns: number }
      create_forum_post: {
        Args: { _body: string; _title: string }
        Returns: string
      }
      create_forum_reply: {
        Args: { _body: string; _post_id: string }
        Returns: string
      }
      delete_forum_post: { Args: { _post_id: string }; Returns: undefined }
      delete_forum_reply: { Args: { _reply_id: string }; Returns: undefined }
      forum_require_active_player: { Args: never; Returns: undefined }
      get_forum_post: {
        Args: { _post_id: string }
        Returns: {
          author_accessory: string
          author_account_number: number
          author_body_colors: Json
          author_face: string
          author_hair: string
          author_id: string
          author_is_verified: boolean
          author_shirt: string
          author_username: string
          body: string
          created_at: string
          edited_at: string
          id: string
          last_activity_at: string
          reply_count: number
          title: string
        }[]
      }
      get_player_profile: {
        Args: { _username: string }
        Returns: {
          account_number: number
          body_colors: Json
          created_at: string
          equipped_accessory: string
          equipped_face: string
          equipped_hair: string
          equipped_shirt: string
          friend_count: number
          friend_status: string
          id: string
          is_verified: boolean
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_conversations: {
        Args: never
        Returns: {
          account_number: number
          body_colors: Json
          equipped_accessory: string
          equipped_face: string
          equipped_hair: string
          equipped_shirt: string
          id: string
          is_verified: boolean
          last_at: string
          last_body: string
          last_sender_id: string
          unread_count: number
          username: string
        }[]
      }
      list_forum_posts: {
        Args: { _search?: string }
        Returns: {
          author_accessory: string
          author_account_number: number
          author_body_colors: Json
          author_face: string
          author_hair: string
          author_id: string
          author_is_verified: boolean
          author_shirt: string
          author_username: string
          body: string
          created_at: string
          edited_at: string
          id: string
          last_activity_at: string
          reply_count: number
          title: string
        }[]
      }
      list_forum_replies: {
        Args: { _post_id: string }
        Returns: {
          author_accessory: string
          author_account_number: number
          author_body_colors: Json
          author_face: string
          author_hair: string
          author_id: string
          author_is_verified: boolean
          author_shirt: string
          author_username: string
          body: string
          created_at: string
          edited_at: string
          id: string
        }[]
      }
      list_friend_requests: {
        Args: never
        Returns: {
          account_number: number
          body_colors: Json
          direction: string
          equipped_accessory: string
          equipped_face: string
          equipped_hair: string
          equipped_shirt: string
          id: string
          is_verified: boolean
          requested_at: string
          username: string
        }[]
      }
      list_friends: {
        Args: never
        Returns: {
          account_number: number
          body_colors: Json
          equipped_accessory: string
          equipped_face: string
          equipped_hair: string
          equipped_shirt: string
          friends_since: string
          id: string
          is_verified: boolean
          username: string
        }[]
      }
      mark_conversation_read: { Args: { _user_id: string }; Returns: undefined }
      purchase_item: { Args: { _item: string }; Returns: undefined }
      remove_friend: { Args: { _user_id: string }; Returns: undefined }
      respond_friend_request: {
        Args: { _accept: boolean; _user_id: string }
        Returns: string
      }
      search_players: {
        Args: { _query: string }
        Returns: {
          account_number: number
          body_colors: Json
          equipped_accessory: string
          equipped_face: string
          equipped_hair: string
          equipped_shirt: string
          id: string
          is_verified: boolean
          username: string
        }[]
      }
      send_friend_request: { Args: { _user_id: string }; Returns: string }
      send_message: {
        Args: { _body: string; _recipient_id: string }
        Returns: {
          created_at: string
          id: string
        }[]
      }
      set_body_colors: { Args: { _colors: Json }; Returns: undefined }
      set_equipped_accessory: {
        Args: { _accessory: string }
        Returns: undefined
      }
      set_equipped_face: { Args: { _face: string }; Returns: undefined }
      set_equipped_hair: { Args: { _hair: string }; Returns: undefined }
      set_equipped_shirt: { Args: { _shirt: string }; Returns: undefined }
      update_forum_post: {
        Args: { _body: string; _post_id: string; _title: string }
        Returns: undefined
      }
      update_forum_reply: {
        Args: { _body: string; _reply_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
