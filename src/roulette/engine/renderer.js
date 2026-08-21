import { MARBLE_R, WORLD_W } from './maps.js'

const COLORS = {
  bg0: '#0b1220',
  bg1: '#131f36',
  wall: '#7c9cc4',
  wallCore: '#c9dcf2',
  peg: '#8fb0d6',
  mover: '#f59e0b',
  moverEdge: '#fbbf24',
  goal: '#facc15',
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.cam = { x: WORLD_W / 2, y: 0, scale: 40 }
    this.ready = false
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = this.canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width * dpr))
    const h = Math.max(1, Math.round(rect.height * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.w = w
    this.h = h
    this.dpr = dpr
  }

  // 카메라: 선두를 따라가되 뒤따르는 무리까지 화면에 담기도록 배율을 조절한다
  updateCamera(marbles, goalY, zoomed, instant = false) {
    const scaleW = this.w / (zoomed ? 6.4 : WORLD_W + 0.8)
    let targetX = WORLD_W / 2
    let targetY = this.cam.y
    let targetScale = scaleW

    if (marbles.length) {
      let lead = marbles[0]
      for (const m of marbles) if (m.y > lead.y) lead = m
      if (zoomed) {
        targetX = lead.x
        targetY = lead.y + 1.2
      } else {
        const ys = marbles.map((m) => m.y).sort((a, b) => b - a)
        // 뒤처진 몇 개까지 억지로 담지 않도록 상위 70% 만 기준으로 잡는다
        const tail = ys[Math.max(0, Math.ceil(ys.length * 0.7) - 1)]
        const viewH = Math.min(Math.max((lead.y - tail) * 1.35 + 6, 13), 26)
        targetScale = Math.min(scaleW, this.h / viewH)
        targetY = lead.y - 0.3 * (this.h / targetScale)
      }
    }
    if (!marbles.length) {
      // 경기가 끝나면 결승선이 보이도록 카메라를 내려둔다
      targetY = goalY - (this.h / targetScale) * 0.15
    }
    targetY = Math.min(targetY, goalY + 3)

    if (instant || !this.ready) {
      this.cam.x = targetX
      this.cam.y = targetY
      this.cam.scale = targetScale
      this.ready = true
    } else {
      this.cam.x += (targetX - this.cam.x) * 0.14
      this.cam.y += (targetY - this.cam.y) * 0.14
      this.cam.scale += (targetScale - this.cam.scale) * 0.08
    }

    if (zoomed) {
      const halfView = this.w / this.cam.scale / 2
      this.cam.x = Math.min(Math.max(this.cam.x, halfView - 0.4), WORLD_W - halfView + 0.4)
    } else {
      this.cam.x = WORLD_W / 2
    }

    // 부드럽게 따라가더라도 선두는 항상 화면 안에 있어야 한다
    if (marbles.length && !zoomed) {
      let lead = marbles[0]
      for (const m of marbles) if (m.y > lead.y) lead = m
      const viewH = this.h / this.cam.scale
      this.cam.y = Math.min(Math.max(this.cam.y, lead.y - 0.45 * viewH), lead.y + 0.2 * viewH)
    }
  }

  toScreen(x, y) {
    return [
      (x - this.cam.x) * this.cam.scale + this.w / 2,
      (y - this.cam.y) * this.cam.scale + this.h * 0.4,
    ]
  }

  draw(race, { zoomed = false, instant = false } = {}) {
    this.resize()
    const marbles = race.running()
    this.updateCamera(marbles, race.map.goalY, zoomed, instant)
    const ctx = this.ctx
    const s = this.cam.scale

    const grad = ctx.createLinearGradient(0, 0, 0, this.h)
    grad.addColorStop(0, COLORS.bg0)
    grad.addColorStop(1, COLORS.bg1)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.w, this.h)

    // 배경 눈금: 내려가는 속도가 눈에 보이도록
    const top = this.cam.y - (this.h * 0.4) / s
    const bottom = top + this.h / s
    ctx.strokeStyle = 'rgba(148,163,184,0.10)'
    ctx.lineWidth = 1
    for (let y = Math.floor(top / 5) * 5; y < bottom; y += 5) {
      const [, sy] = this.toScreen(0, y)
      ctx.beginPath()
      ctx.moveTo(0, sy)
      ctx.lineTo(this.w, sy)
      ctx.stroke()
    }

    const visible = (y, pad = 3) => y > top - pad && y < bottom + pad

    // 정적 구조물
    for (const ent of race.map.entities) {
      if (ent.kind === 'wall') {
        if (!ent.pts.some(([, y]) => visible(y, 6))) continue
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = COLORS.wall
        ctx.lineWidth = Math.max(2, 0.22 * s)
        ctx.beginPath()
        ent.pts.forEach(([x, y], i) => {
          const [sx, sy] = this.toScreen(x, y)
          if (i === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        })
        ctx.stroke()
        ctx.strokeStyle = COLORS.wallCore
        ctx.lineWidth = Math.max(1, 0.07 * s)
        ctx.stroke()
      } else if (ent.kind === 'peg') {
        if (!visible(ent.y)) continue
        const [sx, sy] = this.toScreen(ent.x, ent.y)
        ctx.fillStyle = COLORS.peg
        ctx.beginPath()
        ctx.arc(sx, sy, ent.r * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.beginPath()
        ctx.arc(sx - ent.r * s * 0.3, sy - ent.r * s * 0.3, ent.r * s * 0.35, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 회전하는 구조물
    for (const part of race.movingParts()) {
      const { entity } = part
      if (!visible(part.y, 5)) continue
      const [sx, sy] = this.toScreen(part.x, part.y)
      const arms = entity.kind === 'spinner' ? 1 : entity.arms
      const half = (entity.kind === 'spinner' ? entity.len / 2 : entity.len) * s
      const thick = entity.thick * s
      ctx.save()
      ctx.translate(sx, sy)
      ctx.rotate(part.angle)
      for (let a = 0; a < arms; a++) {
        ctx.save()
        ctx.rotate((Math.PI * a) / arms)
        ctx.fillStyle = COLORS.mover
        ctx.strokeStyle = COLORS.moverEdge
        ctx.lineWidth = Math.max(1, thick * 0.18)
        ctx.beginPath()
        ctx.roundRect(-half, -thick / 2, half * 2, thick, thick / 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.arc(0, 0, Math.max(2, thick * 0.45), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 결승선
    if (visible(race.map.goalY, 8)) {
      const [x0, gy] = this.toScreen(0.2, race.map.goalY)
      const [x1] = this.toScreen(WORLD_W - 0.2, race.map.goalY)
      const cell = Math.max(4, 0.32 * s)
      for (let i = 0; (x0 + i * cell) < x1; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#111827'
        ctx.fillRect(x0 + i * cell, gy - cell / 2, Math.min(cell, x1 - (x0 + i * cell)), cell)
      }
      ctx.fillStyle = COLORS.goal
      ctx.font = `700 ${Math.max(12, 0.5 * s)}px Jua, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('GOAL', (x0 + x1) / 2, gy + cell * 2.1)
    }

    // 구슬
    const r = MARBLE_R * s
    for (const m of marbles) {
      if (!visible(m.y, 2)) continue
      const [sx, sy] = this.toScreen(m.x, m.y)
      ctx.fillStyle = m.color
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = Math.max(1, r * 0.14)
      ctx.stroke()
      // 회전이 보이도록 표식 하나
      ctx.save()
      ctx.translate(sx, sy)
      ctx.rotate(m.angle)
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.beginPath()
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 이름표: 화면이 충분히 클 때만, 앞선 구슬 위주로
    const labelCount = s > 60 ? marbles.length : Math.min(marbles.length, 6)
    const sorted = [...marbles].sort((a, b) => b.y - a.y).slice(0, labelCount)
    ctx.font = `700 ${Math.max(10, Math.min(0.34 * s, 18))}px "Noto Sans KR", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const m of sorted) {
      if (!visible(m.y, 2)) continue
      const [sx, sy] = this.toScreen(m.x, m.y)
      const label = m.name.length > 8 ? `${m.name.slice(0, 8)}…` : m.name
      const tw = ctx.measureText(label).width
      const padX = Math.max(4, r * 0.35)
      const hgt = Math.max(14, r * 1.15)
      const ly = sy - r - hgt * 0.75
      ctx.fillStyle = 'rgba(15,23,42,0.78)'
      ctx.beginPath()
      ctx.roundRect(sx - tw / 2 - padX, ly - hgt / 2, tw + padX * 2, hgt, hgt / 2)
      ctx.fill()
      ctx.fillStyle = m.color
      ctx.fillText(label, sx, ly + 1)
    }
    ctx.textBaseline = 'alphabetic'
  }
}
