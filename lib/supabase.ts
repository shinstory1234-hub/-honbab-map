import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Restaurant = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  honbab_level: 1 | 2 | 3
  honbab_tags: string[]
  created_at: string
}

export type HonbabReport = {
  id: string
  restaurant_id: string
  reported_level: 1 | 2 | 3
  comment: string
  created_at: string
}
