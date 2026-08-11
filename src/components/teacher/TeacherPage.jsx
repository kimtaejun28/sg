import { useState } from 'react'
import { Unlock } from 'lucide-react'
import DashboardTab from './DashboardTab'
import RecordsTab from './RecordsTab'
import StudentsTab from './StudentsTab'
import BehaviorsTab from './BehaviorsTab'
import PeriodsTab from './PeriodsTab'
import SecurityTab from './SecurityTab'

const TABS = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'records', label: '기록 관리' },
  { key: 'students', label: '학생 관리' },
  { key: 'behaviors', label: '행동유형' },
  { key: 'periods', label: '교시 설정' },
  { key: 'security', label: '보안' },
]

export default function TeacherPage({
  students,
  behaviors,
  periods,
  records,
  password,
  onLock,
  onEditStudent,
  onSetStudentActive,
  onDeleteRecord,
  onGenerateTestData,
  onAddBehavior,
  onUpdateBehavior,
  onDeleteBehavior,
  onAddPeriod,
  onUpdatePeriod,
  onDeletePeriod,
  onChangePassword,
  showToast,
}) {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-slate-800">교사 페이지</h1>
        <button
          type="button"
          onClick={onLock}
          className="flex items-center gap-1.5 rounded-2xl bg-white/80 px-4 py-2.5 font-semibold text-slate-600 shadow-sm backdrop-blur transition active:scale-95"
        >
          <Unlock size={18} />
          대시보드 잠금
        </button>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${
              tab === t.key ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/70 text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <DashboardTab
          students={students}
          behaviors={behaviors}
          periods={periods}
          records={records}
          onGenerateTestData={onGenerateTestData}
          showToast={showToast}
        />
      )}
      {tab === 'records' && (
        <RecordsTab
          students={students}
          behaviors={behaviors}
          records={records}
          onDeleteRecord={onDeleteRecord}
          showToast={showToast}
        />
      )}
      {tab === 'students' && (
        <StudentsTab
          students={students}
          onEditStudent={onEditStudent}
          onSetActive={onSetStudentActive}
          showToast={showToast}
        />
      )}
      {tab === 'behaviors' && (
        <BehaviorsTab
          behaviors={behaviors}
          onAdd={onAddBehavior}
          onUpdate={onUpdateBehavior}
          onDelete={onDeleteBehavior}
          showToast={showToast}
        />
      )}
      {tab === 'periods' && (
        <PeriodsTab
          periods={periods}
          onAdd={onAddPeriod}
          onUpdate={onUpdatePeriod}
          onDelete={onDeletePeriod}
          showToast={showToast}
        />
      )}
      {tab === 'security' && (
        <SecurityTab password={password} onChangePassword={onChangePassword} showToast={showToast} />
      )}
    </div>
  )
}
