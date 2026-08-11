import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useAuthSession } from './hooks/useAuthSession'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { getSupabase, isSyncConfigured } from './supabase'
import LoginScreen from './components/LoginScreen'
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

  // ---- 기기 간 동기화 ----
  const { session, loading: sessionLoading } = useAuthSession()
  const [skipLogin, setSkipLogin] = useState(false)

  const syncState = useMemo(
    () => ({ students, behaviors, periods, records, password, detailHistory }),
    [students, behaviors, periods, records, password, detailHistory]
  )

  const applyRemote = useCallback(
    (remote) => {
      setStudents(remote.students)
      setBehaviors(remote.behaviors)
      setPeriods(remote.periods)
      setRecords(remote.records)
      setDetailHistory(remote.detailHistory)
      if (remote.password) setPassword(remote.password)
    },
    [setStudents, setBehaviors, setPeriods, setRecords, setDetailHistory, setPassword]
  )

  const syncStatus = useSupabaseSync({
    enabled: Boolean(session),
    state: syncState,
    applyRemote,
  })

  const [view, setView] = useState('main') // 'main' | 'teacher'
  const [authenticated, setAuthenticated] = useState(false)

  async function signOut() {
    await getSupabase().auth.signOut()
    setSkipLogin(false)
    setAuthenticated(false)
    setView('main')
  }

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [studentModal, setStudentModal] = useState(null) // null | {} (add) | student (edit)
  const [recordStudent, setRecordStudent] = useState(null)

  const todayCount = records.filter((r) => r.date === todayStr()).length

  // ---- 학생 ----
  function handleAddStudent(data) {
    const student = {
      id: genId('s'),
      name: data.name,
      memo: data.memo,
      behaviorIds: data.behaviorIds,
      priorityBehaviorIds: data.priorityBehaviorIds,
      active: true,
    }
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
  // 입력한 문구를 유형별 최근 목록 맨 앞으로 올린다(중복 제거, 최대 DETAIL_HISTORY_MAX개)
  function rememberDetail(behaviorId, detail) {
    if (!detail) return
    setDetailHistory((prev) => {
      const list = prev[behaviorId] || []
      const next = [detail, ...list.filter((d) => d !== detail)].slice(0, DETAIL_HISTORY_MAX)
      return { ...prev, [behaviorId]: next }
    })
  }

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

    rememberDetail(behavior.id, detail)

    showToast(`${recordStudent.name} · ${behavior.name} 기록됨 (${period})`)
    setRecordStudent(null)
  }

  function deleteRecord(id) {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  // 급하게 유형만 남긴 기록의 상세내용을 교사 페이지에서 나중에 채운다
  function updateRecordDetail(id, detail) {
    const target = records.find((r) => r.id === id)
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, detail } : r)))
    if (detail && target) {
      rememberDetail(target.behaviorId, detail)
    }
  }

  function generateTestData(newRecords) {
    setRecords((prev) => [...prev, ...newRecords])
    showToast(`테스트 데이터 ${newRecords.length}건이 생성되었습니다`)
  }

  function deleteTestData() {
    const removed = records.filter((r) => r.isTest).length
    setRecords((prev) => prev.filter((r) => !r.isTest))
    showToast(`테스트 데이터 ${removed}건이 삭제되었습니다`)
  }

  function clearRecords() {
    const removed = records.length
    setRecords([])
    showToast(`기록 ${removed}건이 삭제되었습니다`)
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

  // ---- 백업 복원 ----
  function restoreBackup(data) {
    setStudents(data.students)
    setBehaviors(data.behaviors)
    setPeriods(data.periods)
    setRecords(data.records)
    setDetailHistory(data.detailHistory)
    if (data.password) setPassword(data.password)
    showToast(`백업을 불러왔습니다 (기록 ${data.records.length}건)`)
  }

  // 동기화를 설정해 두었다면 로그인 여부를 먼저 확인한다.
  // 설정하지 않았으면 이 화면은 아예 나오지 않고 기존처럼 이 기기에만 저장한다.
  if (isSyncConfigured && sessionLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">불러오는 중…</div>
  }
  if (isSyncConfigured && !session && !skipLogin) {
    return <LoginScreen onUseLocalOnly={() => setSkipLogin(true)} />
  }

  return (
    <>
      {view === 'main' && (
        <MainScreen
          students={students}
          periods={periods}
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
          onDeleteTestData={deleteTestData}
          onClearRecords={clearRecords}
          onAddBehavior={addBehavior}
          onUpdateBehavior={updateBehavior}
          onDeleteBehavior={deleteBehavior}
          onAddPeriod={addPeriod}
          onUpdatePeriod={updatePeriod}
          onDeletePeriod={deletePeriod}
          onChangePassword={changePassword}
          detailHistory={detailHistory}
          syncStatus={syncStatus}
          syncEmail={session?.user?.email ?? null}
          onSignOut={session ? signOut : null}
          onUpdateRecordDetail={updateRecordDetail}
          onRestoreBackup={restoreBackup}
          showToast={showToast}
        />
      )}

      {studentModal !== null && (
        <StudentModal
          student={studentModal.id ? studentModal : null}
          behaviors={behaviors}
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
