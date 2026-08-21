// 구슬 레이스 트랙 정의
// 좌표계: x 는 0 ~ WORLD_W, y 는 아래로 갈수록 커진다(중력 방향). 단위는 미터에 가깝게 잡았다.

export const WORLD_W = 10
export const MARBLE_R = 0.25
// 구슬이 출발 전 대기하는 영역의 위쪽 끝(벽도 여기까지 올려 세운다)
export const SPAWN_TOP = -26

const wall = (pts) => ({ kind: 'wall', pts })
const peg = (x, y, r = 0.18) => ({ kind: 'peg', x, y, r })
const spinner = (x, y, len, speed, thick = 0.26) => ({ kind: 'spinner', x, y, len, thick, speed })
// arms 는 가운데를 지나는 막대 개수(막대 1개 = 날개 2개)
const pinwheel = (x, y, len, arms, speed, thick = 0.24) => ({
  kind: 'pinwheel',
  x,
  y,
  len,
  arms,
  thick,
  speed,
})

// 모든 맵이 공유하는 마무리 구간: 깔때기 -> 좁은 목 -> 결승선
// 좁은 목을 하나씩 통과하면서 순위가 갈린다.
function finishSection(yStart) {
  const cx = WORLD_W / 2
  const neck = 0.72 // 목의 반폭
  const yNeck = yStart + 3.4
  const yNeckEnd = yNeck + 1.3
  const entities = [
    wall([
      [0.2, yStart],
      [cx - neck, yNeck],
      [cx - neck, yNeckEnd],
    ]),
    wall([
      [WORLD_W - 0.2, yStart],
      [cx + neck, yNeck],
      [cx + neck, yNeckEnd],
    ]),
    // 목 바로 위에서 도는 막대 하나가 구슬이 아치를 만들어 막히는 것을 풀어준다
    spinner(cx, yNeck - 1.15, 2.0, 3.4, 0.2),
  ]
  const goalY = yNeckEnd + 1.6
  entities.push(
    wall([
      [0.2, goalY + 2.2],
      [WORLD_W - 0.2, goalY + 2.2],
    ]),
  )
  return { entities, goalY, height: goalY + 3 }
}

function withFrame(entities, goalY) {
  // 좌우 바깥 벽
  return [
    wall([
      [0.2, SPAWN_TOP],
      [0.2, goalY + 2.4],
    ]),
    wall([
      [WORLD_W - 0.2, SPAWN_TOP],
      [WORLD_W - 0.2, goalY + 2.4],
    ]),
    ...entities,
  ]
}

// 1. 지그재그: 좌우로 번갈아 기울어진 미끄럼틀 + 회전 막대, 중간에 한 번 모이는 병목
function buildZigzag() {
  const e = []
  const stages = 10
  const gap = 1.5
  let y = 5
  for (let i = 0; i < stages; i++) {
    if (i === 6) {
      // 중간 병목: 모두 한 곳으로 모였다가 다시 흩어지면서 순위가 뒤집힌다
      e.push(wall([
        [0.25, y],
        [WORLD_W / 2 - 0.85, y + 2.6],
      ]))
      e.push(wall([
        [WORLD_W - 0.25, y],
        [WORLD_W / 2 + 0.85, y + 2.6],
      ]))
      e.push(pinwheel(WORLD_W / 2, y + 4.6, 1.5, 2, 2.6))
      y += 7.2
    }
    const leftToRight = i % 2 === 0
    const yTop = y
    const yBot = y + 2.5
    const x1 = leftToRight ? 0.25 : WORLD_W - 0.25
    const x2 = leftToRight ? WORLD_W - gap : gap
    e.push(wall([
      [x1, yTop],
      [x2, yBot],
    ]))
    for (let k = 1; k <= 3; k++) {
      const t = k / 4
      e.push(peg(x1 + (x2 - x1) * t, yTop + (yBot - yTop) * t - 0.95, 0.17))
    }
    if (i % 2 === 1) {
      e.push(spinner(x2 + (leftToRight ? -0.4 : 0.4), yBot + 1.5, 2.8, leftToRight ? 2.6 : -2.6))
    }
    y = yBot + 2.3
  }
  const fin = finishSection(y)
  return {
    id: 'zigzag',
    name: '지그재그',
    desc: '좌우로 미끄러져 내려가는 기본 코스',
    entities: withFrame([...e, ...fin.entities], fin.goalY),
    goalY: fin.goalY,
    height: fin.height,
  }
}

// 2. 핀볼: 못이 촘촘히 박힌 갈톤 보드 + 중간 깔때기
function buildPinball() {
  const e = []
  let y = 5
  const rows = 26
  for (let i = 0; i < rows; i++) {
    const offset = i % 2 === 0 ? 0 : 0.55
    if (i < rows - 1) {
      for (let x = 1.1 + offset; x < WORLD_W - 0.9; x += 1.1) {
        e.push(peg(x, y, 0.2))
      }
    }
    y += 1.35
    if (i === 8 || i === 17) {
      // 중간 깔때기: 한 번 모였다가 다시 퍼진다
      e.push(wall([
        [0.25, y - 0.4],
        [WORLD_W / 2 - 1.0, y + 1.6],
      ]))
      e.push(wall([
        [WORLD_W - 0.25, y - 0.4],
        [WORLD_W / 2 + 1.0, y + 1.6],
      ]))
      e.push(spinner(WORLD_W / 2, y + 2.9, 3.4, i === 8 ? 2.8 : -2.8))
      y += 4.4
    }
  }
  const fin = finishSection(y)
  return {
    id: 'pinball',
    name: '핀볼',
    desc: '못 사이를 튕기며 떨어지는 운빨 코스',
    entities: withFrame([...e, ...fin.entities], fin.goalY),
    goalY: fin.goalY,
    height: fin.height,
  }
}

// 3. 바람개비: 회전하는 날개가 구슬을 계속 뒤섞는다
function buildPinwheel() {
  const e = []
  let y = 6
  for (let i = 0; i < 5; i++) {
    const dir = i % 2 === 0 ? 1 : -1
    e.push(pinwheel(WORLD_W / 2 - 2.0, y, 1.5, 2, 2.2 * dir))
    e.push(pinwheel(WORLD_W / 2 + 2.0, y, 1.5, 2, -2.2 * dir))
    e.push(pinwheel(WORLD_W / 2, y + 2.9, 1.5, 2, 2.6 * -dir))
    // 벽 쪽으로 고이지 않도록 안쪽으로 기울인 턱(구슬이 가운데로 다시 모인다)
    e.push(wall([
      [0.25, y + 4.6],
      [3.1, y + 5.8],
    ]))
    e.push(wall([
      [WORLD_W - 0.25, y + 4.6],
      [WORLD_W - 3.1, y + 5.8],
    ]))
    y += 7.2
  }
  const fin = finishSection(y)
  return {
    id: 'pinwheel',
    name: '바람개비',
    desc: '돌아가는 날개에 튕겨 순위가 뒤집히는 코스',
    entities: withFrame([...e, ...fin.entities], fin.goalY),
    goalY: fin.goalY,
    height: fin.height,
  }
}

const builders = {
  zigzag: buildZigzag,
  pinball: buildPinball,
  pinwheel: buildPinwheel,
}

export const MAP_LIST = [
  { id: 'zigzag', name: '지그재그', desc: '좌우로 미끄러져 내려가는 기본 코스' },
  { id: 'pinball', name: '핀볼', desc: '못 사이를 튕기며 떨어지는 운빨 코스' },
  { id: 'pinwheel', name: '바람개비', desc: '돌아가는 날개에 순위가 뒤집히는 코스' },
]

export function buildMap(id) {
  const build = builders[id] || builders.zigzag
  return build()
}
