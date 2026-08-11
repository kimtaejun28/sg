import { useEffect, useRef, useState } from 'react'
import { PenLine } from 'lucide-react'
import Modal from './Modal'

export default function RecordModal({ student, behaviors, detailHistory, onSave, onClose }) {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [step])

  function chooseBehavior(behavior) {
    setSelected(behavior)
    setDetail('')
    setError('')
    setStep(2)
  }

  function handleModalClose() {
    if (step === 2) {
      setStep(1)
      setSelected(null)
      setDetail('')
      setError('')
    } else {
      onClose()
    }
  }

  function handleSave() {
    if (selected.requiresDetail && !detail.trim()) {
      setError('행동 내용을 입력해주세요')
      return
    }
    onSave(selected, detail.trim())
  }

  const chips = selected ? detailHistory[selected.id] || [] : []

  // 학생별로 사용할 유형을 정해두었으면 그 유형만 보여준다
  const visibleBehaviors = student.behaviorIds?.length
    ? behaviors.filter((b) => student.behaviorIds.includes(b.id))
    : behaviors

  return (
    <Modal onClose={handleModalClose} widthClass="max-w-lg">
      {step === 1 && (
        <>
          <h3 className="mb-1 pr-6 text-2xl font-display text-slate-800">{student.name}</h3>
          <p className="mb-5 text-sm text-slate-500">행동을 선택한 뒤 내용을 적어 저장하세요</p>
          {visibleBehaviors.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              사용할 수 있는 행동유형이 없습니다.
              <br />
              카드의 설정 버튼에서 행동유형을 선택해주세요.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visibleBehaviors.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => chooseBehavior(b)}
                  style={{ backgroundColor: b.color }}
                  className="flex items-center justify-center gap-2 rounded-2xl px-4 py-6 text-lg font-bold text-white shadow-sm transition active:scale-95"
                >
                  {b.requiresDetail && <PenLine size={18} />}
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 2 && selected && (
        <>
          <div className="mb-4 flex items-center gap-3 pr-6">
            <span
              className="rounded-full px-4 py-1.5 text-sm font-bold text-white"
              style={{ backgroundColor: selected.color }}
            >
              {selected.name}
            </span>
            <span className="font-display text-lg text-slate-700">{student.name}</span>
          </div>

          <label className="mb-1 block text-sm font-semibold text-slate-600">
            {selected.requiresDetail
              ? '어떤 행동이었는지 구체적으로 적어주세요 (필수)'
              : '어떤 상황이었나요? (선택 입력)'}
          </label>
          <textarea
            ref={textareaRef}
            value={detail}
            onChange={(e) => {
              setDetail(e.target.value)
              if (error) setError('')
            }}
            rows={3}
            placeholder={
              selected.requiresDetail
                ? '예: 책상을 세게 두드림, 물건을 밖으로 던짐'
                : '예: 국어 시간 중 자리에서 일어나 교실 뒤편으로 이동'
            }
            className={`w-full resize-none rounded-2xl border-2 px-4 py-3 outline-none transition ${
              error ? 'border-rose-400' : 'border-slate-200 focus:border-sky-400'
            }`}
          />
          {error && <p className="mt-1 text-sm font-medium text-rose-500">{error}</p>}

          {chips.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-400">최근 입력한 문구</p>
              <div className="flex flex-wrap gap-2">
                {chips.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDetail(c)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition active:scale-95"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 w-full rounded-2xl bg-sky-500 py-3 font-bold text-white transition active:scale-95"
          >
            기록 저장
          </button>

          {/* 급할 때는 유형만 남기고 상세는 교사 페이지에서 나중에 채운다 */}
          {selected.requiresDetail && (
            <button
              type="button"
              onClick={() => onSave(selected, '')}
              className="mt-2 w-full rounded-2xl bg-slate-100 py-3 font-semibold text-slate-500 transition active:scale-95"
            >
              비워두고 저장 (나중에 작성)
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
