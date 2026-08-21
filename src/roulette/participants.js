export const MAX_MARBLES = 120

const COLOR_RE = /^(.*?)\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const COUNT_RE = /^(.*?)\s*[*/]\s*(\d{1,3})$/

// "이름", "이름*3", "이름#f43f5e", "이름*3#f43f5e" 를 모두 받아 구슬 목록으로 편다.
export function parseParticipants(text) {
  const out = []
  for (const rawLine of String(text || '').split('\n')) {
    for (const chunk of rawLine.split(',')) {
      const token = chunk.trim()
      if (!token) continue

      let rest = token
      let color = null
      const colorMatch = rest.match(COLOR_RE)
      if (colorMatch && colorMatch[1].trim()) {
        rest = colorMatch[1].trim()
        color = `#${colorMatch[2]}`
      }

      let name = rest
      let count = 1
      const countMatch = rest.match(COUNT_RE)
      if (countMatch && countMatch[1].trim()) {
        name = countMatch[1].trim()
        count = Math.min(Math.max(parseInt(countMatch[2], 10) || 1, 1), 100)
      }

      for (let i = 0; i < count; i++) {
        if (out.length >= MAX_MARBLES) return out
        out.push({ name, color })
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

// 표에서 읽어온 행에서 이름 열만 추린다. 첫 줄이 머리글이면 버린다.
export function namesFromRows(rows) {
  const first = rows
    .map((row) => (Array.isArray(row) ? row[0] : row))
    .map((cell) => (cell === null || cell === undefined ? '' : String(cell).trim()))
    .filter(Boolean)
  if (first.length && /^(이름|성명|name|참가자)$/i.test(first[0])) first.shift()
  return first.slice(0, MAX_MARBLES)
}

export function parseCsv(text) {
  return namesFromRows(
    String(text || '')
      .split(/\r?\n/)
      .map((line) => [line.split(',')[0].replace(/^"|"$/g, '')]),
  )
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

export function encodeShare({ namesText, winnerCount, mapId, mode, teamCount }) {
  const params = new URLSearchParams()
  params.set('p', toB64(namesText))
  params.set('w', String(winnerCount))
  params.set('m', mapId)
  params.set('mode', mode)
  params.set('t', String(teamCount))
  return `${window.location.origin}${window.location.pathname}#${params.toString()}`
}

export function decodeShare(hash) {
  try {
    const params = new URLSearchParams(String(hash || '').replace(/^#/, ''))
    if (!params.get('p')) return null
    const mode = params.get('mode')
    return {
      namesText: fromB64(params.get('p')),
      winnerCount: Math.max(1, parseInt(params.get('w') || '1', 10)),
      mapId: params.get('m') || 'zigzag',
      mode: ['first', 'last', 'team'].includes(mode) ? mode : 'first',
      teamCount: Math.max(2, parseInt(params.get('t') || '2', 10)),
    }
  } catch {
    return null
  }
}
