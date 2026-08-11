import { useRef, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import {
  STORAGE_KEYS,
  DEFAULT_PASSWORD,
  DEFAULT_PERIODS,
  DEFAULT_BEHAVIORS,
  DETAIL_HISTORY_MAX,
} from './constants'
import { genId, getPeriodName, nowTimeStr, todayStr } from './utils'
import MainScreen from './components/MainScreen'
import TeacherPage from './components/teacher/TeacherPage'
import StudentModal from './components/StudentModal'
import RecordModal from './components/RecordModal'
import PasswordModal from './components/PasswordModal'
import Toast from './components/Toast'

export default function App() {
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  function showToast(message) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }

  function onSaveError() {
    showToast('저장에 실패했습니다')
  }

  const [students, setStudents] = useLocalStorage(STORAGE_KEYS.students, [], onSaveError)
  const [behaviors, setBehaviors] = useLocalStorage(STORAGE_KEYS.behaviors, DEFAULT_BEHAVIORS, onSaveError)
  const [periods, setPeriods] = useLocalStorage(STORAGE_KEYS.periods, DEFAULT_PERIODS, onSaveError)
  const [records, setRecords] = useLocalStorage(STORAGE_KEYS.records, [], onSaveError)
  const [password, setPassword] = useLocalStorage(STORAGE_KEYS.password, DEFAULT_PASSWORD, onSaveError)
  const [detailHistory, setDetailHistory] = useLocalStorage(STORAGE_KEYS.detailHistory, {}, onSaveError)

  const [view, setView] = useState('main') // 'main' | 'teacher'
  const [authenticated, setAuthenticated] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [studentModal, setStudentModal] = useState(null) // null | {} (add) | student (edit)
  const [recordStudent, setRecordStudent] = useState(null)

  const todayCount = records.filter((r) => r.date === todayStr()).length

  // ---- 학생 ----
  function handleAddStudent(data) {
    const student = { id: genId('s'), name: data.name, memo: data.memo, active: true }
    setStudents((prev) => [...prev, student])
    showToast('학생이 추가되었습니다')
    setStudentModal(null)
  }

  function handleUpdateStudent(data) {
    setStudents((prev) => prev.map((s) => (s.id === studentModal.id ? { ...s, ...data } : s)))
    showToast('학생 정보가 수정되었습니다')
    setStudentModal(null)
  }

  function setStudentActive(id, active) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)))
  }

  // ---- 행동 기록 ----
  function handleSaveRecord(behavior, detail) {
    const now = new Date()
    const date = todayStr(now)
    const time = nowTimeStr(now)
    const period = getPeriodName(time, periods)
    const record = {
      id: genId('r'),
      studentId: recordStudent.id,
      studentName: recordStudent.name,
      behaviorId: behavior.id,
      behaviorName: behavior.name,
      detail,
      color: behavior.color,
      date,
      time,
      period,
    }
    setRecords((prev) => [...prev, record])

    if (detail) {
      setDetailHistory((prev) => {
        const list = prev[behavior.id] || []
        const next = [detail, ...list.filter((d) => d !== detail)].slice(0, DETAIL_HISTORY_MAX)
        return { ...prev, [behavior.id]: next }
      })
    }

    showToast(`${recordStudent.name} · ${behavior.name} 기록됨 (${period})`)
    setRecordStudent(null)
  }

  function deleteRecord(id) {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  function generateTestData(newRecords) {
    setRecords((prev) => [...prev, ...newRecords])
    showToast(`테스트 데이터 ${newRecords.length}건이 생성되었습니다`)
  }

  // ---- 행동유형 ----
  function addBehavior(data) {
    setBehaviors((prev) => [...prev, { id: genId('b'), ...data }])
  }
  function updateBehavior(id, data) {
    setBehaviors((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)))
  }
  function deleteBehavior(id) {
    setBehaviors((prev) => prev.filter((b) => b.id !== id))
    setDetailHistory((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // ---- 교시 ----
  function addPeriod(data) {
    setPeriods((prev) => [...prev, { id: genId('p'), ...data }])
  }
  function updatePeriod(id, data) {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)))
  }
  function deletePeriod(id) {
    setPeriods((prev) => prev.filter((p) => p.id !== id))
  }

  // ---- 인증 ----
  function handlePasswordSubmit(value) {
    if (value === password) {
      setAuthenticated(true)
      setView('teacher')
      setShowPasswordModal(false)
      return true
    }
    return false
  }

  function lock() {
    setAuthenticated(false)
    setView('main')
  }

  function changePassword(newPw) {
    setPassword(newPw)
  }

  return (
    <>
      {view === 'main' && (
        <MainScreen
          students={students}
          todayCount={todayCount}
          onOpenRecord={(s) => setRecordStudent(s)}
          onEditStudent={(s) => setStudentModal(s)}
          onAddStudent={() => setStudentModal({})}
          onOpenTeacherPage={() => setShowPasswordModal(true)}
        />
      )}

      {view === 'teacher' && authenticated && (
        <TeacherPage
          students={students}
          behaviors={behaviors}
          periods={periods}
          records={records}
          password={password}
          onLock={lock}
          onEditStudent={(s) => setStudentModal(s)}
          onSetStudentActive={setStudentActive}
          onDeleteRecord={deleteRecord}
          onGenerateTestData={generateTestData}
          onAddBehavior={addBehavior}
          onUpdateBehavior={updateBehavior}
          onDeleteBehavior={deleteBehavior}
          onAddPeriod={addPeriod}
          onUpdatePeriod={updatePeriod}
          onDeletePeriod={deletePeriod}
          onChangePassword={changePassword}
          showToast={showToast}
        />
      )}

      {studentModal !== null && (
        <StudentModal
          student={studentModal.id ? studentModal : null}
          onSave={studentModal.id ? handleUpdateStudent : handleAddStudent}
          onClose={() => setStudentModal(null)}
        />
      )}

      {recordStudent && (
        <RecordModal
          student={recordStudent}
          behaviors={behaviors}
          detailHistory={detailHistory}
          onSave={handleSaveRecord}
          onClose={() => setRecordStudent(null)}
        />
      )}

      {showPasswordModal && (
        <PasswordModal onSubmit={handlePasswordSubmit} onClose={() => setShowPasswordModal(false)} />
      )}

      <Toast message={toast} />
    </>
  )
}
