import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export type Restaurant = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  honbab_level: 1 | 2 | 3
  honbab_tags: string[]
  price_range: 1 | 2 | 3 | 4
  up_votes: number
  down_votes: number
  price_good_votes: number
  price_bad_votes: number
  edit_count: number
  created_at: string
}

export type HonbabTip = {
  id: string
  restaurant_id: string
  nickname: string
  tip: string
  created_at: string
}

export type Post = {
  id: string
  title: string
  content: string
  author: string
  views: number
  created_at: string
  comment_count?: number
}

export type Comment = {
  id: string
  post_id: string
  content: string
  author: string
  created_at: string
}

export type ChatRoom = {
  id: string
  restaurant_id: string
  participants_count: number
  restaurant?: Restaurant
}

export type Message = {
  id: string
  room_id: string
  content: string
  author: string
  created_at: string
}
