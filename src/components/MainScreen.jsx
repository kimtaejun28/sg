import { useEffect, useState } from 'react'
import { Clock, Lock, Plus } from 'lucide-react'
import StudentCard from './StudentCard'
import { CARD_GRADIENTS } from '../constants'
import { getPeriodName, nowTimeStr, pad2 } from '../utils'

export default function MainScreen({
  students,
  periods,
  todayCount,
  onOpenRecord,
  onEditStudent,
  onAddStudent,
  onOpenTeacherPage,
}) {
  const activeStudents = students.filter((s) => s.active)

  // 교시는 분 단위로 바뀌므로 주기적으로 현재 시각을 다시 읽는다
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  const currentPeriod = getPeriodName(nowTimeStr(now), periods)
  const clock = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-6 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display text-3xl text-slate-800">도전행동 기록판</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-sky-600 shadow-sm backdrop-blur">
              <Clock size={15} />
              {clock} · {currentPeriod}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">오늘 {todayCount}건</p>
        </div>
        <button
          type="button"
          onClick={onOpenTeacherPage}
          className="flex items-center gap-1.5 rounded-2xl bg-white/80 px-4 py-2.5 font-semibold text-slate-600 shadow-sm backdrop-blur transition active:scale-95"
        >
          <Lock size={18} />
          <span>교사 페이지</span>
        </button>
      </header>

      {activeStudents.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 text-slate-400">
          <p>아래 + 버튼으로 학생을 추가해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {activeStudents.map((s, i) => (
            <StudentCard
              key={s.id}
              student={s}
              gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
              onOpen={onOpenRecord}
              onEdit={onEditStudent}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAddStudent}
        aria-label="학생 추가"
        className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500 text-white shadow-xl transition active:scale-90"
      >
        <Plus size={28} />
      </button>
    </div>
  )
}
