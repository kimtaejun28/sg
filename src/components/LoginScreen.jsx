import { useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { getSupabase } from '../supabase'

export default function LoginScreen({ onUseLocalOnly }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setBusy(true)
    setError('')
    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (signInError) {
      setError('로그인하지 못했습니다. 이메일과 비밀번호를 확인해주세요.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl">
        <h1 className="mb-1 text-center font-display text-2xl text-slate-800">도전행동 기록판</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          기기 간에 같은 기록을 보려면 로그인해주세요.
          <br />한 번 로그인하면 이 기기에서는 계속 유지됩니다.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="mb-1 block text-sm font-semibold text-slate-600">이메일</label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
          />

          <label className="mb-1 block text-sm font-semibold text-slate-600">비밀번호</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            className="mb-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
          />

          {error && <p className="mb-3 text-sm font-medium text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 font-bold text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy && <RefreshCw size={16} className="animate-spin" />}
            로그인
          </button>
        </form>

        <button
          type="button"
          onClick={onUseLocalOnly}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-500 transition active:scale-95"
        >
          <CloudOff size={16} />이 기기에서만 사용하기
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">
          로그인하지 않으면 기록이 이 기기에만 저장되고 다른 기기와 공유되지 않습니다.
        </p>
      </div>
    </div>
  )
}
