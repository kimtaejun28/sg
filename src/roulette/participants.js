export const MAX_MARBLES = 120

// "이름", "이름*3", "이름/3" 을 모두 받아 구슬 목록으로 편다.
export function parseParticipants(text) {
  const out = []
  for (const rawLine of String(text || '').split('\n')) {
    for (const chunk of rawLine.split(',')) {
      const token = chunk.trim()
      if (!token) continue
      const m = token.match(/^(.*?)\s*[*/]\s*(\d{1,3})$/)
      let name = token
      let count = 1
      if (m && m[1].trim()) {
        name = m[1].trim()
        count = Math.min(Math.max(parseInt(m[2], 10) || 1, 1), 100)
      }
      for (let i = 0; i < count; i++) {
        if (out.length >= MAX_MARBLES) return out
        out.push(name)
      }
    }
  }
  return out
}

export function shuffle(list, rand = Math.random) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const toB64 = (str) => {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromB64 = (str) => {
  const norm = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeShare({ namesText, winnerCount, mapId }) {
  const params = new URLSearchParams()
  params.set('p', toB64(namesText))
  params.set('w', String(winnerCount))
  params.set('m', mapId)
  return `${window.location.origin}${window.location.pathname}#${params.toString()}`
}

export function decodeShare(hash) {
  try {
    const params = new URLSearchParams(String(hash || '').replace(/^#/, ''))
    if (!params.get('p')) return null
    return {
      namesText: fromB64(params.get('p')),
      winnerCount: Math.max(1, parseInt(params.get('w') || '1', 10)),
      mapId: params.get('m') || 'zigzag',
    }
  } catch {
    return null
  }
}
