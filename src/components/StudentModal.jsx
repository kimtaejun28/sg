import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Star } from 'lucide-react'
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
  const [priorityIds, setPriorityIds] = useState(student?.priorityBehaviorIds ?? [])

  // 이 학생이 쓸 수 있는 유형. 주요 행동은 이 안에서만 고를 수 있다.
  const availableBehaviors = useAllBehaviors
    ? behaviors
    : behaviors.filter((b) => selectedIds.includes(b.id))

  // 주요 행동은 priorityIds에 담긴 순서 그대로, 나머지는 원래 목록 순서로 보여준다
  const orderedPriority = priorityIds
    .map((id) => availableBehaviors.find((b) => b.id === id))
    .filter(Boolean)
  const restBehaviors = availableBehaviors.filter((b) => !priorityIds.includes(b.id))

  const canSave = name.trim() && (useAllBehaviors || selectedIds.length > 0)

  function toggleBehavior(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    // 쓰지 않는 유형이 주요 행동으로 남아 있으면 안 된다
    setPriorityIds((prev) => prev.filter((x) => x !== id || !selectedIds.includes(id)))
  }

  function togglePriority(id) {
    setPriorityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // 배열 순서가 곧 기록 화면에 나오는 순서다
  function movePriority(index, direction) {
    setPriorityIds((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function handleSave() {
    if (!canSave) return
    const availableIds = availableBehaviors.map((b) => b.id)
    onSave({
      name: name.trim(),
      memo: memo.trim(),
      behaviorIds: useAllBehaviors ? null : selectedIds,
      priorityBehaviorIds: priorityIds.filter((id) => availableIds.includes(id)),
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

      {availableBehaviors.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50/60 p-3">
          <label className="mb-1 block text-sm font-semibold text-slate-600">주요 행동</label>
          <p className="mb-2 text-xs text-slate-400">
            별을 누른 행동이 기록 화면 맨 위에 먼저 나옵니다. 화살표로 순서를 바꿀 수 있습니다.
          </p>

          {orderedPriority.length > 0 && (
            <div className="mb-3 space-y-2">
              {orderedPriority.map((b, i) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 shadow-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold text-slate-700">
                    {b.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => movePriority(i, -1)}
                    disabled={i === 0}
                    aria-label="위로"
                    className="rounded-lg p-1.5 text-slate-500 transition active:scale-90 disabled:opacity-25"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePriority(i, 1)}
                    disabled={i === orderedPriority.length - 1}
                    aria-label="아래로"
                    className="rounded-lg p-1.5 text-slate-500 transition active:scale-90 disabled:opacity-25"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePriority(b.id)}
                    aria-label="주요 행동 해제"
                    className="rounded-lg p-1.5 text-amber-500 transition active:scale-90"
                  >
                    <Star size={16} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {restBehaviors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {restBehaviors.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => togglePriority(b.id)}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition active:scale-95"
                >
                  <Star size={14} />
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
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
