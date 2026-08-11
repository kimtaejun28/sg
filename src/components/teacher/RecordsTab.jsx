import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, PenLine, Trash2 } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'
import DetailEditModal from '../DetailEditModal'
import {
  addDays,
  addMonths,
  daysInRange,
  downloadCsv,
  getISOWeekNumber,
  getMonthRange,
  getWeekRange,
  inDateRange,
  todayStr,
  weekdayLabel,
} from '../../utils'
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

const PERIOD_FILTER_LABELS = {
  all: '전체',
  today: '오늘',
  date: '날짜 지정',
  week: '주간',
  month: '월간',
}

export default function RecordsTab({
  students,
  behaviors,
  records,
  detailHistory,
  onDeleteRecord,
  onUpdateDetail,
  showToast,
}) {
  const [studentFilter, setStudentFilter] = useState('all')
  const [behaviorFilter, setBehaviorFilter] = useState('all')
  const [periodFilterType, setPeriodFilterType] = useState('all')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [selectedMonth, setSelectedMonth] = useState(todayStr().slice(0, 7))
  const [sortAsc, setSortAsc] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [onlyMissingDetail, setOnlyMissingDetail] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(true)

  // 선택된 기간의 시작·종료일. '전체'만 구간이 고정되지 않으므로 null이고,
  // 이 경우 요약 영역이 기록에서 직접 범위를 도출한다.
  const range = useMemo(() => {
    if (periodFilterType === 'week') return getWeekRange(selectedDate)
    if (periodFilterType === 'month') return getMonthRange(selectedMonth)
    if (periodFilterType === 'date') return { start: selectedDate, end: selectedDate }
    if (periodFilterType === 'today') {
      const today = todayStr()
      return { start: today, end: today }
    }
    return null
  }, [periodFilterType, selectedDate, selectedMonth])

  const baseFiltered = useMemo(() => {
    return records.filter((r) => {
      if (studentFilter !== 'all' && r.studentId !== studentFilter) return false
      if (behaviorFilter !== 'all' && r.behaviorId !== behaviorFilter) return false
      if (onlyMissingDetail && r.detail) return false
      if (periodFilterType === 'today') return r.date === todayStr()
      if (periodFilterType === 'date') return r.date === selectedDate
      if (periodFilterType === 'week' || periodFilterType === 'month') {
        return inDateRange(r.date, range.start, range.end)
      }
      return true
    })
  }, [records, studentFilter, behaviorFilter, periodFilterType, selectedDate, range, onlyMissingDetail])

  const sorted = useMemo(() => {
    const arr = [...baseFiltered].sort((a, b) => {
      const ka = a.date + a.time
      const kb = b.date + b.time
      if (ka < kb) return sortAsc ? -1 : 1
      if (ka > kb) return sortAsc ? 1 : -1
      return 0
    })
    return arr
  }, [baseFiltered, sortAsc])

  function resetToAll() {
    setPeriodFilterType('all')
  }

  function shiftDate(days) {
    setSelectedDate((d) => addDays(d, days))
  }
  function shiftMonth(months) {
    setSelectedMonth((m) => addMonths(m, months))
  }

  function handleDeleteConfirm() {
    onDeleteRecord(deleteTarget.id)
    setDeleteTarget(null)
    showToast('기록이 삭제되었습니다')
  }

  function csvFilename() {
    const today = todayStr()
    if (periodFilterType === 'all') return `행동기록_전체_${today}.csv`
    if (periodFilterType === 'today') return `행동기록_${today}.csv`
    if (periodFilterType === 'date') return `행동기록_${selectedDate}.csv`
    if (periodFilterType === 'week') return `행동기록_${range.start}_${range.end}.csv`
    if (periodFilterType === 'month') return `행동기록_${selectedMonth}.csv`
    return `행동기록_${today}.csv`
  }

  function handleDownloadCsv() {
    const header = ['학생명', '행동유형', '상세내용', '날짜', '시간', '교시']
    const rows = sorted.map((r) => [r.studentName, r.behaviorName, r.detail, r.date, r.time, r.period])
    downloadCsv([header, ...rows], csvFilename())
    showToast('CSV 파일이 다운로드되었습니다')
  }

  const missingDetailCount = records.filter((r) => !r.detail).length
  const showEmptyState = periodFilterType !== 'all' && sorted.length === 0

  return (
    <div>
      {/* 필터 바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">전체 학생</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {!s.active ? ' (비활성)' : ''}
            </option>
          ))}
        </select>

        <select
          value={behaviorFilter}
          onChange={(e) => setBehaviorFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">전체 행동</option>
          {behaviors.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={periodFilterType}
          onChange={(e) => setPeriodFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {Object.entries(PERIOD_FILTER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSortAsc((v) => !v)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition active:scale-95"
        >
          {sortAsc ? '이른 시간순' : '최근 시간순'}
        </button>

        <button
          type="button"
          onClick={() => setOnlyMissingDetail((v) => !v)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-95 ${
            onlyMissingDetail
              ? 'border-amber-300 bg-amber-100 text-amber-700'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          상세 미작성{missingDetailCount > 0 && ` ${missingDetailCount}`}
        </button>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
        >
          <Download size={16} />
          CSV 다운로드
        </button>
      </div>

      {/* 날짜 선택 바 */}
      {periodFilterType === 'date' && (
        <div className="mb-4 flex items-center gap-2">
          <button type="button" onClick={() => shiftDate(-1)} className="rounded-lg bg-white p-2 shadow-sm active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => shiftDate(1)} className="rounded-lg bg-white p-2 shadow-sm active:scale-95">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm text-slate-500">이전날 / 다음날</span>
        </div>
      )}

      {periodFilterType === 'week' && range && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => shiftDate(-7)} className="rounded-lg bg-white p-2 shadow-sm active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => shiftDate(7)} className="rounded-lg bg-white p-2 shadow-sm active:scale-95">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm font-semibold text-slate-600">
            {range.start} ~ {range.end} ({getISOWeekNumber(selectedDate)}주차)
          </span>
        </div>
      )}

      {periodFilterType === 'month' && (
        <div className="mb-4 flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg bg-white p-2 shadow-sm active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg bg-white p-2 shadow-sm active:scale-95">
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {showEmptyState ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 text-slate-400">
          <p>선택한 기간에 기록이 없습니다</p>
          <button
            type="button"
            onClick={resetToAll}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
          >
            전체 기간 보기
          </button>
        </div>
      ) : (
        <>
          {sorted.length > 0 && (
            <BehaviorSummary
              records={sorted}
              students={students}
              behaviors={behaviors}
              range={range}
              periodFilterType={periodFilterType}
              selectedMonth={selectedMonth}
              open={summaryOpen}
              onToggle={() => setSummaryOpen((v) => !v)}
            />
          )}

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">학생</th>
                    <th className="px-4 py-3 text-left font-semibold">행동</th>
                    <th className="px-4 py-3 text-left font-semibold">상세내용</th>
                    <th className="px-4 py-3 text-left font-semibold">날짜</th>
                    <th
                      className="cursor-pointer select-none px-4 py-3 text-left font-semibold"
                      onClick={() => setSortAsc((v) => !v)}
                    >
                      <span className="inline-flex items-center gap-1">
                        시간
                        {sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">교시</th>
                    <th className="px-4 py-3 text-left font-semibold">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        표시할 기록이 없습니다
                      </td>
                    </tr>
                  ) : (
                    sorted.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{r.studentName}</td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                            style={{ backgroundColor: r.color }}
                          >
                            {r.behaviorName}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setEditTarget(r)}
                            className="text-left transition active:scale-95"
                          >
                            {r.detail ? (
                              <span className="text-slate-500">{r.detail}</span>
                            ) : (
                              <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">
                                작성하기
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{r.date}</td>
                        <td className="px-4 py-3 text-slate-500">{r.time}</td>
                        <td className="px-4 py-3 text-slate-500">{r.period}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setEditTarget(r)}
                              aria-label="상세내용 작성"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 active:scale-90"
                            >
                              <PenLine size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              aria-label="기록 삭제"
                              className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-50 active:scale-90"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editTarget && (
        <DetailEditModal
          record={editTarget}
          detailHistory={detailHistory}
          onSave={(id, detail) => {
            onUpdateDetail(id, detail)
            setEditTarget(null)
            showToast(detail ? '상세내용이 저장되었습니다' : '상세내용을 비웠습니다')
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="기록 삭제"
          message={`${deleteTarget.studentName} · ${deleteTarget.behaviorName} (${deleteTarget.detail || '내용 없음'}) - ${deleteTarget.date} ${deleteTarget.time} 기록을 삭제할까요?`}
          confirmLabel="삭제"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function BehaviorSummary({ records, students, behaviors, range, periodFilterType, selectedMonth, open, onToggle }) {
  // 학생 등록(추가) 순서로 정렬한다. students에 없는 학생(과거 기록 등)은 뒤로 밀고,
  // 순위가 같으면 기록에 먼저 등장한 순서를 유지한다(sort는 안정 정렬).
  const studentNames = useMemo(() => {
    const rankByName = new Map()
    records.forEach((r) => {
      if (rankByName.has(r.studentName)) return
      const index = students.findIndex((s) => s.id === r.studentId)
      rankByName.set(r.studentName, index === -1 ? Number.MAX_SAFE_INTEGER : index)
    })
    return [...rankByName.keys()].sort((a, b) => rankByName.get(a) - rankByName.get(b))
  }, [records, students])

  const counts = useMemo(() => {
    const map = {}
    studentNames.forEach((name) => {
      map[name] = {}
      behaviors.forEach((b) => {
        map[name][b.id] = 0
      })
    })
    records.forEach((r) => {
      if (map[r.studentName] && r.behaviorId in map[r.studentName]) {
        map[r.studentName][r.behaviorId] += 1
      }
    })
    return map
  }, [records, studentNames, behaviors])

  const columnTotals = useMemo(() => {
    const totals = {}
    behaviors.forEach((b) => {
      totals[b.id] = studentNames.reduce((sum, name) => sum + (counts[name]?.[b.id] || 0), 0)
    })
    return totals
  }, [behaviors, studentNames, counts])

  const rowTotals = useMemo(() => {
    const totals = {}
    studentNames.forEach((name) => {
      totals[name] = behaviors.reduce((sum, b) => sum + (counts[name]?.[b.id] || 0), 0)
    })
    return totals
  }, [studentNames, behaviors, counts])

  const grandTotal = records.length
  const maxCell = Math.max(1, ...studentNames.flatMap((name) => behaviors.map((b) => counts[name]?.[b.id] || 0)))

  const topStudentEntry = useMemo(() => {
    const entries = Object.entries(rowTotals)
    if (entries.length === 0) return null
    entries.sort((a, b) => b[1] - a[1])
    return entries[0]
  }, [rowTotals])

  const topBehaviorEntry = useMemo(() => {
    let best = null
    behaviors.forEach((b) => {
      const total = columnTotals[b.id] || 0
      if (!best || total > best.total) best = { name: b.name, total }
    })
    return best && best.total > 0 ? best : null
  }, [behaviors, columnTotals])

  // '전체'는 구간이 정해져 있지 않으므로 기록이 있는 날짜만 모은다.
  // 달력상의 모든 날을 채우면 기간이 길 때 막대가 수백 개로 불어난다.
  const dateList = useMemo(() => {
    if (range) return daysInRange(range.start, range.end)
    return [...new Set(records.map((r) => r.date))].sort()
  }, [range, records])

  const periodLabel = useMemo(() => {
    if (periodFilterType === 'month') {
      return `${selectedMonth.slice(0, 4)}년 ${Number(selectedMonth.slice(5, 7))}월`
    }
    if (periodFilterType === 'today') return `오늘 (${range.start})`
    if (periodFilterType === 'date') return range.start
    if (periodFilterType === 'week') return `${range.start} ~ ${range.end}`
    if (dateList.length === 0) return '전체 기간'
    if (dateList.length === 1) return `전체 기간 (${dateList[0]})`
    return `전체 기간 (${dateList[0]} ~ ${dateList[dateList.length - 1]})`
  }, [periodFilterType, selectedMonth, range, dateList])

  const trendData = useMemo(() => {
    return dateList.map((date) => {
      const row = {
        date,
        label:
          periodFilterType === 'week'
            ? weekdayLabel(date)
            : periodFilterType === 'month'
              ? String(Number(date.slice(8, 10)))
              : date.slice(5),
      }
      behaviors.forEach((b) => {
        row[b.name] = records.filter((r) => r.date === date && r.behaviorId === b.id).length
      })
      return row
    })
  }, [dateList, behaviors, records, periodFilterType])

  return (
    <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-display text-lg text-slate-700">행동 빈도 요약</h3>
        {open ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>

      {open && (
        <div className="mt-3">
          <p className="mb-4 text-sm text-slate-500">
            {periodLabel} · 총 {grandTotal}건
            {topStudentEntry && ` · 최다 학생 ${topStudentEntry[0]}(${topStudentEntry[1]}건)`}
            {topBehaviorEntry && ` · 최다 행동 ${topBehaviorEntry.name}(${topBehaviorEntry.total}건)`}
          </p>

          {studentNames.length === 0 ? (
            <p className="mb-4 text-sm text-slate-400">해당 기간에 기록이 없습니다.</p>
          ) : (
            <div className="mb-6 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">학생</th>
                    {behaviors.map((b) => (
                      <th key={b.id} className="px-3 py-2 text-center font-semibold">
                        <span
                          className="inline-block rounded-full px-2.5 py-1 text-xs font-bold text-white"
                          style={{ backgroundColor: b.color }}
                        >
                          {b.name}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold text-slate-500">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {studentNames.map((name) => (
                    <tr key={name} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700">{name}</td>
                      {behaviors.map((b) => {
                        const val = counts[name]?.[b.id] || 0
                        const alpha = val === 0 ? 0 : 0.15 + 0.65 * (val / maxCell)
                        return (
                          <td
                            key={b.id}
                            className="px-3 py-2 text-center"
                            style={val > 0 ? { backgroundColor: `${b.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}` } : undefined}
                          >
                            {val === 0 ? <span className="text-slate-300">-</span> : val}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-center font-bold text-slate-700">{rowTotals[name]}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                    <td className="px-3 py-2 text-slate-700">합계</td>
                    {behaviors.map((b) => (
                      <td key={b.id} className="px-3 py-2 text-center text-slate-700">
                        {columnTotals[b.id]}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-slate-800">{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 하루짜리 기간(오늘·날짜 지정)은 막대가 하나뿐이라 추이로서 의미가 없다 */}
          {dateList.length > 1 && (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(480, dateList.length * 34), height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {behaviors.map((b) => (
                    <Bar key={b.id} dataKey={b.name} stackId="trend" fill={b.color} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  )
}
