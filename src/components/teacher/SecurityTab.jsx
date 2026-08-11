import { useState } from 'react'

export default function SecurityTab({ password, onChangePassword, showToast }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (current !== password) {
      setError('현재 비밀번호가 올바르지 않습니다')
      return
    }
    if (next.length < 4) {
      setError('새 비밀번호는 4자 이상 입력해주세요')
      return
    }
    if (next !== confirm) {
      setError('새 비밀번호가 일치하지 않습니다')
      return
    }
    onChangePassword(next)
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    showToast('비밀번호가 변경되었습니다')
  }

  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-display text-lg text-slate-700">비밀번호 변경</h3>
      <form onSubmit={handleSubmit}>
        <label className="mb-1 block text-sm font-semibold text-slate-600">현재 비밀번호</label>
        <input
          type="password"
          inputMode="numeric"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value)
            setError('')
          }}
          className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 outline-none transition focus:border-sky-400"
        />

        <label className="mb-1 block text-sm font-semibold text-slate-600">새 비밀번호</label>
        <input
          type="password"
          inputMode="numeric"
          value={next}
          onChange={(e) => {
            setNext(e.target.value)
            setError('')
          }}
          className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 outline-none transition focus:border-sky-400"
        />

        <label className="mb-1 block text-sm font-semibold text-slate-600">새 비밀번호 확인</label>
        <input
          type="password"
          inputMode="numeric"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            setError('')
          }}
          className="mb-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 outline-none transition focus:border-sky-400"
        />

        {error && <p className="mb-3 text-sm font-medium text-rose-500">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-2xl bg-sky-500 py-3 font-bold text-white transition active:scale-95"
        >
          변경
        </button>
      </form>
    </div>
  )
}
