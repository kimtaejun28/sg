import { useRef, useState } from 'react'
import { Cloud, CloudOff, FileSpreadsheet, RefreshCw, TriangleAlert, Upload } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'
import { isSyncConfigured } from '../../supabase'
import { DETAIL_HISTORY_MAX, OUT_OF_SCHEDULE } from '../../constants'
import { todayStr } from '../../utils'

// 엑셀 라이브러리는 무겁고 이 탭에서만 쓰이므로, 버튼을 누른 순간에만 받아온다.
// 기록 화면이 이 때문에 느려지면 안 된다.
const loadExcel = () => import('../../excel')

// 손상되거나 다른 앱에서 만든 파일을 그대로 state에 넣으면 앱이 깨지므로,
// 필드 단위로 검사하고 빠진 값은 안전한 기본값으로 채운다.
function normalizeBackup(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const asArray = (value) => (Array.isArray(value) ? value : [])
  const asString = (value, fallback = '') => (typeof value === 'string' ? value : fallback)

  const students = asArray(raw.students)
    .filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string')
    .map((s) => ({
      id: s.id,
      name: s.name,
      memo: asString(s.memo),
      // 학생별 행동유형 제한. 배열이 아니면 '전체 사용'으로 둔다
      behaviorIds: Array.isArray(s.behaviorIds)
        ? s.behaviorIds.filter((id) => typeof id === 'string')
        : null,
      priorityBehaviorIds: Array.isArray(s.priorityBehaviorIds)
        ? s.priorityBehaviorIds.filter((id) => typeof id === 'string')
        : [],
      active: s.active !== false,
    }))

  const behaviors = asArray(raw.behaviors)
    .filter((b) => b && typeof b.id === 'string' && typeof b.name === 'string')
    .map((b) => ({
      id: b.id,
      name: b.name,
      color: asString(b.color, '#3B82C4'),
      requiresDetail: b.requiresDetail === true,
    }))

  const periods = asArray(raw.periods)
    .filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        /^\d{2}:\d{2}$/.test(p.start) &&
        /^\d{2}:\d{2}$/.test(p.end)
    )
    .map((p) => ({ id: p.id, name: p.name, start: p.start, end: p.end }))

  const records = asArray(raw.records)
    .filter(
      (r) =>
        r &&
        typeof r.id === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        typeof r.time === 'string'
    )
    .map((r) => ({
      id: r.id,
      studentId: asString(r.studentId),
      studentName: asString(r.studentName),
      behaviorId: asString(r.behaviorId),
      behaviorName: asString(r.behaviorName),
      detail: asString(r.detail),
      color: asString(r.color, '#94A3B8'),
      date: r.date,
      time: r.time,
      period: asString(r.period, OUT_OF_SCHEDULE),
      isTest: r.isTest === true,
    }))

  // 네 종류가 모두 비어 있으면 백업 파일로 보기 어렵다
  if (!students.length && !behaviors.length && !periods.length && !records.length) return null

  const detailHistory = {}
  if (raw.detailHistory && typeof raw.detailHistory === 'object' && !Array.isArray(raw.detailHistory)) {
    Object.entries(raw.detailHistory).forEach(([behaviorId, list]) => {
      if (!Array.isArray(list)) return
      detailHistory[behaviorId] = list
        .filter((item) => typeof item === 'string')
        .slice(0, DETAIL_HISTORY_MAX)
    })
  }

  return {
    students,
    behaviors,
    periods,
    records,
    detailHistory,
    password: typeof raw.password === 'string' && raw.password ? raw.password : null,
  }
}

const SYNC_LABEL = {
  syncing: { text: '동기화 중…', tone: 'text-sky-600', Icon: RefreshCw, spin: true },
  synced: { text: '다른 기기와 동기화됨', tone: 'text-emerald-600', Icon: Cloud },
  error: { text: '동기화에 실패했습니다', tone: 'text-rose-600', Icon: TriangleAlert },
}

function SyncCard({ status, email, onSignOut }) {
  // 동기화를 아예 설정하지 않은 경우와, 설정했지만 로그인하지 않은 경우를 나눠 안내한다
  if (!isSyncConfigured || !email) {
    return (
      <div className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-sm">
        <CloudOff size={20} className="mt-0.5 shrink-0 text-slate-400" />
        <div>
          <p className="font-semibold text-slate-700">이 기기에만 저장 중</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {isSyncConfigured
              ? '로그인하면 다른 기기에서도 같은 기록을 볼 수 있습니다. 로그인하려면 앱을 새로고침해 주세요.'
              : '기기 간 동기화가 설정되어 있지 않습니다. 다른 기기로 옮기려면 아래에서 백업 파일을 사용하세요.'}
          </p>
        </div>
      </div>
    )
  }

  const label = SYNC_LABEL[status] ?? SYNC_LABEL.syncing
  const { Icon } = label

  return (
    <div className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-sm">
      <Icon size={20} className={`mt-0.5 shrink-0 ${label.tone} ${label.spin ? 'animate-spin' : ''}`} />
      <div className="flex-1">
        <p className={`font-semibold ${label.tone}`}>{label.text}</p>
        <p className="mt-1 text-sm text-slate-500">{email}</p>
        {status === 'error' && (
          <p className="mt-1 text-sm text-slate-500">
            인터넷 연결을 확인해주세요. 기록은 이 기기에 그대로 저장되어 있고, 연결되면 다시
            올라갑니다.
          </p>
        )}
      </div>
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition active:scale-95"
        >
          로그아웃
        </button>
      )}
    </div>
  )
}

export default function DataTab({
  students,
  behaviors,
  periods,
  records,
  password,
  detailHistory,
  onRestore,
  onClearRecords,
  syncStatus,
  syncEmail,
  onSignOut,
  showToast,
}) {
  const [pending, setPending] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef(null)

  function backupPayload() {
    return {
      exportedAt: new Date().toISOString(),
      students,
      behaviors,
      periods,
      records,
      password,
      detailHistory,
    }
  }

  async function handleExportXlsx() {
    try {
      const { exportBackupXlsx } = await loadExcel()
      await exportBackupXlsx(backupPayload(), `도전행동기록_백업_${todayStr()}.xlsx`)
      showToast('엑셀 파일이 저장되었습니다')
    } catch {
      showToast('엑셀 파일을 만들지 못했습니다')
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 연속으로 고를 수 있게 초기화
    if (!file) return
    if (!/\.xlsx$/i.test(file.name)) {
      showToast('엑셀(.xlsx) 백업 파일을 선택해주세요')
      return
    }
    try {
      const { parseBackupXlsx } = await loadExcel()
      const data = normalizeBackup(await parseBackupXlsx(file))
      if (!data) {
        showToast('백업 파일 형식이 올바르지 않습니다')
        return
      }
      setPending({ data, fileName: file.name })
    } catch {
      showToast('파일을 읽을 수 없습니다')
    }
  }

  function handleRestoreConfirm() {
    onRestore(pending.data)
    setPending(null)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SyncCard status={syncStatus} email={syncEmail} onSignOut={onSignOut} />

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-display text-lg text-slate-700">백업 파일 내보내기</h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">
          학생·기록·행동유형·교시 설정을 파일 하나로 저장합니다. 기기를 바꾸거나 브라우저 데이터가
          지워졌을 때 이 파일로 되돌릴 수 있으니, 주기적으로 내려받아 보관해 주세요.
        </p>
        <div className="mb-4 flex flex-wrap gap-2 text-sm text-slate-500">
          <span className="rounded-xl bg-slate-100 px-3 py-1.5">학생 {students.length}명</span>
          <span className="rounded-xl bg-slate-100 px-3 py-1.5">기록 {records.length}건</span>
          <span className="rounded-xl bg-slate-100 px-3 py-1.5">행동유형 {behaviors.length}개</span>
          <span className="rounded-xl bg-slate-100 px-3 py-1.5">교시 {periods.length}개</span>
        </div>
        <button
          type="button"
          onClick={handleExportXlsx}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 font-bold text-white transition active:scale-95"
        >
          <FileSpreadsheet size={18} />
          엑셀 파일로 내보내기
        </button>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          학생·기록·행동유형·교시가 시트별로 나뉘어 있어 엑셀에서 바로 열어 볼 수 있고, 그대로 다시
          불러오는 것도 됩니다.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-display text-lg text-slate-700">백업 파일 불러오기</h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">
          내보낸 엑셀 파일을 선택하면 현재 데이터를 파일의 내용으로 되돌립니다.
          <span className="font-semibold text-rose-500"> 지금 저장된 내용은 모두 대체되니</span> 먼저
          위에서 백업을 받아두시길 권합니다.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 font-bold text-slate-600 transition active:scale-95"
        >
          <Upload size={18} />
          백업 파일 선택
        </button>
      </div>

      <div className="rounded-3xl border-2 border-rose-100 bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-display text-lg text-rose-600">기록 전체 삭제</h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">
          지금까지 쌓인 기록 {records.length}건을 모두 지웁니다. 학생·행동유형·교시 설정은 그대로
          남습니다. 대시보드의 [테스트 데이터 삭제]로 지워지지 않는 예전 테스트 기록을 정리할 때
          사용하세요.
        </p>
        <button
          type="button"
          disabled={records.length === 0}
          onClick={() => setConfirmClear(true)}
          className="w-full rounded-2xl bg-rose-500 py-3 font-bold text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
        >
          기록 전체 삭제
        </button>
      </div>

      <p className="px-2 text-xs leading-relaxed text-slate-400">
        백업 파일에는 학생 이름과 교사 페이지 비밀번호가 그대로 담깁니다. 외부로 전송하지 말고 개인
        기기에만 보관해 주세요.
      </p>

      {confirmClear && (
        <ConfirmModal
          title="기록 전체 삭제"
          message={
            `기록 ${records.length}건을 모두 지웁니다.\n` +
            '되돌릴 수 없으니 먼저 위에서 백업 파일을 받아두세요.\n\n' +
            '학생·행동유형·교시 설정은 지워지지 않습니다.'
          }
          confirmLabel="모두 삭제"
          onConfirm={() => {
            onClearRecords()
            setConfirmClear(false)
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {pending && (
        <ConfirmModal
          title="백업 불러오기"
          message={
            `'${pending.fileName}' 파일의 내용으로 되돌립니다.\n\n` +
            `학생 ${students.length}명 → ${pending.data.students.length}명\n` +
            `기록 ${records.length}건 → ${pending.data.records.length}건\n` +
            `행동유형 ${behaviors.length}개 → ${pending.data.behaviors.length}개\n` +
            `교시 ${periods.length}개 → ${pending.data.periods.length}개\n\n` +
            (pending.data.password
              ? '교사 페이지 비밀번호도 백업 시점의 값으로 바뀝니다.\n\n'
              : '') +
            '현재 데이터는 복구할 수 없습니다. 계속할까요?'
          }
          confirmLabel="불러오기"
          onConfirm={handleRestoreConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
