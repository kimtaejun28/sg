import { useState } from 'react'
import Modal from './Modal'

export default function StudentModal({ student, onSave, onClose }) {
  const isEdit = Boolean(student)
  const [name, setName] = useState(student?.name ?? '')
  const [memo, setMemo] = useState(student?.memo ?? '')

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), memo: memo.trim() })
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

      <button
        type="button"
        disabled={!name.trim()}
        onClick={handleSave}
        className="w-full rounded-2xl bg-sky-500 py-3 font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
