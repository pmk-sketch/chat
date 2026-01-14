import { createClient } from '@supabase/supabase-js'

// Supabase 프로젝트 URL과 퍼블리시 키 설정
const supabaseUrl = 'https://aettotklspkhsqqvlucx.supabase.co'
const supabaseAnonKey = 'sb_publishable_IRTGo1fgVKlIHONW7kuOiA_lByGgFko'

// Supabase 클라이언트 인스턴스 생성 및 내보내기
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
