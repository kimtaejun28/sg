import * as pl from 'planck'
import { buildMap, MARBLE_R, SPAWN_TOP, WORLD_W } from './maps.js'

export const STEP = 1 / 60

// 구슬 색: 황금각으로 돌려 서로 잘 구분되는 색을 뽑는다
export function marbleColor(i) {
  return `hsl(${(i * 137.508) % 360}, 72%, 56%)`
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Race {
  constructor(mapId, names, seed = Date.now()) {
    this.map = buildMap(mapId)
    this.names = names
    this.rand = mulberry32(seed)
    this.time = 0
    this.results = []
    this.impacts = 0
    this.finished = false

    this.world = new pl.World({ gravity: new pl.Vec2(0, 10) })
    this.movers = []
    this.buildEntities()
    this.spawnMarbles()

    this.world.on('post-solve', (contact, impulse) => {
      const max = Math.max(...impulse.normalImpulses)
      if (max > 0.25) this.impacts += 1
    })
  }

  buildEntities() {
    for (const ent of this.map.entities) {
      if (ent.kind === 'wall') {
        const body = this.world.createBody({ type: 'static' })
        const verts = ent.pts.map(([x, y]) => new pl.Vec2(x, y))
        for (let i = 0; i < verts.length - 1; i++) {
          body.createFixture({
            shape: new pl.Edge(verts[i], verts[i + 1]),
            friction: 0.04,
            restitution: 0.18,
          })
        }
      } else if (ent.kind === 'peg') {
        const body = this.world.createBody({ type: 'static', position: new pl.Vec2(ent.x, ent.y) })
        body.createFixture({ shape: new pl.Circle(ent.r), friction: 0.02, restitution: 0.42 })
      } else if (ent.kind === 'spinner' || ent.kind === 'pinwheel') {
        const body = this.world.createBody({
          type: 'kinematic',
          position: new pl.Vec2(ent.x, ent.y),
        })
        const arms = ent.kind === 'spinner' ? 1 : ent.arms
        for (let a = 0; a < arms; a++) {
          const angle = (Math.PI * a) / arms
          const half = ent.kind === 'spinner' ? ent.len / 2 : ent.len
          body.createFixture({
            shape: new pl.Box(half, ent.thick / 2, new pl.Vec2(0, 0), angle),
            friction: 0.04,
            restitution: 0.3,
            density: 1,
          })
        }
        body.setAngularVelocity(ent.speed)
        this.movers.push({ entity: ent, body })
      }
    }
  }

  spawnMarbles() {
    this.marbles = []
    const perRow = 9
    const spacing = (WORLD_W - 2) / (perRow - 1)
    // 출발 위치에 따른 유불리가 참가자 순서와 엮이지 않도록 자리를 섞는다
    const slots = this.names.map((_, i) => i)
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1))
      ;[slots[i], slots[j]] = [slots[j], slots[i]]
    }
    this.names.forEach((name, i) => {
      const slot = slots[i]
      const row = Math.floor(slot / perRow)
      const col = slot % perRow
      const x = 1 + col * spacing + (this.rand() - 0.5) * 0.25
      const y = 3.2 - row * 0.85 - this.rand() * 0.15
      const body = this.world.createBody({
        type: 'dynamic',
        position: new pl.Vec2(Math.min(Math.max(x, 0.6), WORLD_W - 0.6), Math.max(y, SPAWN_TOP + 1)),
        bullet: true,
        linearDamping: 0,
        angularDamping: 0.02,
      })
      body.createFixture({
        shape: new pl.Circle(MARBLE_R),
        density: 1,
        friction: 0.03,
        restitution: 0.32,
      })
      this.marbles.push({
        index: i,
        name,
        body,
        color: marbleColor(i),
        rank: null,
        stuckFor: 0,
        rescues: 0,
        bestY: y,
      })
    })
  }

  // 한 스텝 진행. 이번 스텝에 결승선을 통과한 구슬 목록을 돌려준다.
  step() {
    if (this.finished) return []
    this.world.step(STEP, 8, 3)
    this.time += STEP
    const arrived = []
    const dead = []
    for (const m of this.marbles) {
      if (m.rank !== null) continue
      const pos = m.body.getPosition()
      if (pos.y > this.map.goalY) {
        m.rank = this.results.length + 1
        const record = { index: m.index, name: m.name, rank: m.rank, time: this.time, color: m.color }
        this.results.push(record)
        arrived.push(record)
        dead.push(m)
        continue
      }
      // 어딘가에 껴서 못 내려가는 구슬 구조: 최고 도달 지점이 갱신되지 않으면 껴 있는 것으로 본다
      if (pos.y > m.bestY + 0.05) {
        m.bestY = pos.y
        m.stuckFor = 0
        m.rescues = 0
      } else {
        m.stuckFor += STEP
        if (m.stuckFor > 1.5) {
          m.rescues += 1
          if (m.rescues < 4) {
            // 먼저 살짝 밀어본다
            m.body.applyLinearImpulse(
              new pl.Vec2((this.rand() - 0.5) * 0.5, 0.3),
              m.body.getWorldCenter(),
              true,
            )
          } else {
            // 완전히 낀 경우(못과 벽 사이 등)에는 살짝 들어올려 빼낸다
            const toCenter = pos.x < WORLD_W / 2 ? 1 : -1
            m.body.setPosition(new pl.Vec2(pos.x + toCenter * 0.35, pos.y - 0.55))
            m.body.setLinearVelocity(new pl.Vec2(toCenter * 1.2, 0))
            m.body.setAwake(true)
          }
          m.stuckFor = 0
        }
      }
    }
    for (const m of dead) {
      this.world.destroyBody(m.body)
      m.body = null
    }
    if (this.results.length === this.marbles.length) this.finished = true
    return arrived
  }

  consumeImpacts() {
    const n = this.impacts
    this.impacts = 0
    return n
  }

  // 아직 달리는 구슬(렌더링용). 앞선 순서대로 정렬해서 돌려준다.
  running() {
    const list = []
    for (const m of this.marbles) {
      if (m.rank !== null || !m.body) continue
      const p = m.body.getPosition()
      list.push({ index: m.index, name: m.name, color: m.color, x: p.x, y: p.y, angle: m.body.getAngle() })
    }
    return list
  }

  leader() {
    let best = null
    for (const m of this.marbles) {
      if (m.rank !== null || !m.body) continue
      const p = m.body.getPosition()
      if (!best || p.y > best.y) best = { x: p.x, y: p.y, index: m.index }
    }
    return best
  }

  movingParts() {
    return this.movers.map(({ entity, body }) => ({
      entity,
      x: body.getPosition().x,
      y: body.getPosition().y,
      angle: body.getAngle(),
    }))
  }

  // 결과만 필요할 때 남은 경기를 한 번에 계산한다
  fastForward(maxSeconds = 180) {
    const limit = Math.ceil(maxSeconds / STEP)
    let n = 0
    while (!this.finished && n < limit) {
      this.step()
      n += 1
    }
    return this.finished
  }
}
