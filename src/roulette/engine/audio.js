// 파일 없이 WebAudio 로 직접 만드는 효과음
let ctx = null
let lastClick = 0

function ac() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function unlockAudio() {
  ac()
}

function tone(freq, { duration = 0.12, gain = 0.06, type = 'sine', delay = 0 } = {}) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

// 구슬끼리 부딪힐 때 나는 소리. 너무 시끄럽지 않게 초당 횟수를 제한한다.
export function playClick(count = 1) {
  const now = performance.now()
  if (now - lastClick < 70) return
  lastClick = now
  const strength = Math.min(count, 6)
  tone(520 + Math.random() * 460, { duration: 0.05, gain: 0.012 + strength * 0.004, type: 'triangle' })
}

export function playGoal(rank) {
  const base = rank === 1 ? 880 : 620
  tone(base, { duration: 0.16, gain: 0.07, type: 'square' })
  tone(base * 1.5, { duration: 0.18, gain: 0.05, type: 'square', delay: 0.07 })
}

export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone(f, { duration: 0.32, gain: 0.08, type: 'triangle', delay: i * 0.11 }))
}
