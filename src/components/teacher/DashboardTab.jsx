import { useMemo } from 'react'
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
import { OUT_OF_SCHEDULE, SAMPLE_DETAILS } from '../../constants'
import { sortedPeriods, genId, todayStr, pad2 } from '../../utils'

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
  const activeStudents = students.filter((s) => s.active)
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

  function handleGenerateTestData() {
    if (activeStudents.length === 0) {
      showToast('먼저 학생을 등록해주세요')
      return
    }
    if (behaviors.length === 0 || periods.length === 0) {
      showToast('먼저 행동유형과 교시를 등록해주세요')
      return
    }
    const newRecords = []
    for (let i = 0; i < 40; i++) {
      const student = activeStudents[Math.floor(Math.random() * activeStudents.length)]
      const behavior = behaviors[Math.floor(Math.random() * behaviors.length)]
      const period = periods[Math.floor(Math.random() * periods.length)]
      const time = randomTimeInPeriod(period)
      const detail = behavior.requiresDetail
        ? SAMPLE_DETAILS[Math.floor(Math.random() * SAMPLE_DETAILS.length)]
        : ''
      newRecords.push({
        id: genId('r'),
        studentId: student.id,
        studentName: student.name,
        behaviorId: behavior.id,
        behaviorName: behavior.name,
        detail,
        color: behavior.color,
        date: todayStr(),
        time,
        period: period.name,
      })
    }
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
          onClick={handleGenerateTestData}
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
