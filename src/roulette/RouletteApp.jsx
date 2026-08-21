import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FastForward,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Trash2,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Race, STEP } from './engine/sim.js'
import { Renderer } from './engine/renderer.js'
import { MAP_LIST } from './engine/maps.js'
import { playClick, playFanfare, playGoal, unlockAudio } from './engine/audio.js'
import {
  MAX_MARBLES,
  decodeShare,
  encodeShare,
  parseParticipants,
  shuffle,
} from './participants.js'

const DEFAULT_TEXT = ['민수', '영희', '철수', '지훈', '서연', '하은', '도윤', '수아'].join('\n')

const STORAGE = {
  names: 'roulette:names',
  winners: 'roulette:winners',
  map: 'roulette:map',
  sound: 'roulette:sound',
}

const readStore = (key, fallback) => {
  try {
    const v = window.localStorage.getItem(key)
    return v === null ? fallback : v
  } catch {
    return fallback
  }
}

const writeStore = (key, value) => {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    /* 저장을 막아둔 브라우저에서는 그냥 넘어간다 */
  }
}

function loadInitial() {
  const shared = decodeShare(window.location.hash)
  if (shared) return shared
  return {
    namesText: readStore(STORAGE.names, DEFAULT_TEXT),
    winnerCount: Math.max(1, parseInt(readStore(STORAGE.winners, '1'), 10) || 1),
    mapId: readStore(STORAGE.map, 'zigzag'),
  }
}

const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

export default function RouletteApp() {
  const initial = useMemo(loadInitial, [])
  const [namesText, setNamesText] = useState(initial.namesText)
  const [winnerCount, setWinnerCount] = useState(initial.winnerCount)
  const [mapId, setMapId] = useState(
    MAP_LIST.some((m) => m.id === initial.mapId) ? initial.mapId : 'zigzag',
  )
  const [speed, setSpeed] = useState(1)
  const [soundOn, setSoundOn] = useState(readStore(STORAGE.sound, '1') === '1')
  const [zoomed, setZoomed] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | running | paused | result | done
  const [results, setResults] = useState([])
  const [leaders, setLeaders] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [toast, setToast] = useState('')

  const participants = useMemo(() => parseParticipants(namesText), [namesText])
  const total = participants.length
  const winners = Math.min(Math.max(winnerCount, 1), Math.max(total, 1))
  const locked = phase === 'running' || phase === 'result'

  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const raceRef = useRef(null)
  const handlersRef = useRef({})
  const announcedRef = useRef(false)
  const phaseRef = useRef(phase)
  const speedRef = useRef(speed)
  const soundRef = useRef(soundOn)
  const zoomRef = useRef(zoomed)
  const winnersRef = useRef(winners)

  phaseRef.current = phase
  speedRef.current = speed
  soundRef.current = soundOn
  zoomRef.current = zoomed
  winnersRef.current = winners

  useEffect(() => writeStore(STORAGE.names, namesText), [namesText])
  useEffect(() => writeStore(STORAGE.winners, winnerCount), [winnerCount])
  useEffect(() => writeStore(STORAGE.map, mapId), [mapId])
  useEffect(() => writeStore(STORAGE.sound, soundOn ? '1' : '0'), [soundOn])

  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(id)
  }, [toast])

  const resetRace = useCallback(() => {
    raceRef.current = participants.length
      ? new Race(mapId, participants, Math.floor(Math.random() * 2 ** 31))
      : null
    if (rendererRef.current) rendererRef.current.ready = false
    announcedRef.current = false
    setResults([])
    setLeaders([])
    setElapsed(0)
    setRemaining(participants.length)
    setPhase('idle')
    setShowResult(false)
  }, [participants, mapId])

  // 참가자나 코스가 바뀌면 새 경기를 준비한다
  useEffect(() => {
    resetRace()
  }, [resetRace])

  const finishRound = useCallback((race) => {
    setResults([...race.results])
    setRemaining(0)
    setElapsed(race.time)
    setPhase('done')
    setShowResult(true)
    announcedRef.current = true
    if (soundRef.current) playFanfare()
  }, [])

  handlersRef.current.onArrive = (arrived) => {
    const race = raceRef.current
    setResults([...race.results])
    if (soundRef.current) playGoal(arrived[0].rank)
    if (!announcedRef.current && race.results.length >= winnersRef.current) {
      announcedRef.current = true
      setPhase('result')
      setShowResult(true)
      if (soundRef.current) playFanfare()
    } else if (race.finished) {
      setPhase('done')
    }
  }

  handlersRef.current.onHud = (race) => {
    setElapsed(race.time)
    const running = race.running()
    setRemaining(running.length)
    setLeaders(
      [...running]
        .sort((a, b) => b.y - a.y)
        .slice(0, 3)
        .map((m) => ({ name: m.name, color: m.color, index: m.index })),
    )
  }

  // 렌더 루프: 대기 중에도 돌면서 미리보기와 창 크기 변화를 처리한다
  useEffect(() => {
    const renderer = new Renderer(canvasRef.current)
    rendererRef.current = renderer
    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudTick = 0
    const loop = (ts) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((ts - last) / 1000, 0.1)
      last = ts
      const race = raceRef.current
      if (!race) return
      if (phaseRef.current === 'running' && !race.finished) {
        acc += dt * speedRef.current
        const maxSteps = 20 * speedRef.current
        let steps = 0
        while (acc >= STEP && steps < maxSteps) {
          const arrived = race.step()
          if (arrived.length) handlersRef.current.onArrive(arrived)
          acc -= STEP
          steps += 1
        }
        if (acc > 0.5) acc = 0
        const impacts = race.consumeImpacts()
        if (soundRef.current && impacts > 0) playClick(impacts)
      }
      hudTick += dt
      if (hudTick > 0.15) {
        hudTick = 0
        if (phaseRef.current !== 'idle') handlersRef.current.onHud(race)
      }
      renderer.draw(race, { zoomed: zoomRef.current })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const start = () => {
    if (!total) return
    unlockAudio()
    if (phase === 'done' || phase === 'result') {
      resetRace()
      setTimeout(() => setPhase('running'), 0)
      return
    }
    setPhase('running')
  }

  const skipToEnd = () => {
    const race = raceRef.current
    if (!race) return
    race.fastForward(240)
    finishRound(race)
  }

  const keepWatching = () => {
    setShowResult(false)
    const race = raceRef.current
    if (race && !race.finished) setPhase('running')
    else setPhase('done')
  }

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast(message)
    } catch {
      setToast('복사할 수 없어요. 직접 선택해 주세요.')
    }
  }

  const winnerList = results.slice(0, winners)
  const mapInfo = MAP_LIST.find((m) => m.id === mapId)

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-950 text-slate-100 lg:flex-row">
      {/* 경기장 */}
      <main className="relative min-h-[56dvh] flex-1">
        <canvas ref={canvasRef} className="block h-full w-full" />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-nowrap items-center gap-1.5 overflow-hidden p-2 text-xs sm:gap-2 sm:p-3 sm:text-sm">
          <span className="shrink-0 rounded-full bg-slate-900/75 px-2.5 py-1 font-semibold text-slate-200 backdrop-blur sm:px-3 sm:py-1.5">
            ⏱ {fmtTime(elapsed)}
          </span>
          <span className="shrink-0 rounded-full bg-slate-900/75 px-2.5 py-1 font-semibold text-slate-200 backdrop-blur sm:px-3 sm:py-1.5">
            남은 {remaining}/{total}
          </span>
          {leaders.map((l, i) => (
            <span
              key={l.index}
              className={`flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900/75 px-2.5 py-1 font-semibold backdrop-blur sm:px-3 sm:py-1.5 ${
                i > 0 ? 'hidden sm:flex' : ''
              }`}
            >
              <em className="not-italic text-slate-400">{i + 1}위</em>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              <span className="max-w-[7rem] truncate">{l.name}</span>
            </span>
          ))}
        </div>

        {phase === 'idle' && total > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 text-center">
            <p className="font-display text-lg text-slate-300 drop-shadow">
              시작을 누르면 구슬 {total}개가 떨어집니다
            </p>
          </div>
        )}
        {total === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="font-display text-lg text-slate-400">참가자를 먼저 입력해 주세요</p>
          </div>
        )}

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <div className="flex overflow-hidden rounded-full bg-slate-900/80 backdrop-blur">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-3 py-2 text-sm font-bold transition ${
                  speed === s ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                ×{s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setZoomed((v) => !v)}
            aria-label={zoomed ? '전체 보기' : '확대 보기'}
            className="rounded-full bg-slate-900/80 p-2.5 text-slate-200 backdrop-blur transition hover:bg-slate-800"
          >
            {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
          </button>
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            aria-label={soundOn ? '소리 끄기' : '소리 켜기'}
            className="rounded-full bg-slate-900/80 p-2.5 text-slate-200 backdrop-blur transition hover:bg-slate-800"
          >
            {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </main>

      {/* 조작 패널 */}
      <aside className="flex max-h-[44dvh] min-h-0 flex-col gap-4 overflow-y-auto border-t border-slate-800 bg-slate-900 p-4 lg:max-h-none lg:w-[24rem] lg:border-l lg:border-t-0">
        <header>
          <h1 className="font-display text-2xl text-amber-300">구슬 레이스 룰렛</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            이름을 넣고 굴리면, 먼저 결승선을 통과한 구슬이 당첨입니다.
          </p>
        </header>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="names" className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
              <Users size={16} /> 참가자
              <span className="text-amber-300">{total}명</span>
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={locked}
                onClick={() => setNamesText(shuffle(namesText.split('\n').filter((l) => l.trim())).join('\n'))}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
              >
                <Shuffle size={14} className="mr-1 inline" />섞기
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => setNamesText('')}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
              >
                <Trash2 size={14} className="mr-1 inline" />비우기
              </button>
            </div>
          </div>
          <textarea
            id="names"
            value={namesText}
            disabled={locked}
            onChange={(e) => setNamesText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={'한 줄에 한 명씩\n영희*3 처럼 쓰면 3개'}
            className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400 disabled:opacity-60"
          />
          <p className="text-xs text-slate-500">
            쉼표로도 나눌 수 있고, <span className="text-slate-400">이름*3</span> 은 같은 이름 3개가
            됩니다. 최대 {MAX_MARBLES}개.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm font-bold text-slate-300">
            <span>당첨 인원</span>
            <span className="text-amber-300">{winners}명</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={locked}
              onClick={() => setWinnerCount((v) => Math.max(1, v - 1))}
              className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold transition hover:bg-slate-700 disabled:opacity-40"
            >
              −
            </button>
            <input
              type="range"
              min={1}
              max={Math.max(total, 1)}
              value={winners}
              disabled={locked}
              onChange={(e) => setWinnerCount(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-amber-400 disabled:opacity-40"
            />
            <button
              type="button"
              disabled={locked}
              onClick={() => setWinnerCount((v) => Math.min(Math.max(total, 1), v + 1))}
              className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold transition hover:bg-slate-700 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <span className="text-sm font-bold text-slate-300">코스</span>
          <div className="grid grid-cols-3 gap-2">
            {MAP_LIST.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={locked}
                onClick={() => setMapId(m.id)}
                className={`rounded-xl border px-2 py-2 text-sm font-bold transition disabled:opacity-40 ${
                  mapId === m.id
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{mapInfo?.desc}</p>
        </section>

        <section className="grid grid-cols-2 gap-2">
          {phase === 'running' ? (
            <button
              type="button"
              onClick={() => setPhase('paused')}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-slate-700 py-3 font-display text-lg text-white transition hover:bg-slate-600"
            >
              <Pause size={20} /> 일시정지
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={!total}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-display text-lg text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
            >
              <Play size={20} />
              {phase === 'paused' ? '이어서 하기' : phase === 'idle' ? '시작' : '다시 하기'}
            </button>
          )}
          <button
            type="button"
            onClick={skipToEnd}
            disabled={!total || phase === 'done'}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
          >
            <FastForward size={16} /> 결과 바로 보기
          </button>
          <button
            type="button"
            onClick={resetRace}
            disabled={!total}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
          >
            <RotateCcw size={16} /> 처음으로
          </button>
        </section>

        <section className="shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-300">순위</span>
            {results.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  copy(
                    results.map((r) => `${r.rank}위 ${r.name}`).join('\n'),
                    '순위를 복사했어요',
                  )
                }
                className="text-xs font-bold text-slate-400 transition hover:text-amber-300"
              >
                순위 복사
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
              아직 도착한 구슬이 없습니다
            </p>
          ) : (
            <ol className="space-y-1">
              {results.map((r) => (
                <li
                  key={`${r.index}-${r.rank}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                    r.rank <= winners
                      ? 'bg-amber-400/15 font-bold text-amber-200'
                      : 'bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="w-8 shrink-0 text-right tabular-nums">{r.rank}위</span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {r.time.toFixed(1)}초
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <button
          type="button"
          onClick={() =>
            copy(encodeShare({ namesText, winnerCount: winners, mapId }), '링크를 복사했어요')
          }
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-700 py-2.5 text-sm font-bold text-slate-300 transition hover:border-slate-500"
        >
          <Link2 size={16} /> 참가자 그대로 링크 복사
        </button>
      </aside>

      {showResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={keepWatching}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-center shadow-2xl ring-1 ring-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Trophy size={40} className="mx-auto text-amber-300" />
            <h2 className="mt-2 font-display text-2xl text-amber-300">
              {winners === 1 ? '당첨!' : `당첨자 ${winners}명`}
            </h2>
            <ol className="mt-4 space-y-1.5 text-left">
              {winnerList.map((r) => (
                <li
                  key={`${r.index}-${r.rank}`}
                  className="flex items-center gap-2 rounded-xl bg-amber-400/15 px-4 py-2 font-bold text-amber-100"
                >
                  <span className="w-7 text-right tabular-nums text-amber-300">{r.rank}위</span>
                  <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  copy(winnerList.map((r) => `${r.rank}위 ${r.name}`).join('\n'), '당첨자를 복사했어요')
                }
                className="rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
              >
                결과 복사
              </button>
              <button
                type="button"
                onClick={keepWatching}
                className="rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
              >
                {raceRef.current?.finished ? '닫기' : '끝까지 보기'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetRace()
                  setTimeout(() => setPhase('running'), 0)
                }}
                className="col-span-2 rounded-xl bg-amber-400 py-3 font-display text-lg text-slate-900 transition hover:bg-amber-300"
              >
                한 판 더
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-100 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
