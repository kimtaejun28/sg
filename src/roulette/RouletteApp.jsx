import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FastForward,
  Image as ImageIcon,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Trash2,
  Trophy,
  Upload,
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
import { buildResultImage, downloadBlob } from './resultImage.js'
import {
  MAX_MARBLES,
  decodeShare,
  encodeShare,
  namesFromRows,
  parseCsv,
  parseParticipants,
  shuffle,
} from './participants.js'

const DEFAULT_TEXT = ['민수', '영희', '철수', '지훈', '서연', '하은', '도윤', '수아'].join('\n')

const MODES = [
  { id: 'first', label: '앞에서', hint: '먼저 도착한 순서로 당첨자를 뽑는다' },
  { id: 'last', label: '뒤에서', hint: '마지막에 도착한 순서로 뽑는다. 끝까지 달린다' },
  { id: 'team', label: '팀 나누기', hint: '도착 순서대로 돌아가며 팀에 넣는다' },
]

const STORAGE = {
  names: 'roulette:names',
  winners: 'roulette:winners',
  map: 'roulette:map',
  sound: 'roulette:sound',
  mode: 'roulette:mode',
  teams: 'roulette:teams',
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
    mode: readStore(STORAGE.mode, 'first'),
    teamCount: Math.max(2, parseInt(readStore(STORAGE.teams, '2'), 10) || 2),
  }
}

const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

const pickRandomMap = () => MAP_LIST[Math.floor(Math.random() * MAP_LIST.length)].id

export default function RouletteApp() {
  const initial = useMemo(loadInitial, [])
  const [namesText, setNamesText] = useState(initial.namesText)
  const [winnerCount, setWinnerCount] = useState(initial.winnerCount)
  const [teamCount, setTeamCount] = useState(initial.teamCount)
  const [mode, setMode] = useState(
    MODES.some((m) => m.id === initial.mode) ? initial.mode : 'first',
  )
  const [mapId, setMapId] = useState(
    initial.mapId === 'random' || MAP_LIST.some((m) => m.id === initial.mapId)
      ? initial.mapId
      : 'zigzag',
  )
  const [activeMapId, setActiveMapId] = useState('zigzag')
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
  const [announcement, setAnnouncement] = useState('')

  const participants = useMemo(() => parseParticipants(namesText), [namesText])
  const total = participants.length
  const winners = Math.min(Math.max(winnerCount, 1), Math.max(total, 1))
  const teams = Math.min(Math.max(teamCount, 2), Math.max(total, 2))
  const locked = phase === 'running' || phase === 'result'

  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const rendererRef = useRef(null)
  const raceRef = useRef(null)
  const handlersRef = useRef({})
  const actionsRef = useRef({})
  const announcedRef = useRef(false)
  const phaseRef = useRef(phase)
  const speedRef = useRef(speed)
  const soundRef = useRef(soundOn)
  const zoomRef = useRef(zoomed)
  const winnersRef = useRef(winners)
  const modeRef = useRef(mode)

  phaseRef.current = phase
  speedRef.current = speed
  soundRef.current = soundOn
  zoomRef.current = zoomed
  winnersRef.current = winners
  modeRef.current = mode

  useEffect(() => writeStore(STORAGE.names, namesText), [namesText])
  useEffect(() => writeStore(STORAGE.winners, winnerCount), [winnerCount])
  useEffect(() => writeStore(STORAGE.map, mapId), [mapId])
  useEffect(() => writeStore(STORAGE.sound, soundOn ? '1' : '0'), [soundOn])
  useEffect(() => writeStore(STORAGE.mode, mode), [mode])
  useEffect(() => writeStore(STORAGE.teams, teamCount), [teamCount])

  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(id)
  }, [toast])

  const resetRace = useCallback(() => {
    const chosen = mapId === 'random' ? pickRandomMap() : mapId
    setActiveMapId(chosen)
    raceRef.current = participants.length
      ? new Race(chosen, participants, Math.floor(Math.random() * 2 ** 31))
      : null
    if (rendererRef.current) rendererRef.current.ready = false
    announcedRef.current = false
    setResults([])
    setLeaders([])
    setElapsed(0)
    setRemaining(participants.length)
    setPhase('idle')
    setShowResult(false)
    setAnnouncement('')
  }, [participants, mapId, mode])

  // 참가자·코스·뽑는 방식이 바뀌면 새 경기를 준비한다
  // (방식이 바뀌면 앞선 경기의 결과는 더 이상 그대로 쓸 수 없다)
  useEffect(() => {
    resetRace()
  }, [resetRace])

  const teamsOf = useCallback(
    (list) => {
      const buckets = Array.from({ length: teams }, (_, i) => ({ name: `${i + 1}팀`, members: [] }))
      list.forEach((r) => buckets[(r.rank - 1) % teams].members.push(r))
      return buckets
    },
    [teams],
  )

  const announceResult = useCallback(
    (race) => {
      announcedRef.current = true
      setShowResult(true)
      if (soundRef.current) playFanfare()
      const list = race.results
      if (modeRef.current === 'team') {
        setAnnouncement(
          teamsOf(list)
            .map((t) => `${t.name} ${t.members.map((m) => m.name).join(', ')}`)
            .join('. '),
        )
      } else {
        const picked =
          modeRef.current === 'last' ? [...list].slice(-winnersRef.current).reverse() : list.slice(0, winnersRef.current)
        setAnnouncement(`결과: ${picked.map((r) => `${r.rank}위 ${r.name}`).join(', ')}`)
      }
    },
    [teamsOf],
  )

  handlersRef.current.onArrive = (arrived) => {
    const race = raceRef.current
    setResults([...race.results])
    if (soundRef.current) playGoal(arrived[0].rank)

    if (modeRef.current === 'first') {
      if (arrived[0].rank <= 3) setAnnouncement(`${arrived[0].rank}위 ${arrived[0].name}`)
      if (!announcedRef.current && race.results.length >= winnersRef.current) {
        setPhase('result')
        announceResult(race)
        return
      }
    }
    if (race.finished) {
      setPhase('done')
      if (!announcedRef.current) announceResult(race)
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

  const start = useCallback(() => {
    if (!total) return
    unlockAudio()
    if (phaseRef.current === 'done' || phaseRef.current === 'result') {
      resetRace()
      setTimeout(() => setPhase('running'), 0)
    } else {
      setPhase('running')
      setAnnouncement(`경기를 시작합니다. 참가자 ${total}명.`)
    }
  }, [total, resetRace])

  const skipToEnd = useCallback(() => {
    const race = raceRef.current
    if (!race) return
    race.fastForward(240)
    setResults([...race.results])
    setRemaining(0)
    setElapsed(race.time)
    setPhase('done')
    announceResult(race)
  }, [announceResult])

  const keepWatching = useCallback(() => {
    setShowResult(false)
    const race = raceRef.current
    if (race && !race.finished && modeRef.current === 'first') setPhase('running')
    else setPhase('done')
  }, [])

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast(message)
    } catch {
      setToast('복사할 수 없어요. 직접 선택해 주세요.')
    }
  }

  const loadFile = async (event) => {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    try {
      let names = []
      if (/\.xlsx?$/i.test(file.name)) {
        const readXlsxFile = (await import('read-excel-file/browser')).default
        names = namesFromRows(await readXlsxFile(file))
      } else {
        names = parseCsv(await file.text())
      }
      if (!names.length) {
        setToast('이름을 찾지 못했어요')
        return
      }
      setNamesText(names.join('\n'))
      setToast(`${names.length}명을 불러왔어요`)
    } catch {
      setToast('파일을 읽지 못했어요')
    }
  }

  const mapInfo = MAP_LIST.find((m) => m.id === activeMapId)
  const modeInfo = MODES.find((m) => m.id === mode)

  const pickedList =
    mode === 'last' ? [...results].slice(-winners).reverse() : results.slice(0, winners)
  const teamList = mode === 'team' ? teamsOf(results) : []

  const resultHeading =
    mode === 'team'
      ? `${teams}개 팀`
      : mode === 'last'
        ? winners === 1
          ? '꼴찌 당첨!'
          : `뒤에서 ${winners}명`
        : winners === 1
          ? '당첨!'
          : `당첨자 ${winners}명`

  const resultText =
    mode === 'team'
      ? teamList.map((t) => `[${t.name}] ${t.members.map((m) => m.name).join(', ')}`).join('\n')
      : pickedList.map((r) => `${r.rank}위 ${r.name}`).join('\n')

  const saveImage = async () => {
    try {
      const stamp = new Date()
      const subtitle = `참가자 ${total}명 · ${mapInfo?.name} 코스 · ${stamp.getFullYear()}.${String(
        stamp.getMonth() + 1,
      ).padStart(2, '0')}.${String(stamp.getDate()).padStart(2, '0')}`
      const groups =
        mode === 'team'
          ? teamList.map((t) => ({
              title: t.name,
              items: t.members.map((m) => ({ label: '', name: m.name, color: m.color })),
            }))
          : [
              {
                items: pickedList.map((r) => ({
                  label: `${r.rank}위`,
                  name: r.name,
                  color: r.color,
                })),
              },
            ]
      const blob = await buildResultImage({ heading: resultHeading, subtitle, groups })
      // 파일명은 아스키로 둔다. 한글 파일명을 흘리는 브라우저가 있다.
      const pad2 = (n) => String(n).padStart(2, '0')
      const fileStamp = `${stamp.getFullYear()}${pad2(stamp.getMonth() + 1)}${pad2(stamp.getDate())}-${pad2(
        stamp.getHours(),
      )}${pad2(stamp.getMinutes())}`
      downloadBlob(blob, `marble-race-${fileStamp}.png`)
      setToast('이미지를 저장했어요')
    } catch {
      setToast('이미지를 만들지 못했어요')
    }
  }

  const highlighted = (rank) => {
    if (mode === 'first') return rank <= winners
    if (mode === 'last') return rank > total - winners
    return false
  }

  actionsRef.current = {
    start,
    pause: () => setPhase('paused'),
    reset: resetRace,
    skip: skipToEnd,
    toggleZoom: () => setZoomed((v) => !v),
    toggleSound: () => setSoundOn((v) => !v),
    close: () => (showResult ? keepWatching() : null),
  }

  // 단축키: 마우스 없이도 진행할 수 있어야 한다
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target
      if (el && (el.closest('input, textarea, select') || el.tagName === 'BUTTON')) {
        if (e.key !== 'Escape') return
      }
      const a = actionsRef.current
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        if (phaseRef.current === 'running') a.pause()
        else a.start()
      } else if (e.key === 'Escape') {
        a.close()
      } else if (e.key === 'r' || e.key === 'ㄱ') {
        a.reset()
      } else if (e.key === 's' || e.key === 'ㄴ') {
        a.skip()
      } else if (e.key === 'z' || e.key === 'ㅋ') {
        a.toggleZoom()
      } else if (e.key === 'm' || e.key === 'ㅡ') {
        a.toggleSound()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="roulette-app flex h-[100dvh] flex-col bg-slate-950 text-slate-100 lg:flex-row">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {/* 경기장 */}
      <main className="relative min-h-[56dvh] flex-1">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`구슬 레이스 경기장. 참가자 ${total}명, 남은 구슬 ${remaining}개.`}
          className="block h-full w-full"
        />

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
                aria-pressed={speed === s}
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
            이름을 넣고 굴리면, 결승선을 통과한 순서로 결과가 정해집니다.
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
                onClick={() => fileRef.current?.click()}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
              >
                <Upload size={14} className="mr-1 inline" />불러오기
              </button>
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
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={loadFile}
            className="hidden"
          />
          <textarea
            id="names"
            value={namesText}
            disabled={locked}
            onChange={(e) => setNamesText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={'한 줄에 한 명씩\n영희*3 처럼 쓰면 3개\n영희#f43f5e 처럼 쓰면 색 지정'}
            className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400 disabled:opacity-60"
          />
          <p className="text-xs text-slate-500">
            쉼표로도 나눌 수 있습니다. <span className="text-slate-400">이름*3</span> 은 같은 이름 3개,{' '}
            <span className="text-slate-400">이름#f43f5e</span> 는 구슬 색 지정. 최대 {MAX_MARBLES}개.
            CSV·엑셀 파일도 불러올 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <span className="text-sm font-bold text-slate-300">뽑는 방식</span>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={locked}
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-xl border px-2 py-2 text-sm font-bold transition disabled:opacity-40 ${
                  mode === m.id
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{modeInfo?.hint}</p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm font-bold text-slate-300">
            <span>{mode === 'team' ? '팀 수' : '당첨 인원'}</span>
            <span className="text-amber-300">
              {mode === 'team' ? `${teams}개` : `${winners}명`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={locked}
              aria-label="줄이기"
              onClick={() =>
                mode === 'team'
                  ? setTeamCount((v) => Math.max(2, v - 1))
                  : setWinnerCount((v) => Math.max(1, v - 1))
              }
              className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold transition hover:bg-slate-700 disabled:opacity-40"
            >
              −
            </button>
            <input
              type="range"
              aria-label={mode === 'team' ? '팀 수' : '당첨 인원'}
              min={mode === 'team' ? 2 : 1}
              max={mode === 'team' ? Math.max(total, 2) : Math.max(total, 1)}
              value={mode === 'team' ? teams : winners}
              disabled={locked}
              onChange={(e) =>
                mode === 'team'
                  ? setTeamCount(Number(e.target.value))
                  : setWinnerCount(Number(e.target.value))
              }
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-amber-400 disabled:opacity-40"
            />
            <button
              type="button"
              disabled={locked}
              aria-label="늘리기"
              onClick={() =>
                mode === 'team'
                  ? setTeamCount((v) => Math.min(Math.max(total, 2), v + 1))
                  : setWinnerCount((v) => Math.min(Math.max(total, 1), v + 1))
              }
              className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold transition hover:bg-slate-700 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <span className="text-sm font-bold text-slate-300">코스</span>
          <div className="grid grid-cols-4 gap-2">
            {MAP_LIST.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={locked}
                aria-pressed={mapId === m.id}
                onClick={() => setMapId(m.id)}
                className={`rounded-xl border px-1 py-2 text-sm font-bold transition disabled:opacity-40 ${
                  mapId === m.id
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {m.name}
              </button>
            ))}
            <button
              type="button"
              disabled={locked}
              aria-pressed={mapId === 'random'}
              onClick={() => setMapId('random')}
              className={`rounded-xl border px-1 py-2 text-sm font-bold transition disabled:opacity-40 ${
                mapId === 'random'
                  ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
              }`}
            >
              랜덤
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {mapId === 'random' ? `이번 판은 ${mapInfo?.name} — ` : ''}
            {mapInfo?.desc}
          </p>
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
            <span className="text-sm font-bold text-slate-300">
              {mode === 'team' ? '팀 배정' : '순위'}
            </span>
            {results.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  copy(results.map((r) => `${r.rank}위 ${r.name}`).join('\n'), '순위를 복사했어요')
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
                    highlighted(r.rank)
                      ? 'bg-amber-400/15 font-bold text-amber-200'
                      : 'bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="w-8 shrink-0 text-right tabular-nums">{r.rank}위</span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  {mode === 'team' ? (
                    <span className="shrink-0 rounded-md bg-slate-700 px-1.5 py-0.5 text-xs font-bold text-amber-200">
                      {((r.rank - 1) % teams) + 1}팀
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {r.time.toFixed(1)}초
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <button
          type="button"
          onClick={() =>
            copy(
              encodeShare({ namesText, winnerCount: winners, mapId, mode, teamCount: teams }),
              '링크를 복사했어요',
            )
          }
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-700 py-2.5 text-sm font-bold text-slate-300 transition hover:border-slate-500"
        >
          <Link2 size={16} /> 설정 그대로 링크 복사
        </button>

        <p className="shrink-0 text-xs leading-5 text-slate-600">
          단축키 — 스페이스: 시작·일시정지 / R: 처음으로 / S: 결과 바로 보기 / Z: 확대 / M: 소리
        </p>
      </aside>

      {showResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={keepWatching}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={resultHeading}
            className="max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-slate-900 p-6 text-center shadow-2xl ring-1 ring-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Trophy size={40} className="mx-auto text-amber-300" />
            <h2 className="mt-2 font-display text-2xl text-amber-300">{resultHeading}</h2>

            {mode === 'team' ? (
              <div className="mt-4 space-y-3 text-left">
                {teamList.map((t) => (
                  <div key={t.name} className="rounded-xl bg-slate-800/70 p-3">
                    <p className="mb-1.5 font-display text-lg text-amber-200">{t.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.members.map((m) => (
                        <span
                          key={`${m.index}-${m.rank}`}
                          className="flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-sm font-bold text-slate-200"
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ol className="mt-4 space-y-1.5 text-left">
                {pickedList.map((r) => (
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
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copy(resultText, '결과를 복사했어요')}
                className="rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
              >
                결과 복사
              </button>
              <button
                type="button"
                onClick={saveImage}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
              >
                <ImageIcon size={16} /> 이미지 저장
              </button>
              <button
                type="button"
                onClick={keepWatching}
                className="col-span-2 rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
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
