import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Home,
  User,
  Lock,
  School,
  CheckCircle,
  CheckCircle2,
  Play,
  ChevronRight,
  Award,
  Users,
  BarChart2,
  Sparkles,
  Sun,
  Moon,
  RotateCcw,
  Lightbulb,
  Target,
  Compass,
  Hand,
} from 'lucide-react'

/* ------------------------------------------------------------------ *
 * 중3 수학 '원의 성질' 5차시 통합 학습 웹 앱
 *
 * PAGE-01 로그인/회원가입      PAGE-05 2차시 원주각과 중심각
 * PAGE-02 교사 대시보드        PAGE-06 3차시 원주각의 성질
 * PAGE-03 난이도 선택/코스     PAGE-07 4차시 원에 내접하는 사각형
 * PAGE-04 1차시 현과 접선      PAGE-08 5차시 종합 평가 & 프로젝트
 * ------------------------------------------------------------------ */

/* =========================== 기하 유틸 =========================== */

const TAU = Math.PI * 2
const toDeg = (rad) => (rad * 180) / Math.PI
/** 0 ≤ θ < 2π 로 정규화 */
const norm = (a) => ((a % TAU) + TAU) % TAU
/** -π < θ ≤ π 로 정규화 (부호 있는 각차) */
const wrapPi = (a) => {
  const x = norm(a)
  return x > Math.PI ? x - TAU : x
}
const ptOn = (c, r, t) => ({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) })
const angleOf = (c, p) => Math.atan2(p.y - c.y, p.x - c.x)
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const midOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const unitVec = (from, to) => {
  const d = dist(from, to) || 1
  return { x: (to.x - from.x) / d, y: (to.y - from.y) / d }
}
const shift = (p, v, k) => ({ x: p.x + v.x * k, y: p.y + v.y * k })
/** ∠avb 의 크기(0°~180°) */
const angleAt = (v, a, b) => Math.abs(toDeg(wrapPi(angleOf(v, b) - angleOf(v, a))))
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1)

/**
 * θ가 증가하는 방향(화면상 시계 방향)으로 from → to 를 잇는 호 path.
 * 우각(180° 초과)도 그대로 그려진다.
 */
function arcPath(c, r, from, to) {
  const sweep = norm(to - from)
  const s = ptOn(c, r, from)
  const e = ptOn(c, r, to)
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${e.x} ${e.y}`
}

/** 중심각 부채꼴(우각 포함) */
function wedgePath(c, r, from, to) {
  return `${arcPath(c, r, from, to)} L ${c.x} ${c.y} Z`
}

/**
 * 꼭짓점 v에서 두 반직선이 이루는 '작은 쪽' 각(≤180°) 표시용 호와
 * 각도 라벨을 놓을 이등분선 방향을 함께 돌려준다.
 */
function angleMark(v, r, aFrom, aTo) {
  const d = wrapPi(aTo - aFrom)
  const [f, t] = d >= 0 ? [aFrom, aTo] : [aTo, aFrom]
  return { path: arcPath(v, r, f, t), bisector: f + norm(t - f) / 2 }
}

/** 직각 표시(ㄱ자) — 꼭짓점 v에서 방향 d1, d2 로 한 변이 s인 정사각형 */
function rightAngleMark(v, d1, d2, s = 13) {
  const p1 = shift(v, d1, s)
  const p2 = { x: v.x + d1.x * s + d2.x * s, y: v.y + d1.y * s + d2.y * s }
  const p3 = shift(v, d2, s)
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
}

/**
 * 원 위의 점들이 서로 겹치지 않도록 최소 간격(minSep, 라디안)만 보장한다.
 * 순서는 보존하지 않으므로, 점이 다른 호로 넘어가도 되는 시뮬레이터에 쓴다.
 * (예: 원주각의 꼭짓점 P를 반대쪽 호로 옮기기)
 */
function keepApart(theta, others, minSep) {
  if (!others.length) return norm(theta)
  const sorted = others.map(norm).sort((a, b) => a - b)
  let best = null
  let bestDist = Infinity
  let widest = { mid: norm(theta), size: -1 }

  // 이웃한 두 점 사이의 빈 호마다 target에 가장 가까운 자리를 찾는다
  for (let i = 0; i < sorted.length; i += 1) {
    const from = sorted[i]
    const gap = sorted.length === 1 ? TAU : norm(sorted[(i + 1) % sorted.length] - from)
    if (gap > widest.size) widest = { mid: norm(from + gap / 2), size: gap }

    const span = gap - 2 * minSep
    if (span <= 0) continue // 이 호는 너무 좁아 들어갈 수 없다
    const lo = norm(from + minSep)
    let cand
    if (norm(theta - lo) <= span) {
      cand = norm(theta)
    } else {
      const hi = norm(lo + span)
      cand = norm(theta - hi) <= norm(lo - theta) ? hi : lo
    }
    const d = Math.abs(wrapPi(cand - theta))
    if (d < bestDist) {
      bestDist = d
      best = cand
    }
  }
  // 점이 4개 이하이면 항상 충분히 넓은 호가 존재하므로 fallback은 안전망일 뿐이다
  return best ?? widest.mid
}

/**
 * target을 이웃한 두 점 사이(prev → next, θ 증가 방향)의 호 안에 가둔다.
 * 빠르게 끌어 다른 점을 뛰어넘는 것을 막아 원주 위 순서를 보존한다.
 * 순서가 깨지면 사각형이 꼬여 「대각의 합 = 180°」가 성립하지 않으므로,
 * 내접사각형처럼 꼭짓점 순서가 의미를 갖는 경우에 사용한다.
 */
function clampBetween(target, prev, next, minSep) {
  const gap = norm(next - prev)
  if (gap <= 2 * minSep) return norm(prev + gap / 2)
  const lo = norm(prev + minSep)
  const span = gap - 2 * minSep
  if (norm(target - lo) <= span) return norm(target)
  const hi = norm(lo + span)
  // 허용 구간 밖이면 가까운 쪽 끝에 붙인다 (벽에 미끄러지듯)
  return norm(target - hi) <= norm(lo - target) ? hi : lo
}

/**
 * 현 AB에 대한 중심각 — 점 P가 올라가 있지 않은 쪽 호의 중심각을 돌려준다.
 * (P가 열호 위로 넘어가면 180°를 넘는 우각이 되어 '원주각 = 중심각 ÷ 2'가 항상 성립)
 */
function centralArcAwayFrom(aA, aB, aP) {
  const sweepAB = norm(aB - aA)
  const pInsideAB = norm(aP - aA) < sweepAB
  return pInsideAB ? { from: aB, to: aA, size: TAU - sweepAB } : { from: aA, to: aB, size: sweepAB }
}

/* =========================== 공통 UI 조각 =========================== */

const BOARD = 380
const CENTER = { x: BOARD / 2, y: BOARD / 2 }

const HANDLE_COLORS = {
  A: '#f472b6',
  B: '#60a5fa',
  C: '#a78bfa',
  D: '#fb923c',
  P: '#34d399',
  Q: '#fbbf24',
  T: '#f472b6',
}

/**
 * 드래그 가능한 SVG 작업판.
 * points: [{ id, x, y, label, color }] — 자식 도형 위에 핸들로 그려진다.
 * onMove(id, { x, y }) 로 포인터/키보드 이동이 모두 전달된다.
 */
function Board({ points = [], onMove, children, hint }) {
  const svgRef = useRef(null)
  const dragId = useRef(null)
  const clipId = `board-clip-${useId().replace(/:/g, '')}`

  const toLocal = useCallback((e) => {
    const r = svgRef.current.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * BOARD,
      y: ((e.clientY - r.top) / r.height) * BOARD,
    }
  }, [])

  const handlePointerDown = (e) => {
    const el = e.target.closest?.('[data-handle]')
    if (!el) return
    dragId.current = el.getAttribute('data-handle')
    try {
      svgRef.current.setPointerCapture(e.pointerId)
    } catch {
      /* 캡처 미지원 브라우저는 그냥 진행 */
    }
    el.focus?.()
    onMove(dragId.current, toLocal(e))
    e.preventDefault()
  }

  const handlePointerMove = (e) => {
    if (!dragId.current) return
    onMove(dragId.current, toLocal(e))
  }

  const endDrag = (e) => {
    if (!dragId.current) return
    try {
      svgRef.current.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    dragId.current = null
  }

  const handleKeyDown = (e) => {
    const el = e.target.closest?.('[data-handle]')
    if (!el) return
    const id = el.getAttribute('data-handle')
    const p = points.find((q) => q.id === id)
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!p || !delta) return
    e.preventDefault()
    const step = e.shiftKey ? 10 : 4
    onMove(id, { x: p.x + delta[0] * step, y: p.y + delta[1] * step })
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD} ${BOARD}`}
        className="w-full h-auto aspect-square touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={BOARD} height={BOARD} rx={24} />
          </clipPath>
        </defs>

        {/* 접선처럼 길게 뻗는 도형이 작업판 밖으로 삐져나오지 않도록 잘라낸다 */}
        <g clipPath={`url(#${clipId})`}>{children}</g>

        {points.map((p) => (
          <g
            key={p.id}
            data-handle={p.id}
            tabIndex={0}
            role="button"
            aria-label={`점 ${p.label ?? p.id} 이동 (방향키로 미세 조정)`}
            className="group cursor-grab outline-none active:cursor-grabbing"
          >
            <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={15}
              fill={p.color}
              className="opacity-0 transition-opacity group-hover:opacity-25 group-focus:opacity-40"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={7.5}
              fill={p.color}
              strokeWidth={2.5}
              className="stroke-white dark:stroke-slate-900"
            />
            {p.label && (
              <text
                x={p.x + 13}
                y={p.y - 11}
                className="font-display fill-slate-700 text-[15px] dark:fill-slate-100"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {hint && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur dark:bg-slate-800/85 dark:text-slate-300">
          <Hand className="h-3.5 w-3.5" />
          <span>{hint}</span>
        </div>
      )}
    </div>
  )
}

/** 작업판 배경 — 원, 중심점, 옅은 안내 눈금 */
function BoardBase({ center = CENTER, r, showCenter = true, centerLabel = 'O' }) {
  return (
    <>
      <rect
        x={0}
        y={0}
        width={BOARD}
        height={BOARD}
        rx={24}
        className="fill-slate-50/80 dark:fill-slate-900/60"
      />
      <circle
        cx={center.x}
        cy={center.y}
        r={r}
        fill="none"
        strokeWidth={2.5}
        className="stroke-slate-300 dark:stroke-slate-600"
      />
      {showCenter && (
        <>
          <circle cx={center.x} cy={center.y} r={4.5} className="fill-slate-700 dark:fill-slate-200" />
          <text
            x={center.x + 9}
            y={center.y + 19}
            className="font-display fill-slate-500 text-[14px] dark:fill-slate-400"
          >
            {centerLabel}
          </text>
        </>
      )}
    </>
  )
}

/** SVG 각도 라벨 (호 + 숫자) */
function AngleLabel({ vertex, radius, from, to, color, text, labelGap = 26 }) {
  const mark = angleMark(vertex, radius, from, to)
  const pos = ptOn(vertex, radius + labelGap, mark.bisector)
  return (
    <g>
      <path d={mark.path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-display text-[15px]"
        fill={color}
      >
        {text}
      </text>
    </g>
  )
}

function Stat({ label, value, unit, color = 'text-indigo-600 dark:text-indigo-300', sub }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-800/50">
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`font-display text-2xl leading-tight ${color}`}>
        {value}
        {unit && <span className="ml-0.5 text-base">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  )
}

/** 성질이 성립하는 순간 초록으로 밝아지는 확인 배너 */
function Verdict({ ok, okText, waitText }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold leading-relaxed transition-colors ${
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400'
      }`}
    >
      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? '' : 'opacity-30'}`} />
      <span>{ok ? okText : waitText}</span>
    </div>
  )
}

function Formula({ children }) {
  return (
    <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center font-display text-base text-slate-50 dark:bg-slate-800 dark:ring-1 dark:ring-slate-700">
      {children}
    </div>
  )
}

/** 난이도별 탐구 가이드 */
function Guide({ difficulty, basic, normal, advanced }) {
  const map = { basic, normal, advanced }
  const items = map[difficulty] ?? normal
  if (!items?.length) return null

  const tone =
    difficulty === 'basic'
      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200'
      : difficulty === 'advanced'
        ? 'border-purple-200 bg-purple-50/70 text-purple-800 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-200'
        : 'border-indigo-200 bg-indigo-50/70 text-indigo-800 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200'

  const title =
    difficulty === 'basic' ? '단계별 관찰 가이드' : difficulty === 'advanced' ? '심화 도전 과제' : '탐구 활동'
  const Icon = difficulty === 'advanced' ? Target : Lightbulb

  return (
    <div className={`space-y-2 rounded-2xl border px-4 py-3.5 ${tone}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <ol className="space-y-1.5 text-xs leading-relaxed">
        {items.map((t, i) => (
          <li key={t} className="flex gap-2">
            <span className="font-bold opacity-60">{i + 1}.</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** 시뮬레이터 좌(작업판) / 우(측정 패널) 2단 레이아웃 */
function SimLayout({ board, children }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-white/60 p-2 dark:border-slate-700/60 dark:bg-slate-800/30">
        {board}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ModeTabs({ value, onChange, options }) {
  return (
    <div className="flex gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
            value === o.value
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ResetButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white/70 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      처음 위치로
    </button>
  )
}

/* ============== [PAGE-04] 1차시 · 원의 현과 접선 ============== */

const R4 = 118
const U4 = R4 / 5 // 화면 px → 학습용 길이 단위 (반지름 = 5)
const CHORD_INIT = { A: -2.5, B: -0.5, C: 1.1, D: 2.5 }

function ChordTangentSim({ difficulty }) {
  const [mode, setMode] = useState('chord')
  const [ang, setAng] = useState(CHORD_INIT)
  const [ext, setExt] = useState({ x: CENTER.x + 150, y: CENTER.y - 60 })

  /* ---- 현 모드 ---- */
  const chord = useMemo(() => {
    const A = ptOn(CENTER, R4, ang.A)
    const B = ptOn(CENTER, R4, ang.B)
    const C = ptOn(CENTER, R4, ang.C)
    const D = ptOn(CENTER, R4, ang.D)
    const M = midOf(A, B)
    const N = midOf(C, D)
    return {
      A,
      B,
      C,
      D,
      M,
      N,
      lenAB: dist(A, B) / U4,
      lenCD: dist(C, D) / U4,
      dAB: dist(CENTER, M) / U4,
      dCD: dist(CENTER, N) / U4,
    }
  }, [ang])

  const equalChords = Math.abs(chord.lenAB - chord.lenCD) < 0.12

  const moveChord = (id, p) => {
    const target = angleOf(CENTER, p)
    setAng((prev) => {
      const others = Object.keys(prev)
        .filter((k) => k !== id)
        .map((k) => prev[k])
      return { ...prev, [id]: keepApart(target, others, 0.22) }
    })
  }

  /* ---- 접선 모드 ---- */
  const RT = 92
  const UT = RT / 5
  const tangent = useMemo(() => {
    const d = Math.min(Math.max(dist(CENTER, ext), RT * 1.22), 168)
    const base = angleOf(CENTER, ext)
    const P = ptOn(CENTER, d, base)
    const alpha = Math.acos(RT / d) // 반지름 OT와 OP가 이루는 각
    const T1 = ptOn(CENTER, RT, base - alpha)
    const T2 = ptOn(CENTER, RT, base + alpha)
    return {
      P,
      T1,
      T2,
      d: d / UT,
      len: Math.sqrt(d * d - RT * RT) / UT,
      angP: angleAt(P, T1, T2),
      angO: angleAt(CENTER, T1, T2),
    }
  }, [ext])

  const isChord = mode === 'chord'

  const board = isChord ? (
    <Board
      hint="A·B·C·D를 원 위에서 끌어 보세요"
      points={[
        { id: 'A', ...chord.A, label: 'A', color: HANDLE_COLORS.A },
        { id: 'B', ...chord.B, label: 'B', color: HANDLE_COLORS.B },
        { id: 'C', ...chord.C, label: 'C', color: HANDLE_COLORS.C },
        { id: 'D', ...chord.D, label: 'D', color: HANDLE_COLORS.D },
      ]}
      onMove={moveChord}
    >
      <BoardBase r={R4} />

      {/* 현 CD (비교용) */}
      <line
        x1={chord.C.x}
        y1={chord.C.y}
        x2={chord.D.x}
        y2={chord.D.y}
        stroke="#a78bfa"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line
        x1={CENTER.x}
        y1={CENTER.y}
        x2={chord.N.x}
        y2={chord.N.y}
        stroke="#a78bfa"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <path
        d={rightAngleMark(chord.N, unitVec(chord.N, CENTER), unitVec(chord.N, chord.C), 11)}
        fill="none"
        stroke="#a78bfa"
        strokeWidth={1.8}
      />

      {/* 현 AB (주 관찰 대상) */}
      <line
        x1={chord.A.x}
        y1={chord.A.y}
        x2={chord.B.x}
        y2={chord.B.y}
        stroke="#10b981"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <line
        x1={CENTER.x}
        y1={CENTER.y}
        x2={chord.M.x}
        y2={chord.M.y}
        stroke="#ef4444"
        strokeWidth={2.5}
        strokeDasharray="6 4"
      />
      <path
        d={rightAngleMark(chord.M, unitVec(chord.M, CENTER), unitVec(chord.M, chord.A), 13)}
        fill="none"
        stroke="#ef4444"
        strokeWidth={2}
      />
      <circle cx={chord.M.x} cy={chord.M.y} r={4} fill="#ef4444" />
      <text
        x={chord.M.x + 10}
        y={chord.M.y + 18}
        className="font-display fill-rose-500 text-[13px]"
      >
        M
      </text>

      {/* AM = MB 눈금 */}
      {[
        [chord.A, chord.M],
        [chord.M, chord.B],
      ].map(([s, e], i) => {
        const m = midOf(s, e)
        const u = unitVec(s, e)
        const n = { x: -u.y, y: u.x }
        return (
          <line
            key={i}
            x1={m.x - n.x * 6}
            y1={m.y - n.y * 6}
            x2={m.x + n.x * 6}
            y2={m.y + n.y * 6}
            stroke="#059669"
            strokeWidth={2.5}
          />
        )
      })}
    </Board>
  ) : (
    <Board
      hint="원 밖의 점 P를 끌어 보세요"
      points={[{ id: 'P', ...tangent.P, label: 'P', color: HANDLE_COLORS.P }]}
      onMove={(_, p) => setExt(p)}
    >
      <BoardBase r={RT} />

      {[tangent.T1, tangent.T2].map((T, i) => (
        <g key={i}>
          <line
            x1={CENTER.x}
            y1={CENTER.y}
            x2={T.x}
            y2={T.y}
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <line
            x1={tangent.P.x}
            y1={tangent.P.y}
            x2={T.x}
            y2={T.y}
            stroke="#10b981"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <path
            d={rightAngleMark(T, unitVec(T, CENTER), unitVec(T, tangent.P), 12)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
          />
          <circle cx={T.x} cy={T.y} r={5.5} fill="#f472b6" />
          <text
            x={T.x + 11}
            y={T.y + (i === 0 ? -8 : 20)}
            className="font-display fill-slate-600 text-[14px] dark:fill-slate-200"
          >
            {i === 0 ? 'T₁' : 'T₂'}
          </text>
        </g>
      ))}

      <line
        x1={CENTER.x}
        y1={CENTER.y}
        x2={tangent.P.x}
        y2={tangent.P.y}
        stroke="#cbd5e1"
        strokeWidth={1.5}
        strokeDasharray="3 5"
      />

      <AngleLabel
        vertex={tangent.P}
        radius={30}
        from={angleOf(tangent.P, tangent.T1)}
        to={angleOf(tangent.P, tangent.T2)}
        color="#10b981"
        text={`${f1(tangent.angP)}°`}
      />
      <AngleLabel
        vertex={CENTER}
        radius={34}
        from={angleOf(CENTER, tangent.T1)}
        to={angleOf(CENTER, tangent.T2)}
        color="#6366f1"
        text={`${f1(tangent.angO)}°`}
      />
    </Board>
  )

  return (
    <div className="space-y-4">
      <ModeTabs
        value={mode}
        onChange={setMode}
        options={[
          { value: 'chord', label: '① 원의 중심과 현' },
          { value: 'tangent', label: '② 원의 접선' },
        ]}
      />

      <SimLayout board={board}>
        {isChord ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="현 AB의 길이" value={f1(chord.lenAB)} color="text-emerald-600 dark:text-emerald-300" />
              <Stat label="중심까지 거리 OM" value={f1(chord.dAB)} color="text-rose-500 dark:text-rose-300" />
              <Stat label="현 CD의 길이" value={f1(chord.lenCD)} color="text-violet-600 dark:text-violet-300" />
              <Stat label="중심까지 거리 ON" value={f1(chord.dCD)} color="text-violet-500 dark:text-violet-300" />
            </div>

            <Formula>
              AM = MB = {f1(chord.lenAB / 2)} &nbsp;/&nbsp; ∠OMA = 90°
            </Formula>

            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-300">
              <div className="mb-1 font-bold text-slate-700 dark:text-slate-200">피타고라스로 확인</div>
              r² = d² + (ℓ/2)² →{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                5² = {f1(chord.dAB)}² + {f1(chord.lenAB / 2)}² = {f1(chord.dAB ** 2 + (chord.lenAB / 2) ** 2)}
              </span>
            </div>

            <Verdict
              ok={equalChords}
              okText={`두 현의 길이가 같아졌어요! 중심까지의 거리도 ${f1(chord.dAB)} = ${f1(chord.dCD)} 로 같습니다.`}
              waitText="C, D를 움직여 현 CD의 길이를 현 AB와 같게 맞춰 보세요."
            />

            <Guide
              difficulty={difficulty}
              basic={[
                '초록색 현 AB의 점 A를 천천히 끌어 보세요.',
                '빨간 점선 OM은 항상 현과 직각(90°)으로 만납니다.',
                'M 양쪽의 작은 눈금 두 개는 AM = MB, 즉 이등분을 뜻해요.',
                '보라색 현 CD를 AB와 같은 길이로 맞추면 어떤 일이 생길까요?',
              ]}
              normal={[
                '현 AB를 움직이며 OM의 길이와 현의 길이가 어떻게 함께 변하는지 관찰하세요.',
                '중심에서 멀어질수록 현은 길어질까요, 짧아질까요?',
                '현 CD를 AB와 같은 길이로 맞추고 두 거리를 비교해 보세요.',
              ]}
              advanced={[
                '현의 길이 ℓ과 중심거리 d 사이의 관계식을 직접 세워 보세요.',
                'd = 0일 때 현의 길이는 최대 몇이 되며, 그 현의 이름은 무엇인가요?',
                '「길이가 같은 두 현은 중심에서 같은 거리에 있다」의 역이 참임을 설명해 보세요.',
              ]}
            />
            <ResetButton onClick={() => setAng(CHORD_INIT)} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="접선 PT₁" value={f1(tangent.len)} color="text-emerald-600 dark:text-emerald-300" />
              <Stat label="접선 PT₂" value={f1(tangent.len)} color="text-emerald-600 dark:text-emerald-300" />
              <Stat label="∠T₁PT₂" value={f1(tangent.angP)} unit="°" />
              <Stat label="∠T₁OT₂" value={f1(tangent.angO)} unit="°" color="text-sky-600 dark:text-sky-300" />
            </div>

            <Formula>
              PT = √(OP² − r²) = √({f1(tangent.d)}² − 5²) = {f1(tangent.len)}
            </Formula>

            <Verdict
              ok
              okText={`∠P + ∠O = ${f1(tangent.angP)}° + ${f1(tangent.angO)}° = ${f1(tangent.angP + tangent.angO)}° — 어디로 옮겨도 180°!`}
              waitText=""
            />

            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              접점의 <b>ㄱ자 표시</b>는 ∠OT₁P = ∠OT₂P = 90°, 즉 접선이 접점을 지나는 반지름과 수직임을 뜻합니다.
            </div>

            <Guide
              difficulty={difficulty}
              basic={[
                '초록색 점 P를 원에서 멀리, 또 가까이 끌어 보세요.',
                '두 접선 PT₁, PT₂의 길이 숫자를 비교해 보세요. 항상 같나요?',
                '접점의 빨간 ㄱ자 표시는 직각 90°를 뜻합니다.',
              ]}
              normal={[
                'P를 움직이며 OP가 길어질 때 접선의 길이가 어떻게 변하는지 확인하세요.',
                '∠P와 ∠O를 더하면 항상 얼마인가요?',
                'OP = 10, r = 6이면 접선의 길이는 얼마일지 먼저 계산한 뒤 P를 옮겨 확인해 보세요.',
              ]}
              advanced={[
                '사각형 OT₁PT₂의 내각의 합을 이용해 ∠P + ∠O = 180°를 증명해 보세요.',
                '△OT₁P ≡ △OT₂P 임을 RHS 합동으로 설명해 보세요.',
                'P가 원에 한없이 가까워지면 접선의 길이는 어떤 값에 가까워질까요?',
              ]}
            />
            <ResetButton onClick={() => setExt({ x: CENTER.x + 150, y: CENTER.y - 60 })} />
          </>
        )}
      </SimLayout>
    </div>
  )
}

/* ============== [PAGE-05] 2차시 · 원주각과 중심각 ============== */

const R5 = 120
const CENTRAL_INIT = { A: 2.7, B: 0.45, P: -1.6 }

function CentralInscribedSim({ difficulty }) {
  const [ang, setAng] = useState(CENTRAL_INIT)

  const g = useMemo(() => {
    const A = ptOn(CENTER, R5, ang.A)
    const B = ptOn(CENTER, R5, ang.B)
    const P = ptOn(CENTER, R5, ang.P)
    const arc = centralArcAwayFrom(ang.A, ang.B, ang.P)
    return { A, B, P, arc, central: toDeg(arc.size), inscribed: angleAt(P, A, B) }
  }, [ang])

  const move = (id, p) => {
    const target = angleOf(CENTER, p)
    setAng((prev) => {
      const others = Object.keys(prev)
        .filter((k) => k !== id)
        .map((k) => prev[k])
      return { ...prev, [id]: keepApart(target, others, 0.2) }
    })
  }

  const ratioOk = Math.abs(g.central / 2 - g.inscribed) < 0.5

  return (
    <SimLayout
      board={
        <Board
          hint="A·B로 호를, P로 원주각의 꼭짓점을 옮겨 보세요"
          points={[
            { id: 'A', ...g.A, label: 'A', color: HANDLE_COLORS.A },
            { id: 'B', ...g.B, label: 'B', color: HANDLE_COLORS.B },
            { id: 'P', ...g.P, label: 'P', color: HANDLE_COLORS.P },
          ]}
          onMove={move}
        >
          <BoardBase r={R5} />

          {/* 중심각 부채꼴 */}
          <path d={wedgePath(CENTER, R5, g.arc.from, g.arc.to)} fill="#6366f1" fillOpacity={0.12} />
          {/* 두 점이 마주 보는 호 강조 */}
          <path
            d={arcPath(CENTER, R5, g.arc.from, g.arc.to)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.85}
          />

          <line x1={CENTER.x} y1={CENTER.y} x2={g.A.x} y2={g.A.y} stroke="#6366f1" strokeWidth={2.5} />
          <line x1={CENTER.x} y1={CENTER.y} x2={g.B.x} y2={g.B.y} stroke="#6366f1" strokeWidth={2.5} />
          <line x1={g.P.x} y1={g.P.y} x2={g.A.x} y2={g.A.y} stroke="#10b981" strokeWidth={2.5} />
          <line x1={g.P.x} y1={g.P.y} x2={g.B.x} y2={g.B.y} stroke="#10b981" strokeWidth={2.5} />

          <AngleLabel
            vertex={g.P}
            radius={32}
            from={angleOf(g.P, g.A)}
            to={angleOf(g.P, g.B)}
            color="#059669"
            text={`${f1(g.inscribed)}°`}
          />
          <g>
            <path
              d={arcPath(CENTER, 40, g.arc.from, g.arc.to)}
              fill="none"
              stroke="#6366f1"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {(() => {
              const pos = ptOn(CENTER, 62, g.arc.from + g.arc.size / 2)
              return (
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-display text-[15px]"
                  fill="#6366f1"
                >
                  {f1(g.central)}°
                </text>
              )
            })()}
          </g>
        </Board>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="중심각 ∠AOB" value={f1(g.central)} unit="°" sub="주황색 호에 대한 각" />
        <Stat
          label="원주각 ∠APB"
          value={f1(g.inscribed)}
          unit="°"
          color="text-emerald-600 dark:text-emerald-300"
        />
      </div>

      <Formula>
        {f1(g.inscribed)}° = ½ × {f1(g.central)}°
      </Formula>

      <Verdict
        ok={ratioOk}
        okText="P를 어디에 두어도 원주각은 언제나 중심각의 절반입니다."
        waitText="점을 움직여 두 각의 비를 확인해 보세요."
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
        P를 <b>주황색 호 위로</b> 넘겨 보세요. 그러면 P가 마주 보는 호가 반대쪽으로 바뀌면서 중심각이 180°를
        넘는 <b>우각</b>이 되고, 그래도 절반 관계는 그대로 유지됩니다.
      </div>

      <Guide
        difficulty={difficulty}
        basic={[
          '초록색 점 P를 원을 따라 천천히 끌어 보세요.',
          'P가 움직여도 초록색 숫자(원주각)가 변하지 않는 것을 확인하세요.',
          '이번엔 점 A를 움직여 주황색 호를 넓혀 보세요.',
          '보라색 숫자(중심각)가 초록색 숫자의 몇 배인지 세어 보세요.',
        ]}
        normal={[
          '중심각을 90°, 120°, 180°에 가깝게 맞추고 그때의 원주각을 기록하세요.',
          'P만 움직였을 때 두 각이 어떻게 되는지 설명해 보세요.',
          '중심각이 180°일 때 원주각은 몇 도인가요?',
        ]}
        advanced={[
          'P, O, A를 잇는 이등변삼각형을 이용해 원주각 = ½ 중심각을 증명해 보세요.',
          'P가 호 AB 위(주황색 호)로 갔을 때도 증명이 성립하는지 확인해 보세요.',
          '중심각이 우각일 때의 경우를 따로 나누어 설명해야 하는 이유는 무엇일까요?',
        ]}
      />
      <ResetButton onClick={() => setAng(CENTRAL_INIT)} />
    </SimLayout>
  )
}

/* ============== [PAGE-06] 3차시 · 원주각의 성질 ============== */

const R6 = 120
const PROP_INIT = { A: 2.85, B: 0.3, P: -1.9, Q: -0.9 }

function InscribedPropertySim({ difficulty }) {
  const [ang, setAng] = useState(PROP_INIT)
  const [diameter, setDiameter] = useState(false)

  const angles = useMemo(() => (diameter ? { ...ang, B: norm(ang.A + Math.PI) } : ang), [ang, diameter])

  const g = useMemo(() => {
    const A = ptOn(CENTER, R6, angles.A)
    const B = ptOn(CENTER, R6, angles.B)
    const P = ptOn(CENTER, R6, angles.P)
    const Q = ptOn(CENTER, R6, angles.Q)
    const sweepAB = norm(angles.B - angles.A)
    const inArc = (t) => norm(t - angles.A) < sweepAB
    return {
      A,
      B,
      P,
      Q,
      angP: angleAt(P, A, B),
      angQ: angleAt(Q, A, B),
      sameSide: inArc(angles.P) === inArc(angles.Q),
    }
  }, [angles])

  const move = (id, p) => {
    const target = angleOf(CENTER, p)
    setAng((prev) => {
      // 지름 모드에서 B를 끌면 A가 대척점으로 따라 움직인다
      const key = diameter && id === 'B' ? 'A' : id
      const value = diameter && id === 'B' ? target + Math.PI : target
      const others = Object.keys(prev)
        .filter((k) => k !== key && !(diameter && k === 'B'))
        .map((k) => prev[k])
      return { ...prev, [key]: keepApart(value, others, 0.18) }
    })
  }

  const sameAngle = Math.abs(g.angP - g.angQ) < 0.6
  const supplementary = Math.abs(g.angP + g.angQ - 180) < 0.6

  return (
    <div className="space-y-4">
      <ModeTabs
        value={diameter ? 'dia' : 'free'}
        onChange={(v) => setDiameter(v === 'dia')}
        options={[
          { value: 'free', label: '① 같은 호에 대한 원주각' },
          { value: 'dia', label: '② 반원에 대한 원주각' },
        ]}
      />

      <SimLayout
        board={
          <Board
            hint={diameter ? 'A 또는 B로 지름을, P·Q로 꼭짓점을 옮겨 보세요' : 'P와 Q를 같은 호 위에서 옮겨 보세요'}
            points={[
              { id: 'A', ...g.A, label: 'A', color: HANDLE_COLORS.A },
              { id: 'B', ...g.B, label: 'B', color: HANDLE_COLORS.B },
              { id: 'P', ...g.P, label: 'P', color: HANDLE_COLORS.P },
              { id: 'Q', ...g.Q, label: 'Q', color: HANDLE_COLORS.Q },
            ]}
            onMove={move}
          >
            <BoardBase r={R6} />

            <path
              d={arcPath(CENTER, R6, angles.A, angles.B)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.8}
            />
            <line
              x1={g.A.x}
              y1={g.A.y}
              x2={g.B.x}
              y2={g.B.y}
              stroke={diameter ? '#6366f1' : '#94a3b8'}
              strokeWidth={diameter ? 3.5 : 2}
              strokeDasharray={diameter ? '' : '6 5'}
            />

            {[
              { v: g.P, color: '#059669', val: g.angP },
              { v: g.Q, color: '#d97706', val: g.angQ },
            ].map((s, i) => (
              <g key={i}>
                <line x1={s.v.x} y1={s.v.y} x2={g.A.x} y2={g.A.y} stroke={s.color} strokeWidth={2.5} />
                <line x1={s.v.x} y1={s.v.y} x2={g.B.x} y2={g.B.y} stroke={s.color} strokeWidth={2.5} />
                {diameter ? (
                  <path
                    d={rightAngleMark(s.v, unitVec(s.v, g.A), unitVec(s.v, g.B), 14)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.5}
                  />
                ) : null}
                <AngleLabel
                  vertex={s.v}
                  radius={30}
                  from={angleOf(s.v, g.A)}
                  to={angleOf(s.v, g.B)}
                  color={s.color}
                  text={`${f1(s.val)}°`}
                />
              </g>
            ))}

            {diameter && <circle cx={CENTER.x} cy={CENTER.y} r={6} fill="#6366f1" />}
          </Board>
        }
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="원주각 ∠APB" value={f1(g.angP)} unit="°" color="text-emerald-600 dark:text-emerald-300" />
          <Stat label="원주각 ∠AQB" value={f1(g.angQ)} unit="°" color="text-amber-600 dark:text-amber-300" />
        </div>

        {diameter ? (
          <>
            <Formula>지름 AB에 대한 원주각 = 90°</Formula>
            <Verdict
              ok
              okText="AB가 지름이면 P를 어디로 옮겨도 ∠APB = ∠AQB = 90° 입니다. (중심각 180°의 절반)"
              waitText=""
            />
          </>
        ) : (
          <>
            <Formula>
              {g.sameSide ? `∠APB = ∠AQB = ${f1(g.angP)}°` : `∠APB + ∠AQB = ${f1(g.angP + g.angQ)}°`}
            </Formula>
            <Verdict
              ok={g.sameSide ? sameAngle : supplementary}
              okText={
                g.sameSide
                  ? '같은 호(현 AB의 같은 쪽)에 대한 원주각의 크기는 항상 같습니다.'
                  : 'P와 Q가 서로 다른 호에 있으면 두 원주각의 합이 180°가 됩니다. (내접사각형의 성질!)'
              }
              waitText="P와 Q를 움직여 두 각의 관계를 살펴보세요."
            />
            <div
              className={`rounded-2xl px-4 py-2.5 text-xs font-bold ${
                g.sameSide
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
              }`}
            >
              현재 P와 Q는 {g.sameSide ? '같은 호 위에 있습니다' : '서로 다른 호 위에 있습니다'}
            </div>
          </>
        )}

        <Guide
          difficulty={difficulty}
          basic={[
            '초록 점 P와 노란 점 Q를 주황색 호의 반대편에서 끌어 보세요.',
            '두 각의 숫자가 같아지는 것을 확인하세요.',
            '위쪽 탭 ②를 눌러 AB를 지름으로 만들고 각의 크기를 보세요.',
          ]}
          normal={[
            'P, Q를 현 AB의 같은 쪽에 두었을 때와 반대쪽에 두었을 때를 비교하세요.',
            '반대쪽에 두면 두 각의 합은 얼마가 되나요?',
            '지름 모드에서 P를 옮겨도 90°가 유지되는 이유를 중심각으로 설명해 보세요.',
          ]}
          advanced={[
            '네 점 A, B, P, Q가 한 원 위에 있을 조건을 원주각으로 서술해 보세요.',
            '「∠APB = ∠AQB(같은 쪽)이면 네 점은 한 원 위에 있다」의 역을 증명해 보세요.',
            '지름에 대한 원주각이 90°임을 이용해 직각삼각형의 외심 위치를 설명해 보세요.',
          ]}
        />
        <ResetButton
          onClick={() => {
            setAng(PROP_INIT)
            setDiameter(false)
          }}
        />
      </SimLayout>
    </div>
  )
}

/* ============== [PAGE-07] 4차시 · 원에 내접하는 사각형 ============== */

const R7 = 118
const QUAD_INIT = { A: -2.2, B: -0.6, C: 0.7, D: 2.2 } // θ 증가 방향으로 A→B→C→D
const QUAD_ORDER = ['A', 'B', 'C', 'D']
const TC_INIT = { A: 2.4, B: 0.6, C: -1.3 }

function CyclicQuadSim({ difficulty }) {
  const [mode, setMode] = useState('quad')
  const [quad, setQuad] = useState(QUAD_INIT)
  const [tc, setTc] = useState(TC_INIT)

  const q = useMemo(() => {
    const A = ptOn(CENTER, R7, quad.A)
    const B = ptOn(CENTER, R7, quad.B)
    const C = ptOn(CENTER, R7, quad.C)
    const D = ptOn(CENTER, R7, quad.D)
    return {
      A,
      B,
      C,
      D,
      angA: angleAt(A, D, B),
      angB: angleAt(B, A, C),
      angC: angleAt(C, B, D),
      angD: angleAt(D, C, A),
    }
  }, [quad])

  /* 접선과 현이 이루는 각 */
  const t = useMemo(() => {
    const A = ptOn(CENTER, R7, tc.A)
    const B = ptOn(CENTER, R7, tc.B)
    const C = ptOn(CENTER, R7, tc.C)
    const tanDir = { x: -Math.sin(tc.A), y: Math.cos(tc.A) } // OA에 수직인 접선 방향
    const inscribed = angleAt(C, A, B)
    const chordDir = unitVec(A, B)
    const raw = toDeg(Math.acos(Math.max(-1, Math.min(1, chordDir.x * tanDir.x + chordDir.y * tanDir.y))))
    // 두 접선 반직선 중 원주각 ∠ACB와 같은 쪽을 고른다
    const usePositive = Math.abs(raw - inscribed) <= Math.abs(180 - raw - inscribed)
    const dir = usePositive ? tanDir : { x: -tanDir.x, y: -tanDir.y }
    return {
      A,
      B,
      C,
      T1: shift(A, tanDir, 128),
      T2: shift(A, tanDir, -128),
      rayEnd: shift(A, dir, 60),
      tangentChord: usePositive ? raw : 180 - raw,
      inscribed,
      dir,
    }
  }, [tc])

  // 꼭짓점은 이웃 사이에 갇혀 A→B→C→D 순서가 유지된다 (사각형이 꼬이지 않도록)
  const moveQuad = (id, p) => {
    const target = angleOf(CENTER, p)
    const i = QUAD_ORDER.indexOf(id)
    setQuad((prev) => ({
      ...prev,
      [id]: clampBetween(target, prev[QUAD_ORDER[(i + 3) % 4]], prev[QUAD_ORDER[(i + 1) % 4]], 0.28),
    }))
  }

  const moveTc = (id, p) => {
    const target = angleOf(CENTER, p)
    setTc((prev) => {
      const others = Object.keys(prev)
        .filter((k) => k !== id)
        .map((k) => prev[k])
      return { ...prev, [id]: keepApart(target, others, 0.24) }
    })
  }

  const sumAC = q.angA + q.angC
  const sumBD = q.angB + q.angD
  const tcOk = Math.abs(t.tangentChord - t.inscribed) < 0.8

  const isQuad = mode === 'quad'

  return (
    <div className="space-y-4">
      <ModeTabs
        value={mode}
        onChange={setMode}
        options={[
          { value: 'quad', label: '① 대각의 합' },
          { value: 'tangent', label: '② 접선과 현이 이루는 각' },
        ]}
      />

      <SimLayout
        board={
          isQuad ? (
            <Board
              hint="네 꼭짓점을 원 위에서 끌어 보세요"
              points={['A', 'B', 'C', 'D'].map((k) => ({
                id: k,
                ...q[k],
                label: k,
                color: HANDLE_COLORS[k],
              }))}
              onMove={moveQuad}
            >
              <BoardBase r={R7} />
              <polygon
                points={[q.A, q.B, q.C, q.D].map((p) => `${p.x},${p.y}`).join(' ')}
                fill="#6366f1"
                fillOpacity={0.08}
                stroke="#6366f1"
                strokeWidth={3}
                strokeLinejoin="round"
              />
              {[
                { v: q.A, a: q.D, b: q.B, val: q.angA, color: '#ec4899' },
                { v: q.C, a: q.B, b: q.D, val: q.angC, color: '#ec4899' },
                { v: q.B, a: q.A, b: q.C, val: q.angB, color: '#0ea5e9' },
                { v: q.D, a: q.C, b: q.A, val: q.angD, color: '#0ea5e9' },
              ].map((s, i) => (
                <AngleLabel
                  key={i}
                  vertex={s.v}
                  radius={26}
                  from={angleOf(s.v, s.a)}
                  to={angleOf(s.v, s.b)}
                  color={s.color}
                  text={`${f1(s.val)}°`}
                  labelGap={22}
                />
              ))}
            </Board>
          ) : (
            <Board
              hint="A는 접점, C는 원주각의 꼭짓점입니다"
              points={[
                { id: 'A', ...t.A, label: 'A', color: HANDLE_COLORS.A },
                { id: 'B', ...t.B, label: 'B', color: HANDLE_COLORS.B },
                { id: 'C', ...t.C, label: 'C', color: HANDLE_COLORS.C },
              ]}
              onMove={moveTc}
            >
              <BoardBase r={R7} />

              <line
                x1={t.T1.x}
                y1={t.T1.y}
                x2={t.T2.x}
                y2={t.T2.y}
                stroke="#f43f5e"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={t.A.x}
                y2={t.A.y}
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <line x1={t.A.x} y1={t.A.y} x2={t.B.x} y2={t.B.y} stroke="#6366f1" strokeWidth={3} />
              <line x1={t.C.x} y1={t.C.y} x2={t.A.x} y2={t.A.y} stroke="#059669" strokeWidth={2.5} />
              <line x1={t.C.x} y1={t.C.y} x2={t.B.x} y2={t.B.y} stroke="#059669" strokeWidth={2.5} />

              <AngleLabel
                vertex={t.A}
                radius={30}
                from={angleOf(t.A, t.rayEnd)}
                to={angleOf(t.A, t.B)}
                color="#f43f5e"
                text={`${f1(t.tangentChord)}°`}
              />
              <AngleLabel
                vertex={t.C}
                radius={30}
                from={angleOf(t.C, t.A)}
                to={angleOf(t.C, t.B)}
                color="#059669"
                text={`${f1(t.inscribed)}°`}
              />
            </Board>
          )
        }
      >
        {isQuad ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="∠A" value={f1(q.angA)} unit="°" color="text-pink-600 dark:text-pink-300" />
              <Stat label="∠C" value={f1(q.angC)} unit="°" color="text-pink-600 dark:text-pink-300" />
              <Stat label="∠B" value={f1(q.angB)} unit="°" color="text-sky-600 dark:text-sky-300" />
              <Stat label="∠D" value={f1(q.angD)} unit="°" color="text-sky-600 dark:text-sky-300" />
            </div>

            <Formula>
              ∠A + ∠C = {f1(sumAC)}° &nbsp;·&nbsp; ∠B + ∠D = {f1(sumBD)}°
            </Formula>

            <Verdict
              ok={Math.abs(sumAC - 180) < 0.6 && Math.abs(sumBD - 180) < 0.6}
              okText="꼭짓점을 어떻게 옮겨도 마주 보는 두 각의 합은 언제나 180°입니다."
              waitText="꼭짓점을 움직여 대각의 합을 확인해 보세요."
            />

            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-300">
              <b className="text-slate-700 dark:text-slate-200">한 외각의 성질</b>
              <br />꼭짓점 A의 외각 = 180° − {f1(q.angA)}° ={' '}
              <span className="font-bold text-indigo-600 dark:text-indigo-300">{f1(180 - q.angA)}°</span> 로, 그와
              이웃한 내각의 대각 ∠C({f1(q.angC)}°)와 같습니다.
            </div>

            <Guide
              difficulty={difficulty}
              basic={[
                '네 꼭짓점 중 하나를 골라 원을 따라 끌어 보세요.',
                '분홍색 두 각(∠A, ∠C)을 더해 보세요.',
                '하늘색 두 각(∠B, ∠D)도 더해 보세요. 결과가 같나요?',
              ]}
              normal={[
                '∠A를 100°에 가깝게 맞추면 ∠C는 몇 도가 되는지 예상한 뒤 확인하세요.',
                '네 내각의 합이 360°인 것과 대각의 합 180°는 어떤 관계일까요?',
                '사각형이 아주 납작해질 때도 성질이 유지되는지 확인하세요.',
              ]}
              advanced={[
                '원주각 정리를 이용해 ∠A + ∠C = 180°를 직접 증명해 보세요.',
                '두 중심각의 합이 360°가 되는 것과 연결지어 설명해 보세요.',
                '「대각의 합이 180°인 사각형은 원에 내접한다」는 역이 성립하는 이유를 서술하세요.',
              ]}
            />
            <ResetButton onClick={() => setQuad(QUAD_INIT)} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat
                label="접현각 ∠BAT"
                value={f1(t.tangentChord)}
                unit="°"
                color="text-rose-600 dark:text-rose-300"
              />
              <Stat
                label="원주각 ∠ACB"
                value={f1(t.inscribed)}
                unit="°"
                color="text-emerald-600 dark:text-emerald-300"
              />
            </div>

            <Formula>∠BAT = ∠ACB = {f1(t.inscribed)}°</Formula>

            <Verdict
              ok={tcOk}
              okText="접선과 현이 이루는 각은 그 각 안에 있는 호에 대한 원주각과 크기가 같습니다."
              waitText="점을 움직여 두 각을 비교해 보세요."
            />

            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              빨간 직선은 점 A에서의 <b>접선</b>입니다. 접점 A를 옮기면 접선도 함께 회전해요.
            </div>

            <Guide
              difficulty={difficulty}
              basic={[
                '점 C를 원 위에서 끌어 보세요. 초록색 각이 변하나요?',
                '빨간 각(접현각)과 초록 각(원주각)의 숫자를 비교해 보세요.',
                '점 B를 옮겨 현 AB를 길게, 짧게 만들어 보세요.',
              ]}
              normal={[
                '접현각이 90°가 되게 만들어 보세요. 그때 현 AB는 무엇이 되나요?',
                '∠BAT = 65°이면 ∠ACB는 몇 도인지 예상한 뒤 확인하세요.',
                'C를 반대쪽 호로 옮기면 어떤 접선 쪽 각과 같아지나요?',
              ]}
              advanced={[
                '접현각 = ½(호 AB의 중심각)임을 접선⊥반지름을 이용해 증명해 보세요.',
                '현 AB가 지름일 때 접현각이 90°가 되는 이유를 설명하세요.',
                '접현각의 성질과 내접사각형의 성질을 함께 이용하는 문제를 하나 만들어 보세요.',
              ]}
            />
            <ResetButton onClick={() => setTc(TC_INIT)} />
          </>
        )}
      </SimLayout>
    </div>
  )
}

/* ============== [PAGE-08] 종합 평가 문항 ============== */

const QUIZ = [
  {
    q: '반지름이 5인 원의 중심 O에서 현 AB까지의 거리가 3일 때, 현 AB의 길이는?',
    choices: ['4', '6', '8', '10'],
    answer: 2,
    why: 'AM = √(5² − 3²) = 4 이고 중심에서 내린 수선이 현을 이등분하므로 AB = 2 × 4 = 8.',
  },
  {
    q: '한 원에서 길이가 같은 두 현에 대한 설명으로 옳은 것은?',
    choices: [
      '중심으로부터의 거리가 같다',
      '중심으로부터의 거리가 다르다',
      '반드시 서로 평행하다',
      '반드시 지름이다',
    ],
    answer: 0,
    why: '길이가 같은 두 현은 중심에서 같은 거리에 있고, 그 역도 성립합니다.',
  },
  {
    q: '원 O 밖의 점 P에서 그은 접선의 접점을 T라 하자. 반지름이 6, OP = 10일 때 접선 PT의 길이는?',
    choices: ['4', '6', '8', '12'],
    answer: 2,
    why: '∠OTP = 90° 이므로 PT = √(10² − 6²) = 8.',
  },
  {
    q: '원 밖의 점 P에서 그은 두 접선의 접점이 A, B이고 ∠APB = 50°일 때 ∠AOB의 크기는?',
    choices: ['100°', '115°', '130°', '150°'],
    answer: 2,
    why: '사각형 OAPB에서 ∠OAP = ∠OBP = 90° 이므로 ∠AOB = 180° − 50° = 130°.',
  },
  {
    q: '호 AB에 대한 중심각의 크기가 120°일 때, 같은 호에 대한 원주각의 크기는?',
    choices: ['30°', '60°', '90°', '120°'],
    answer: 1,
    why: '원주각은 같은 호에 대한 중심각의 ½ 이므로 120° ÷ 2 = 60°.',
  },
  {
    q: 'AB가 원 O의 지름이고 점 P가 원 위의 점일 때, ∠APB의 크기는?',
    choices: ['45°', '60°', '90°', '점 P의 위치에 따라 다르다'],
    answer: 2,
    why: '지름에 대한 중심각이 180°이므로 원주각은 그 절반인 90°로 항상 일정합니다.',
  },
  {
    q: '한 원에서 호의 길이와 그 호에 대한 원주각의 크기 사이의 관계는?',
    choices: ['정비례한다', '반비례한다', '관계없다', '제곱에 비례한다'],
    answer: 0,
    why: '한 원에서 호의 길이는 중심각에, 중심각은 원주각의 2배에 해당하므로 호의 길이와 원주각은 정비례합니다.',
  },
  {
    q: '한 원에서 호 CD의 길이가 호 AB의 2배이고 호 AB에 대한 원주각이 30°일 때, 호 CD에 대한 원주각은?',
    choices: ['15°', '30°', '45°', '60°'],
    answer: 3,
    why: '호의 길이와 원주각은 정비례하므로 30° × 2 = 60°.',
  },
  {
    q: '두 점 C, D가 직선 AB에 대하여 같은 쪽에 있고 ∠ACB = ∠ADB 일 때 알 수 있는 사실은?',
    choices: [
      '네 점 A, B, C, D가 한 원 위에 있다',
      'AB는 지름이다',
      '△ABC는 정삼각형이다',
      'CD는 AB와 평행하다',
    ],
    answer: 0,
    why: '원주각의 성질의 역: 같은 쪽에서 두 각이 같으면 네 점은 한 원 위에 있습니다(공원점).',
  },
  {
    q: '원에 내접하는 사각형 ABCD에서 ∠A = 95°일 때, ∠C의 크기는?',
    choices: ['85°', '95°', '105°', '180°'],
    answer: 0,
    why: '내접사각형의 대각의 합은 180° 이므로 ∠C = 180° − 95° = 85°.',
  },
  {
    q: '원에 내접하는 사각형에서 한 외각의 크기와 항상 같은 것은?',
    choices: [
      '그와 이웃하는 내각의 대각',
      '그와 이웃하는 내각',
      '네 내각의 평균',
      '중심각의 절반',
    ],
    answer: 0,
    why: '∠A + ∠C = 180°, (A의 외각) = 180° − ∠A = ∠C 이므로 이웃한 내각의 대각과 같습니다.',
  },
  {
    q: '원의 접선 AT와 현 AB가 이루는 각 ∠BAT = 65°일 때, 호 AB에 대한 원주각 ∠ACB의 크기는? (C는 반대쪽 호 위의 점)',
    choices: ['32.5°', '65°', '115°', '130°'],
    answer: 1,
    why: '접선과 현이 이루는 각은 그 각 안의 호에 대한 원주각과 같으므로 65°.',
  },
]

function QuizSection({ onFinish, savedScore }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [answers, setAnswers] = useState([])
  const [done, setDone] = useState(false)

  const total = QUIZ.length
  const correct = answers.filter(Boolean).length

  const pick = (i) => {
    if (picked !== null) return
    setPicked(i)
    setAnswers((prev) => [...prev, i === QUIZ[idx].answer])
  }

  const next = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1)
      setPicked(null)
      return
    }
    setDone(true)
    onFinish(Math.round((answers.filter(Boolean).length / total) * 100))
  }

  const restart = () => {
    setIdx(0)
    setPicked(null)
    setAnswers([])
    setDone(false)
  }

  if (done) {
    const score = Math.round((correct / total) * 100)
    const tone =
      score >= 80
        ? 'text-emerald-600 dark:text-emerald-300'
        : score >= 60
          ? 'text-amber-600 dark:text-amber-300'
          : 'text-rose-600 dark:text-rose-300'
    return (
      <div className="space-y-5 text-center">
        <div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">종합 평가 결과</div>
          <div className={`font-display text-6xl ${tone}`}>{score}점</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total}문항 중 <b className="text-slate-700 dark:text-slate-200">{correct}문항</b> 정답
          </div>
        </div>

        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-1.5">
          {answers.map((ok, i) => (
            <span
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                ok
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300'
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          {score >= 80
            ? '훌륭해요! 원의 성질을 확실하게 이해했습니다. 🎉'
            : score >= 60
              ? '조금만 더! 틀린 문항의 차시 시뮬레이터를 다시 열어 확인해 보세요.'
              : '괜찮아요. 1차시부터 시뮬레이터를 직접 움직이며 다시 관찰해 봅시다.'}
        </p>

        <button
          type="button"
          onClick={restart}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
        >
          <RotateCcw className="h-4 w-4" />
          다시 풀기
        </button>
      </div>
    )
  }

  const item = QUIZ[idx]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>
          문제 {idx + 1} / {total}
        </span>
        {savedScore != null && <span>이전 기록 {savedScore}점</span>}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((idx + (picked !== null ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <p className="font-display text-base leading-relaxed text-slate-800 dark:text-slate-100">{item.q}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {item.choices.map((c, i) => {
          const isAnswer = i === item.answer
          const chosen = picked === i
          let cls =
            'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-indigo-500/40'
          if (picked !== null && isAnswer)
            cls = 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/15'
          else if (chosen)
            cls = 'border-rose-400 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/15'
          else if (picked !== null) cls = 'border-slate-200 bg-white opacity-50 dark:border-slate-700 dark:bg-slate-800/40'

          return (
            <button
              key={c}
              type="button"
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition dark:text-slate-200 ${cls}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {['①', '②', '③', '④'][i]}
              </span>
              {c}
            </button>
          )
        })}
      </div>

      {picked !== null && (
        <div className="space-y-3">
          <div
            className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
              picked === item.answer
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200'
            }`}
          >
            <b>{picked === item.answer ? '정답입니다! 🎉' : '아쉬워요.'}</b> {item.why}
          </div>
          <button
            type="button"
            onClick={next}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white transition hover:bg-indigo-700"
          >
            {idx + 1 === total ? '결과 확인하기' : '다음 문제'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/* =========================== 차시 메타데이터 =========================== */

const LESSONS = [
  {
    page: 'PAGE-04',
    no: 1,
    title: '원의 현과 접선의 성질',
    short: '현과 접선',
    desc: '원의 중심에서 현에 내린 수선은 현을 수직이등분합니다. 접선은 접점을 지나는 반지름과 수직입니다.',
    keys: ['중심에서 현에 내린 수선은 현을 이등분', '같은 길이의 두 현 ⇔ 중심에서 같은 거리', '접선 ⊥ 반지름, 두 접선의 길이는 같다'],
  },
  {
    page: 'PAGE-05',
    no: 2,
    title: '원주각과 중심각의 관계',
    short: '원주각과 중심각',
    desc: '한 호에 대한 원주각의 크기는 그 호에 대한 중심각의 크기의 절반입니다.',
    keys: ['원주각 = ½ × 중심각', '점 P를 옮겨도 원주각은 그대로', '중심각이 우각인 경우도 성립'],
  },
  {
    page: 'PAGE-06',
    no: 3,
    title: '원주각의 성질과 90° 원주각',
    short: '원주각의 성질',
    desc: '같은 호에 대한 원주각의 크기는 모두 같고, 반원(지름)에 대한 원주각은 항상 90°입니다.',
    keys: ['같은 호에 대한 원주각은 모두 같다', '지름에 대한 원주각 = 90°', '네 점이 한 원 위에 있을 조건'],
  },
  {
    page: 'PAGE-07',
    no: 4,
    title: '원에 내접하는 사각형',
    short: '내접사각형',
    desc: '원에 내접하는 사각형의 마주 보는 두 각의 합은 180°이며, 한 외각은 이웃한 내각의 대각과 같습니다.',
    keys: ['대각의 합 = 180°', '한 외각 = 이웃한 내각의 대각', '접선과 현이 이루는 각 = 원주각'],
  },
  {
    page: 'PAGE-08',
    no: 5,
    title: '종합 평가 & 나만의 코딩',
    short: '종합 평가',
    desc: '다섯 차시에서 배운 원의 성질을 문제로 점검하고, 직접 앱 기능을 확장해 봅니다.',
    keys: ['12문항 형성평가', '오답 즉시 해설', '바이브 코딩 확장 과제'],
  },
]

const DIFFICULTY_LABEL = { basic: '기초', normal: '보통', advanced: '심화' }

/* =========================== 메인 앱 =========================== */

export default function MathCircleApp() {
  /* ---- 페이지 상태 (PAGE-01 ~ PAGE-08) ---- */
  const [currentPage, setCurrentPage] = useState('PAGE-01')
  const [history, setHistory] = useState(['PAGE-01'])

  /* ---- 인증 상태 ---- */
  const [role, setRole] = useState('student') // 'student' | 'teacher'
  const [currentUser, setCurrentUser] = useState(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [regName, setRegName] = useState('')
  const [regId, setRegId] = useState('')
  const [regPw, setRegPw] = useState('')

  /* ---- 학습 상태 ---- */
  const [dark, setDark] = useState(false)
  const [difficulty, setDifficulty] = useState('normal') // 'basic' | 'normal' | 'advanced'
  const [progress, setProgress] = useState({}) // { 'PAGE-04': true, ... }
  const [quizScore, setQuizScore] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /* 다크/라이트에 맞춰 문서 배경까지 함께 전환 */
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = dark ? '#020617' : '#f5f7ff'
    return () => {
      document.body.style.background = prev
    }
  }, [dark])

  const [sampleStudents] = useState([
    { id: 'student1', name: '김민준', difficulty: '보통', p1: '완료', p2: '완료', p3: '진행중', p4: '미진행', p5: '미진행', score: 85 },
    { id: 'student2', name: '이서연', difficulty: '심화', p1: '완료', p2: '완료', p3: '완료', p4: '진행중', p5: '미진행', score: 92 },
    { id: 'student3', name: '박지호', difficulty: '기초', p1: '완료', p2: '진행중', p3: '미진행', p4: '미진행', p5: '미진행', score: 70 },
    { id: 'student4', name: '최유진', difficulty: '보통', p1: '완료', p2: '완료', p3: '완료', p4: '완료', p5: '완료', score: 98 },
  ])

  /* ---- 내비게이션 ---- */
  const navigateTo = (page) => {
    setHistory((prev) => [...prev, page])
    setCurrentPage(page)
  }

  const goBack = () => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev
      const nextHistory = prev.slice(0, -1)
      setCurrentPage(nextHistory[nextHistory.length - 1])
      return nextHistory
    })
  }

  const goHome = () => {
    const homePage = role === 'teacher' ? 'PAGE-02' : 'PAGE-03'
    setHistory([homePage])
    setCurrentPage(homePage)
  }

  /* ---- 로그인 / 회원가입 ---- */
  const handleLogin = (e) => {
    e.preventDefault()
    if (!loginId.trim()) {
      showToast('아이디를 입력해 주세요.')
      return
    }
    const isTeacher = role === 'teacher'
    setCurrentUser({
      name: isTeacher ? `${loginId} 선생님` : `${loginId} 학생`,
      id: loginId,
      role,
    })
    navigateTo(isTeacher ? 'PAGE-02' : 'PAGE-03')
  }

  const handleRegister = (e) => {
    e.preventDefault()
    setShowRegisterModal(false)
    setLoginId(regId)
    showToast(`회원가입 완료! ${regName}님, 로그인해 주세요.`)
    setRegName('')
    setRegId('')
    setRegPw('')
  }

  const logout = () => {
    setCurrentUser(null)
    setLoginId('')
    setLoginPw('')
    setHistory(['PAGE-01'])
    setCurrentPage('PAGE-01')
  }

  /* ---- 진행률 ---- */
  const markComplete = (page) => {
    setProgress((prev) => ({ ...prev, [page]: true }))
    showToast('학습 완료로 표시했습니다! 🎉')
  }

  const completedCount = LESSONS.filter((l) => progress[l.page]).length
  const percent = Math.round((completedCount / LESSONS.length) * 100)

  const myRow = currentUser?.role === 'student' || progress['PAGE-04'] ? {
    id: currentUser?.id ?? 'me',
    name: currentUser?.role === 'student' ? currentUser.name.replace(' 학생', '') : '나',
    difficulty: DIFFICULTY_LABEL[difficulty],
    p1: progress['PAGE-04'] ? '완료' : '미진행',
    p2: progress['PAGE-05'] ? '완료' : '미진행',
    p3: progress['PAGE-06'] ? '완료' : '미진행',
    p4: progress['PAGE-07'] ? '완료' : '미진행',
    p5: progress['PAGE-08'] ? '완료' : '미진행',
    score: quizScore ?? 0,
    mine: true,
  } : null

  const lessonMeta = LESSONS.find((l) => l.page === currentPage)

  /* ---- 렌더 ---- */
  return (
    <div className={dark ? 'dark' : ''}>
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-sky-50 via-indigo-50 to-rose-50 font-body text-slate-800 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
        {/* ===== 공통 헤더 (PAGE-02 ~ PAGE-08) ===== */}
        {currentPage !== 'PAGE-01' && (
          <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 md:px-6">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={history.length <= 1}
                  className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  뒤로가기
                </button>
                <button
                  type="button"
                  onClick={goHome}
                  className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                >
                  <Home className="h-4 w-4" />홈
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="hidden rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline">
                  [{currentPage}]
                </span>

                {currentUser && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-100">{currentUser.name}</span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {currentUser.role === 'teacher' ? '교사' : DIFFICULTY_LABEL[difficulty]}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDark((d) => !d)}
                  aria-label="다크 모드 전환"
                  className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
                >
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </header>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
          {/* ================= [PAGE-01] 로그인 & 회원가입 ================= */}
          {currentPage === 'PAGE-01' && (
            <div className="flex min-h-[85vh] flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => setDark((d) => !d)}
                aria-label="다크 모드 전환"
                className="mb-4 self-end rounded-xl bg-white/70 p-2 text-slate-500 shadow-sm transition hover:bg-white dark:bg-slate-800 dark:text-amber-300"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 shadow-xl shadow-indigo-100/60 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
                <div className="mb-7 text-center">
                  <div className="mb-3 inline-flex rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <Compass className="h-10 w-10" />
                  </div>
                  <h1 className="font-display text-2xl text-slate-900 dark:text-slate-50">
                    중3 수학 &lsquo;원의 성질&rsquo;
                  </h1>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    드래그하며 배우는 인터랙티브 5차시 통합 탐구 클래스
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
                  {[
                    { key: 'student', label: '학생 로그인', Icon: User },
                    { key: 'teacher', label: '교사 로그인', Icon: School },
                  ].map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRole(key)}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                        role === key
                          ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      아이디
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        placeholder={role === 'teacher' ? '교사 아이디 (예: teacher)' : '학생 아이디 (예: student1)'}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      비밀번호
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input
                        type="password"
                        value={loginPw}
                        onChange={(e) => setLoginPw(e.target.value)}
                        placeholder="비밀번호 입력"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 dark:shadow-none"
                  >
                    {role === 'teacher' ? '교사 대시보드 접속' : '수업 입장하기'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    아직 계정이 없으신가요? 회원가입
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= 회원가입 모달 ================= */}
          {showRegisterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-4 font-display text-lg text-slate-900 dark:text-slate-50">신규 회원가입</h2>
                <form onSubmit={handleRegister} className="space-y-3">
                  {[
                    { label: '이름', value: regName, set: setRegName, type: 'text', ph: '홍길동' },
                    { label: '아이디', value: regId, set: setRegId, type: 'text', ph: 'student123' },
                    { label: '비밀번호', value: regPw, set: setRegPw, type: 'password', ph: '••••••••' },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {f.label}
                      </label>
                      <input
                        required
                        type={f.type}
                        value={f.value}
                        placeholder={f.ph}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/30"
                      />
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                    >
                      가입 완료
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= [PAGE-02] 교사 대시보드 ================= */}
          {currentPage === 'PAGE-02' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl text-slate-900 dark:text-slate-50">
                    교사 학습 관찰 대시보드
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    학생들의 1~5차시 원 탐구 학습 현황을 확인합니다.
                  </p>
                </div>
                <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  실시간 동기화 중
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: '총 학생 수', value: `${sampleStudents.length + (myRow ? 1 : 0)}명`, Icon: Users, color: 'text-indigo-500' },
                  { label: '완료 학생', value: `${sampleStudents.filter((s) => s.p5 === '완료').length}명`, Icon: CheckCircle, color: 'text-emerald-500' },
                  { label: '진행 중 학생', value: `${sampleStudents.filter((s) => s.p5 !== '완료').length}명`, Icon: Play, color: 'text-amber-500' },
                  {
                    label: '평균 퀴즈 점수',
                    value: `${(sampleStudents.reduce((a, s) => a + s.score, 0) / sampleStudents.length).toFixed(1)}점`,
                    Icon: BarChart2,
                    color: 'text-indigo-500',
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/50"
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>{c.label}</span>
                      <c.Icon className={`h-4 w-4 ${c.color}`} />
                    </div>
                    <div className="font-display text-2xl text-slate-800 dark:text-slate-50">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/40">
                <div className="border-b border-slate-100 px-6 py-4 text-sm font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                  학생별 차시 진행 상태 및 성취도
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3">이름 (ID)</th>
                        <th className="px-5 py-3">난이도</th>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <th key={n} className="px-5 py-3">
                            {n}차시
                          </th>
                        ))}
                        <th className="px-5 py-3">총점</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-700/70 dark:text-slate-200">
                      {[...(myRow ? [myRow] : []), ...sampleStudents].map((s) => (
                        <tr
                          key={s.id}
                          className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${
                            s.mine ? 'bg-indigo-50/60 dark:bg-indigo-500/10' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-50">
                            {s.name} ({s.id})
                            {s.mine && (
                              <span className="ml-1.5 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">
                                나
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {s.difficulty}
                            </span>
                          </td>
                          {[s.p1, s.p2, s.p3, s.p4, s.p5].map((st, i) => (
                            <td key={i} className="px-5 py-3.5">
                              <Badge status={st} />
                            </td>
                          ))}
                          <td className="px-5 py-3.5 font-bold text-indigo-600 dark:text-indigo-300">
                            {s.score}점
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/80 p-5 dark:border-slate-700/70 dark:bg-slate-800/40">
                <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                  차시별 시뮬레이터 미리 보기
                </h2>
                <div className="grid gap-2 sm:grid-cols-5">
                  {LESSONS.map((l) => (
                    <button
                      key={l.page}
                      type="button"
                      onClick={() => navigateTo(l.page)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left text-[11px] font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
                    >
                      {l.no}차시: {l.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= [PAGE-03] 난이도 선택 / 코스 ================= */}
          {currentPage === 'PAGE-03' && (
            <div className="space-y-8 py-2">
              <div className="mx-auto max-w-xl space-y-2 text-center">
                <h1 className="font-display text-2xl text-slate-900 dark:text-slate-50">
                  학습 난이도를 선택하세요
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  선택한 난이도에 맞추어 각 시뮬레이터의 탐구 가이드와 과제가 달라집니다.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {[
                  {
                    key: 'basic',
                    emoji: '🌱',
                    title: '기초 코스',
                    desc: '원 개념이 어려운 학생을 위한 단계별 관찰 가이드가 함께 제공됩니다.',
                    on: 'border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-500/20',
                    off: 'border-slate-200 hover:border-emerald-300 dark:border-slate-700',
                    chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
                    text: 'text-emerald-600 dark:text-emerald-300',
                  },
                  {
                    key: 'normal',
                    emoji: '⭐',
                    title: '보통 코스 (표준)',
                    desc: '중3 교과서 표준 탐구 활동과 실시간 각도·길이 측정 시뮬레이터를 활용합니다.',
                    on: 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-500/20',
                    off: 'border-slate-200 hover:border-indigo-300 dark:border-slate-700',
                    chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
                    text: 'text-indigo-600 dark:text-indigo-300',
                  },
                  {
                    key: 'advanced',
                    emoji: '🚀',
                    title: '심화 코스',
                    desc: '원주각·내접사각형의 성질을 직접 증명하는 도전 과제가 추가됩니다.',
                    on: 'border-purple-400 ring-2 ring-purple-100 dark:ring-purple-500/20',
                    off: 'border-slate-200 hover:border-purple-300 dark:border-slate-700',
                    chip: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
                    text: 'text-purple-600 dark:text-purple-300',
                  },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setDifficulty(c.key)
                      showToast(`${DIFFICULTY_LABEL[c.key]} 코스로 설정했어요.`)
                    }}
                    className={`rounded-3xl border-2 bg-white/80 p-6 text-left shadow-sm transition hover:-translate-y-1 dark:bg-slate-800/50 ${
                      difficulty === c.key ? c.on : c.off
                    }`}
                  >
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${c.chip}`}>
                      {c.emoji}
                    </div>
                    <h3 className="mb-1 font-display text-lg text-slate-800 dark:text-slate-50">{c.title}</h3>
                    <p className="mb-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{c.desc}</p>
                    <span className={`flex items-center gap-1 text-[11px] font-bold ${c.text}`}>
                      {difficulty === c.key ? '선택됨' : '선택하기'}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>

              {/* 나의 진행률 */}
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 dark:border-slate-700/70 dark:bg-slate-800/40">
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">나의 학습 진행률</h2>
                  <span className="font-display text-lg text-indigo-600 dark:text-indigo-300">
                    {completedCount} / {LESSONS.length}차시
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {quizScore != null && (
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    최근 종합 평가 점수:{' '}
                    <b className="text-indigo-600 dark:text-indigo-300">{quizScore}점</b>
                  </p>
                )}
              </div>

              {/* 5차시 코스 */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">5차시 수업 코스</h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {LESSONS.map((l) => (
                    <button
                      key={l.page}
                      type="button"
                      onClick={() => navigateTo(l.page)}
                      className="group flex flex-col rounded-3xl border border-white/70 bg-white/80 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/50"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                          {l.no}차시
                        </span>
                        {progress[l.page] ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            완료
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">미진행</span>
                        )}
                      </div>
                      <h3 className="font-display text-base text-slate-800 dark:text-slate-50">{l.title}</h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{l.desc}</p>
                      <ul className="mt-3 space-y-1">
                        {l.keys.map((k) => (
                          <li
                            key={k}
                            className="flex gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"
                          >
                            <span className="text-indigo-400">·</span>
                            {k}
                          </li>
                        ))}
                      </ul>
                      <span className="mt-4 flex items-center gap-1 text-[11px] font-bold text-indigo-600 transition group-hover:gap-2 dark:text-indigo-300">
                        학습 시작 <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= [PAGE-04] ~ [PAGE-07] 시뮬레이터 ================= */}
          {['PAGE-04', 'PAGE-05', 'PAGE-06', 'PAGE-07'].includes(currentPage) && lessonMeta && (
            <LessonLayout
              lesson={lessonMeta}
              difficulty={difficulty}
              completed={!!progress[currentPage]}
              onComplete={() => markComplete(currentPage)}
              onNext={() => navigateTo(LESSONS[lessonMeta.no].page)}
            >
              {currentPage === 'PAGE-04' && <ChordTangentSim difficulty={difficulty} />}
              {currentPage === 'PAGE-05' && <CentralInscribedSim difficulty={difficulty} />}
              {currentPage === 'PAGE-06' && <InscribedPropertySim difficulty={difficulty} />}
              {currentPage === 'PAGE-07' && <CyclicQuadSim difficulty={difficulty} />}
            </LessonLayout>
          )}

          {/* ================= [PAGE-08] 5차시 종합 평가 & 프로젝트 ================= */}
          {currentPage === 'PAGE-08' && (
            <div className="space-y-6">
              <div className="space-y-3 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-xl shadow-indigo-200/60 dark:shadow-none">
                <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
                  5차시 프로젝트
                </div>
                <h1 className="font-display text-2xl">원의 성질 종합 평가 &amp; 나만의 코딩 만들기</h1>
                <p className="text-xs leading-relaxed text-indigo-100">
                  1~4차시에서 직접 움직여 본 원의 성질을 12문항으로 점검하고, 프롬프트를 활용해 이 앱에 나만의
                  기능을 직접 확장해 봅니다.
                </p>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/50">
                <h3 className="mb-4 flex items-center gap-2 font-display text-base text-slate-800 dark:text-slate-50">
                  <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                  종합 개념 점검 퀴즈
                </h3>
                <QuizSection
                  savedScore={quizScore}
                  onFinish={(score) => {
                    setQuizScore(score)
                    setProgress((prev) => ({ ...prev, 'PAGE-08': true }))
                  }}
                />
              </div>

              <div className="space-y-4 rounded-3xl bg-slate-900 p-6 text-slate-100 dark:ring-1 dark:ring-slate-700">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                  <Sparkles className="h-5 w-5" />
                  [학생 체험] 나만의 원 웹앱 코딩 확장하기
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  Claude Code나 Claude Artifacts 대화창에 아래 프롬프트를 입력해 오늘 배운 앱에 나만의 기능을
                  추가해 보세요!
                </p>
                {[
                  '[PAGE-05] 2차시 원주각 시뮬레이터에서 원주각이 정확히 90°가 되는 순간 축하 폭죽 애니메이션이 재생되도록 코드를 고쳐줘!',
                  '[PAGE-04] 현 시뮬레이터에 현의 길이를 직접 숫자로 입력하면 점 A, B가 그 길이에 맞게 자동으로 움직이는 기능을 추가해줘.',
                  '[PAGE-07] 내접사각형 시뮬레이터에 내가 만든 사각형의 네 각을 표로 저장하는 기록장 기능을 만들어줘.',
                ].map((p) => (
                  <div
                    key={p}
                    className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-[11px] leading-relaxed text-emerald-400"
                  >
                    &ldquo;{p}&rdquo;
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {LESSONS.slice(0, 4).map((l) => (
                  <button
                    key={l.page}
                    type="button"
                    onClick={() => navigateTo(l.page)}
                    className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-[11px] font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                  >
                    {l.no}차시 시뮬레이터로 복습하기
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ===== 토스트 ===== */}
        {toast && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900/90 px-5 py-3 text-xs font-bold text-white shadow-xl backdrop-blur dark:bg-slate-100/95 dark:text-slate-900">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================== 보조 컴포넌트 =========================== */

function Badge({ status }) {
  if (status === '완료')
    return (
      <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        완료
      </span>
    )
  if (status === '진행중')
    return (
      <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        진행중
      </span>
    )
  return (
    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400 dark:bg-slate-700 dark:text-slate-500">
      미진행
    </span>
  )
}

function LessonLayout({ lesson, difficulty, completed, onComplete, onNext, children }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              {lesson.no}차시
            </span>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {DIFFICULTY_LABEL[difficulty]} 코스
            </span>
          </div>
          <h1 className="font-display text-xl text-slate-900 dark:text-slate-50">{lesson.title}</h1>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {lesson.desc}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onComplete}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold transition ${
              completed
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {completed ? '학습 완료' : '학습 완료 표시'}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-[11px] font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 dark:shadow-none"
          >
            다음 차시로 이동
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/40 md:p-6">
        {children}
      </div>
    </div>
  )
}
