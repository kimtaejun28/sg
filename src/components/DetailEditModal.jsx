import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'

export default function DetailEditModal({ record, detailHistory, onSave, onClose }) {
  const [detail, setDetail] = useState(record.detail ?? '')
  const textareaRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  const chips = detailHistory[record.behaviorId] || []

  return (
    <Modal onClose={onClose} widthClass="max-w-lg">
      <h3 className="mb-3 pr-6 text-lg font-bold text-slate-800">상세내용 작성</h3>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <span className="font-display text-base text-slate-700">{record.studentName}</span>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: record.color }}
        >
          {record.behaviorName}
        </span>
        <span>
          {record.date} {record.time} · {record.period}
        </span>
      </div>

      <label className="mb-1 block text-sm font-semibold text-slate-600">어떤 상황이었나요?</label>
      <textarea
        ref={textareaRef}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={4}
        placeholder="예: 국어 시간 중 자리에서 일어나 교실 뒤편으로 이동"
        className="w-full resize-none rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
      />

      {chips.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-slate-400">최근 입력한 문구</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDetail(chip)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition active:scale-95"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onSave(record.id, detail.trim())}
        className="mt-5 w-full rounded-2xl bg-sky-500 py-3 font-bold text-white transition active:scale-95"
      >
        저장
      </button>
    </Modal>
  )
}
