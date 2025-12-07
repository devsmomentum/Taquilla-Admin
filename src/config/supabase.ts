import { createClient } from '@supabase/supabase-js'

// Provide safe development fallbacks so the app doesn't crash when
// environment variables are not set locally. Production should still
// set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:9999'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key'

// Ensure single client instance per browser context to avoid GoTrue warnings
const globalKey = '__supabase_client__'
// Create with options once
const _client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-admin-config-auth-token',
  },
  db: { schema: 'public' },
  realtime: { params: { eventsPerSecond: 10 } },
})
// @ts-ignore
export const supabase = (window as any)[globalKey] ?? _client
// @ts-ignore
;(window as any)[globalKey] = supabase

export const isSupabaseConfigured = (): boolean => {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          name: string
          description: string
          permissions: string[]
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          permissions: string[]
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          permissions?: string[]
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          password_hash: string
          is_active: boolean
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          password_hash: string
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password_hash?: string
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: string
          assigned_at: string
        }
        Insert: {
          user_id: string
          role_id: string
          assigned_at?: string
        }
        Update: {
          user_id?: string
          role_id?: string
          assigned_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          name: string
          key_hash: string
          key_prefix: string
          description: string
          is_active: boolean
          permissions: string[]
          created_at: string
          created_by: string
          last_used_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          key_hash: string
          key_prefix: string
          description: string
          is_active?: boolean
          permissions: string[]
          created_at?: string
          created_by: string
          last_used_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          description?: string
          is_active?: boolean
          permissions?: string[]
          created_at?: string
          created_by?: string
          last_used_at?: string | null
          updated_at?: string
        }
      }
      lotteries: {
        Row: {
          id: string
          name: string
          opening_time: string
          closing_time: string
          draw_time: string
          is_active: boolean
          plays_tomorrow: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          opening_time: string
          closing_time: string
          draw_time: string
          is_active?: boolean
          plays_tomorrow?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          opening_time?: string
          closing_time?: string
          draw_time?: string
          is_active?: boolean
          plays_tomorrow?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      prizes: {
        Row: {
          id: string
          lottery_id: string
          animal_number: string
          animal_name: string
          multiplier: number
          created_at: string
        }
        Insert: {
          id?: string
          lottery_id: string
          animal_number: string
          animal_name: string
          multiplier: number
          created_at?: string
        }
        Update: {
          id?: string
          lottery_id?: string
          animal_number?: string
          animal_name?: string
          multiplier?: number
          created_at?: string
        }
      }
      bets: {
        Row: {
          id: string
          lottery_id: string
          lottery_name: string
          animal_number: string
          animal_name: string
          amount: number
          potential_win: number
          is_winner: boolean
          created_at: string
          created_by_api_key: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          lottery_id: string
          lottery_name: string
          animal_number: string
          animal_name: string
          amount: number
          potential_win: number
          is_winner?: boolean
          created_at?: string
          created_by_api_key?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          lottery_id?: string
          lottery_name?: string
          animal_number?: string
          animal_name?: string
          amount?: number
          potential_win?: number
          is_winner?: boolean
          created_at?: string
          created_by_api_key?: string | null
          updated_at?: string
        }
      }
      draws: {
        Row: {
          id: string
          lottery_id: string
          lottery_name: string
          winning_animal_number: string
          winning_animal_name: string
          draw_time: string
          total_payout: number
          winners_count: number
          created_at: string
        }
        Insert: {
          id?: string
          lottery_id: string
          lottery_name: string
          winning_animal_number: string
          winning_animal_name: string
          draw_time: string
          total_payout?: number
          winners_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          lottery_id?: string
          lottery_name?: string
          winning_animal_number?: string
          winning_animal_name?: string
          draw_time?: string
          total_payout?: number
          winners_count?: number
          created_at?: string
        }
      }
      pots: {
        Row: {
          id: number
          name: string
          percentage: number
          balance: number
          color: string
          description: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          percentage: number
          balance?: number
          color: string
          description: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          percentage?: number
          balance?: number
          color?: string
          description?: string
          updated_at?: string
        }
      }
      transfers: {
        Row: {
          id: string
          from_pot: string
          to_pot: string
          amount: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          from_pot: string
          to_pot: string
          amount: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          from_pot?: string
          to_pot?: string
          amount?: number
          created_at?: string
          created_by?: string | null
        }
      }
      withdrawals: {
        Row: {
          id: string
          from_pot: string
          amount: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          from_pot: string
          amount: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          from_pot?: string
          amount?: number
          created_at?: string
          created_by?: string | null
        }
      }
    }
    Views: {
      users_with_roles: {
        Row: {
          id: string
          name: string
          email: string
          is_active: boolean
          created_at: string
          created_by: string | null
          roles: Array<{
            id: string
            name: string
            description: string
          }>
          permissions: string[]
        }
      }
      lottery_statistics: {
        Row: {
          id: string
          name: string
          is_active: boolean
          total_bets: number
          total_winners: number
          total_bet_amount: number
          total_payout: number
          total_draws: number
        }
      }
      pots_summary: {
        Row: {
          name: string
          percentage: number
          balance: number
          color: string
          description: string
          updated_at: string
          total_balance: number
          actual_percentage: number
        }
      }
    }
    Functions: {
      get_user_permissions: {
        Args: {
          user_uuid: string
        }
        Returns: string[]
      }
      verify_api_key: {
        Args: {
          api_key_hash: string
        }
        Returns: Array<{
          id: string
          is_valid: boolean
          permissions: string[]
        }>
      }
    }
  }
}
