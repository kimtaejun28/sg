import { useState } from 'react'
import { Check } from 'lucide-react'
import Modal from './Modal'

export default function StudentModal({ student, behaviors, onSave, onClose }) {
  const isEdit = Boolean(student)
  const [name, setName] = useState(student?.name ?? '')
  const [memo, setMemo] = useState(student?.memo ?? '')
  // behaviorIds가 없으면 '전체 사용'. 이후 새 행동유형이 추가돼도 자동으로 함께 보인다.
  const [useAllBehaviors, setUseAllBehaviors] = useState(!student?.behaviorIds)
  const [selectedIds, setSelectedIds] = useState(
    student?.behaviorIds ?? behaviors.map((b) => b.id)
  )

  const canSave = name.trim() && (useAllBehaviors || selectedIds.length > 0)

  function toggleBehavior(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSave() {
    if (!canSave) return
    onSave({
      name: name.trim(),
      memo: memo.trim(),
      behaviorIds: useAllBehaviors ? null : selectedIds,
    })
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-5 text-lg font-bold text-slate-800">{isEdit ? '학생 정보 수정' : '학생 추가'}</h3>

      <label className="mb-1 block text-sm font-semibold text-slate-600">이름</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="학생 이름"
        autoFocus
        className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
      />

      <label className="mb-1 block text-sm font-semibold text-slate-600">메모 (선택)</label>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="특이사항, 지원전략 등을 적어주세요"
        rows={3}
        className="mb-4 w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
      />

      <label className="mb-1 block text-sm font-semibold text-slate-600">기록에 사용할 행동유형</label>
      <p className="mb-2 text-xs text-slate-400">
        이 학생의 기록 화면에 어떤 행동유형 버튼을 보여줄지 고릅니다. 필요한 것만 남기면 더 빨리
        기록할 수 있습니다.
      </p>

      <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
        <input
          type="checkbox"
          checked={useAllBehaviors}
          onChange={(e) => setUseAllBehaviors(e.target.checked)}
          className="h-4 w-4"
        />
        전체 행동유형 사용
      </label>

      {!useAllBehaviors && (
        <div className="mb-2 flex flex-wrap gap-2">
          {behaviors.map((b) => {
            const on = selectedIds.includes(b.id)
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBehavior(b.id)}
                style={on ? { backgroundColor: b.color } : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-95 ${
                  on ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {on && <Check size={14} />}
                {b.name}
              </button>
            )
          })}
        </div>
      )}

      {!useAllBehaviors && selectedIds.length === 0 && (
        <p className="mb-2 text-sm font-medium text-rose-500">
          최소 한 개의 행동유형을 선택해주세요
        </p>
      )}

      <button
        type="button"
        disabled={!canSave}
        onClick={handleSave}
        className="mt-3 w-full rounded-2xl bg-sky-500 py-3 font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        저장
      </button>

      {isEdit && (
        <p className="mt-4 text-center text-xs text-slate-400">
          학생 삭제는 [교사 페이지 &gt; 학생 관리]에서 가능합니다.
        </p>
      )}
    </Modal>
  )
}
