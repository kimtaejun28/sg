import { useEffect, useRef, useState } from 'react'
import { fetchAll, replaceAll, rowsToState, subscribeToChanges } from '../sync'

const PUSH_DELAY_MS = 800

// 처음 연결할 때만 쓰는 합치기.
// 기록은 양쪽을 합친다 — 한쪽에만 있던 기록이 사라지면 안 되기 때문이다(기록 우선 원칙).
// 설정 성격의 항목은 원격에 값이 있으면 원격을 따른다.
function mergeOnFirstSync(local, remote) {
  const recordsById = new Map()
  local.records.forEach((r) => recordsById.set(r.id, r))
  remote.records.forEach((r) => recordsById.set(r.id, r))

  const detailHistory = { ...local.detailHistory }
  Object.entries(remote.detailHistory).forEach(([behaviorId, list]) => {
    detailHistory[behaviorId] = list
  })

  return {
    students: remote.students.length ? remote.students : local.students,
    behaviors: remote.behaviors.length ? remote.behaviors : local.behaviors,
    periods: remote.periods.length ? remote.periods : local.periods,
    records: [...recordsById.values()],
    password: remote.password ?? local.password,
    detailHistory,
  }
}

/**
 * 로그인되어 있을 때 앱 상태를 Supabase와 양방향으로 맞춘다.
 * 'idle' | 'syncing' | 'synced' | 'error' 상태를 돌려준다.
 */
export function useSupabaseSync({ enabled, state, applyRemote }) {
  const [status, setStatus] = useState('idle')
  const lastSyncedRef = useRef(null)
  const readyRef = useRef(false)

  // 최신 값을 effect 안에서 읽되, 값이 바뀔 때마다 effect가 다시 돌지는 않게 한다
  const stateRef = useRef(state)
  stateRef.current = state
  const applyRemoteRef = useRef(applyRemote)
  applyRemoteRef.current = applyRemote

  // 최초 동기화 + 다른 기기의 변경 구독
  useEffect(() => {
    if (!enabled) {
      readyRef.current = false
      setStatus('idle')
      return
    }

    let cancelled = false

    async function adoptRemote(isFirst) {
      const remote = rowsToState(await fetchAll())
      if (cancelled) return
      const next = isFirst ? mergeOnFirstSync(stateRef.current, remote) : remote
      lastSyncedRef.current = JSON.stringify(next)
      applyRemoteRef.current(next)
    }

    async function start() {
      setStatus('syncing')
      try {
        await adoptRemote(true)
        if (cancelled) return
        // 합친 결과를 원격에도 반영해 두 기기를 같은 상태로 만든다
        await replaceAll(stateRef.current)
        if (cancelled) return
        readyRef.current = true
        setStatus('synced')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    start()

    const unsubscribe = subscribeToChanges(() => {
      if (!readyRef.current) return
      adoptRemote(false).catch(() => setStatus('error'))
    })

    return () => {
      cancelled = true
      readyRef.current = false
      unsubscribe()
    }
  }, [enabled])

  // 이 기기에서 바뀐 내용을 원격으로 올린다
  useEffect(() => {
    if (!enabled || !readyRef.current) return
    const json = JSON.stringify(state)
    // 방금 원격에서 받아 적용한 것과 같으면 되돌려 보내지 않는다(무한 루프 방지)
    if (json === lastSyncedRef.current) return

    const timer = setTimeout(async () => {
      setStatus('syncing')
      try {
        await replaceAll(state)
        lastSyncedRef.current = json
        setStatus('synced')
      } catch {
        setStatus('error')
      }
    }, PUSH_DELAY_MS)

    return () => clearTimeout(timer)
  }, [enabled, state])

  return status
}
