import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'
import { sortedPeriods } from '../../utils'

const EMPTY_FORM = { name: '', start: '', end: '' }

export default function PeriodsTab({ periods, onAdd, onUpdate, onDelete, showToast }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function startEdit(p) {
    setEditingId(p.id)
    setForm({ name: p.name, start: p.start, end: p.end })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function handleSave() {
    if (!form.name.trim() || !form.start || !form.end) return
    if (form.end <= form.start) {
      showToast('종료 시각은 시작 시각보다 늦어야 합니다')
      return
    }
    if (editingId) {
      onUpdate(editingId, { name: form.name.trim(), start: form.start, end: form.end })
      showToast('교시가 수정되었습니다')
    } else {
      onAdd({ name: form.name.trim(), start: form.start, end: form.end })
      showToast('교시가 추가되었습니다')
    }
    cancelEdit()
  }

  function handleDeleteConfirm() {
    onDelete(deleteTarget.id)
    showToast('교시가 삭제되었습니다')
    setDeleteTarget(null)
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">학교 일과에 맞게 시간대를 자유롭게 추가·수정·삭제할 수 있습니다.</p>

      <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg text-slate-700">{editingId ? '교시 수정' : '교시 추가'}</h3>

        <label className="mb-1 block text-sm font-semibold text-slate-600">이름</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예: 1교시"
          className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 outline-none transition focus:border-sky-400"
        />

        <div className="mb-4 flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-semibold text-slate-600">시작 시각</label>
            <input
              type="time"
              value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 outline-none transition focus:border-sky-400"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-semibold text-slate-600">종료 시각</label>
            <input
              type="time"
              value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 outline-none transition focus:border-sky-400"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!form.name.trim() || !form.start || !form.end}
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
        {sortedPeriods(periods).map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <span className="font-semibold text-slate-700">{p.name}</span>
              <span className="ml-3 text-sm text-slate-400">
                {p.start} ~ {p.end}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(p)}
                className="rounded-xl bg-slate-100 p-2 text-slate-600 transition active:scale-95"
                aria-label="수정"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(p)}
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
          title="교시 삭제"
          message={`'${deleteTarget.name}' 교시를 삭제할까요?\n해당 시간대 기록은 이후 '일과 외'로 재분류됩니다.`}
          confirmLabel="삭제"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
