import { Undo2 } from 'lucide-react'

export default function Toast({ toast, onUndo }) {
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-800/95 py-3 pl-5 pr-3 text-sm font-medium text-white shadow-xl animate-toast-in">
        <span>{toast.message}</span>
        {toast.onUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold transition active:scale-95"
          >
            <Undo2 size={14} />
            실행 취소
          </button>
        )}
      </div>
    </div>
  )
}
