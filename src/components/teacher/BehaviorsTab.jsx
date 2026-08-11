import { useState } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'
import { BEHAVIOR_COLOR_PRESETS } from '../../constants'

const EMPTY_FORM = { name: '', color: BEHAVIOR_COLOR_PRESETS[0], requiresDetail: false }

export default function BehaviorsTab({ behaviors, onAdd, onUpdate, onDelete, showToast }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function startEdit(b) {
    setEditingId(b.id)
    setForm({ name: b.name, color: b.color, requiresDetail: b.requiresDetail })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (editingId) {
      onUpdate(editingId, { name: form.name.trim(), color: form.color, requiresDetail: form.requiresDetail })
      showToast('행동유형이 수정되었습니다')
    } else {
      onAdd({ name: form.name.trim(), color: form.color, requiresDetail: form.requiresDetail })
      showToast('행동유형이 추가되었습니다')
    }
    cancelEdit()
  }

  function handleDeleteConfirm() {
    onDelete(deleteTarget.id)
    showToast('행동유형이 삭제되었습니다')
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg text-slate-700">{editingId ? '행동유형 수정' : '행동유형 추가'}</h3>

        <label className="mb-1 block text-sm font-semibold text-slate-600">이름</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예: 수업 이탈"
          className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 outline-none transition focus:border-sky-400"
        />

        <label className="mb-2 block text-sm font-semibold text-slate-600">색상</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {BEHAVIOR_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{ backgroundColor: c }}
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition active:scale-90"
            >
              {form.color === c && <Check size={16} className="text-white" />}
            </button>
          ))}
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={form.requiresDetail}
            onChange={(e) => setForm((f) => ({ ...f, requiresDetail: e.target.checked }))}
            className="h-4 w-4"
          />
          상세 내용 입력 필수
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!form.name.trim()}
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-sky-500 py-2.5 font-bold text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {editingId ? '수정 완료' : '추가'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-2xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-600 transition active:scale-95"
            >
              취소
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {behaviors.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="font-semibold text-slate-700">{b.name}</span>
              {b.requiresDetail && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600">
                  입력필수
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(b)}
                className="rounded-xl bg-slate-100 p-2 text-slate-600 transition active:scale-95"
                aria-label="수정"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(b)}
                className="rounded-xl bg-rose-50 p-2 text-rose-500 transition active:scale-95"
                aria-label="삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="행동유형 삭제"
          message={`'${deleteTarget.name}' 행동유형을 삭제할까요?\n기존 기록의 행동명은 그대로 유지됩니다.`}
          confirmLabel="삭제"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
