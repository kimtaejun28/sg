const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 두 값이 모두 있어야 동기화를 켠다. 없으면 앱은 기존처럼 이 기기에만 저장한다.
export const isSyncConfigured = Boolean(url && anonKey)

let client = null
let initPromise = null

/**
 * Supabase 라이브러리는 200KB가 넘고 동기화를 쓸 때만 필요하다.
 * 설정돼 있을 때만 따로 받아오도록 동적 import로 분리해 둔다.
 */
export function initSupabase() {
  if (!isSyncConfigured) return Promise.resolve(null)
  if (!initPromise) {
    initPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(url, anonKey, {
        auth: {
          persistSession: true, // 기기마다 한 번만 로그인하면 된다
          autoRefreshToken: true,
        },
      })
      return client
    })
  }
  return initPromise
}

// 앱이 로그인 확인을 마친 뒤에만 호출되므로 이 시점에는 항상 준비돼 있다
export function getSupabase() {
  return client
}
