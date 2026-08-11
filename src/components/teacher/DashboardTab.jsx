import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ConfirmModal from '../ConfirmModal'
import { OUT_OF_SCHEDULE, SAMPLE_DETAILS } from '../../constants'
import { sortedPeriods, genId, todayStr, pad2, addDays, isWeekend } from '../../utils'

const TEST_DATA_DAYS = 30
const MIN_PER_STUDENT_PER_DAY = 3
const MAX_PER_STUDENT_PER_DAY = 5

// 최근 TEST_DATA_DAYS일 중 주말을 뺀 날짜들. 교실 기록이므로 등교일에만 쌓인다.
function recentSchoolDays() {
  const days = []
  for (let offset = TEST_DATA_DAYS - 1; offset >= 0; offset--) {
    const date = addDays(todayStr(), -offset)
    if (!isWeekend(date)) days.push(date)
  }
  return days
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function randomTimeInPeriod(period) {
  const [sh, sm] = period.start.split(':').map(Number)
  const [eh, em] = period.end.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const span = Math.max(endMin - startMin - 1, 0)
  const offset = span > 0 ? Math.floor(Math.random() * span) : 0
  const totalMin = startMin + offset
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const s = Math.floor(Math.random() * 60)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

export default function DashboardTab({ students, behaviors, periods, records, onGenerateTestData, showToast }) {
  const [confirmTestData, setConfirmTestData] = useState(false)
  const activeStudents = students.filter((s) => s.active)
  const schoolDays = useMemo(() => recentSchoolDays(), [])
  const totalCount = records.length
  const today = todayStr()
  const todayCount = records.filter((r) => r.date === today).length

  const topStudent = useMemo(() => {
    const counts = {}
    records.forEach((r) => {
      counts[r.studentName] = (counts[r.studentName] || 0) + 1
    })
    const entries = Object.entries(counts)
    if (entries.length === 0) return null
    entries.sort((a, b) => b[1] - a[1])
    return { name: entries[0][0], count: entries[0][1] }
  }, [records])

  const chartData = useMemo(() => {
    const order = [...sortedPeriods(periods).map((p) => p.name), OUT_OF_SCHEDULE]
    return order.map((periodName) => {
      const row = { period: periodName }
      behaviors.forEach((b) => {
        row[b.name] = records.filter((r) => r.period === periodName && r.behaviorName === b.name).length
      })
      return row
    })
  }, [periods, behaviors, records])

  function requestTestData() {
    if (activeStudents.length === 0) {
      showToast('먼저 학생을 등록해주세요')
      return
    }
    if (behaviors.length === 0 || periods.length === 0) {
      showToast('먼저 행동유형과 교시를 등록해주세요')
      return
    }
    setConfirmTestData(true)
  }

  function handleGenerateTestData() {
    setConfirmTestData(false)
    const newRecords = []
    schoolDays.forEach((date) => {
      activeStudents.forEach((student) => {
        const perDay =
          MIN_PER_STUDENT_PER_DAY +
          Math.floor(Math.random() * (MAX_PER_STUDENT_PER_DAY - MIN_PER_STUDENT_PER_DAY + 1))
        for (let i = 0; i < perDay; i++) {
          const behavior = pickRandom(behaviors)
          const period = pickRandom(periods)
          newRecords.push({
            // 한 번에 수백 건을 만들므로 genId만으로는 충돌 가능성이 있어 순번을 덧붙인다
            id: `${genId('r')}_${newRecords.length}`,
            studentId: student.id,
            studentName: student.name,
            behaviorId: behavior.id,
            behaviorName: behavior.name,
            detail: behavior.requiresDetail ? pickRandom(SAMPLE_DETAILS) : '',
            color: behavior.color,
            date,
            time: randomTimeInPeriod(period),
            period: period.name,
          })
        }
      })
    })
    onGenerateTestData(newRecords)
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="전체 기록 수" value={`${totalCount}건`} />
        <SummaryCard label="오늘 기록 수" value={`${todayCount}건`} />
        <SummaryCard
          label="최다 기록 학생"
          value={topStudent ? `${topStudent.name} (${topStudent.count}건)` : '-'}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl text-slate-700">교시별 행동 분석</h3>
        <button
          type="button"
          onClick={requestTestData}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95"
        >
          테스트 데이터 생성
        </button>
      </div>

      {records.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 text-slate-400">
          기록이 없습니다. 테스트 데이터를 생성해보세요.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white p-4 shadow-sm">
          <div style={{ minWidth: 760, height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="period"
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {behaviors.map((b) => (
                  <Bar key={b.id} dataKey={b.name} stackId="stack" fill={b.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {confirmTestData && (
        <ConfirmModal
          title="테스트 데이터 생성"
          message={
            `최근 ${TEST_DATA_DAYS}일 중 주말을 뺀 ${schoolDays.length}일 동안,\n` +
            `학생 ${activeStudents.length}명에게 하루 ${MIN_PER_STUDENT_PER_DAY}~${MAX_PER_STUDENT_PER_DAY}건씩 ` +
            `약 ${schoolDays.length * activeStudents.length * MIN_PER_STUDENT_PER_DAY}~` +
            `${schoolDays.length * activeStudents.length * MAX_PER_STUDENT_PER_DAY}건을 만듭니다.\n\n` +
            `기존 기록 ${records.length}건에 더해지며, 생성된 기록은 되돌릴 수 없습니다.\n` +
            '실제 기록이 있다면 먼저 [데이터 백업]에서 백업해 주세요.'
          }
          danger={records.length > 0}
          confirmLabel="생성"
          onConfirm={handleGenerateTestData}
          onCancel={() => setConfirmTestData(false)}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl text-slate-800">{value}</p>
    </div>
  )
}
