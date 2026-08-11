import { useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import Modal from './Modal'

export default function PasswordModal({ onSubmit, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    const ok = onSubmit(value)
    if (!ok) {
      setError('비밀번호가 올바르지 않습니다')
      setValue('')
      inputRef.current?.focus()
    }
  }

  return (
    <Modal onClose={onClose} widthClass="max-w-xs">
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="rounded-full bg-sky-100 p-3 text-sky-600">
          <Lock size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">교사 페이지</h3>
        <form onSubmit={handleSubmit} className="w-full">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            placeholder="비밀번호"
            className={`w-full rounded-2xl border-2 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none transition ${
              error ? 'border-rose-400' : 'border-slate-200 focus:border-sky-400'
            }`}
          />
          {error && <p className="mt-2 text-center text-sm font-medium text-rose-500">{error}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-sky-500 py-3 font-bold text-white transition active:scale-95"
          >
            확인
          </button>
        </form>
      </div>
    </Modal>
  )
}
