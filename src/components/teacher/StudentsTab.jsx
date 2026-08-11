import { useState } from 'react'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'

export default function StudentsTab({ students, onEditStudent, onSetActive, showToast }) {
  const [confirmTarget, setConfirmTarget] = useState(null)

  function handleConfirm() {
    onSetActive(confirmTarget.id, false)
    showToast(`${confirmTarget.name} 학생이 비활성화되었습니다`)
    setConfirmTarget(null)
  }

  function handleRestore(student) {
    onSetActive(student.id, true)
    showToast(`${student.name} 학생이 복원되었습니다`)
  }

  if (students.length === 0) {
    return <p className="text-center text-slate-400">등록된 학생이 없습니다.</p>
  }

  return (
    <div className="space-y-3">
      {students.map((s) => (
        <div
          key={s.id}
          className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm ${
            s.active ? 'border-transparent bg-white' : 'border-dashed border-slate-300 bg-slate-50 opacity-70'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg text-slate-800">{s.name}</span>
              {!s.active && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  비활성
                </span>
              )}
            </div>
            {s.memo && <p className="mt-1 text-sm text-slate-500">{s.memo}</p>}
          </div>
          <div className="flex gap-2">
            {s.active ? (
              <>
                <button
                  type="button"
                  onClick={() => onEditStudent(s)}
                  className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition active:scale-95"
                >
                  <Pencil size={14} />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(s)}
                  className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-500 transition active:scale-95"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleRestore(s)}
                className="flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-600 transition active:scale-95"
              >
                <RotateCcw size={14} />
                복원
              </button>
            )}
          </div>
        </div>
      ))}

      {confirmTarget && (
        <ConfirmModal
          title="학생 비활성화"
          message={`'${confirmTarget.name}' 학생을 비활성화할까요?\n메인 화면에서 숨겨지며, 기존 기록은 그대로 보존됩니다.`}
          confirmLabel="비활성화"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}
