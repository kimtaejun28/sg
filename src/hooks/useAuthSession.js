import { useEffect, useState } from 'react'
import { initSupabase, isSyncConfigured } from '../supabase'

export function useAuthSession() {
  const [session, setSession] = useState(null)
  // 동기화를 안 쓰면 기다릴 것이 없다
  const [loading, setLoading] = useState(isSyncConfigured)

  useEffect(() => {
    if (!isSyncConfigured) return
    let cancelled = false
    let unsubscribe = () => {}

    initSupabase()
      .then(async (client) => {
        const { data } = await client.auth.getSession()
        if (cancelled) return
        setSession(data.session ?? null)
        setLoading(false)

        const listener = client.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession ?? null)
        })
        unsubscribe = () => listener.data.subscription.unsubscribe()
      })
      .catch(() => {
        // 라이브러리를 못 받아왔더라도 앱은 이 기기 저장 모드로 계속 쓸 수 있어야 한다
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return { session, loading }
}
