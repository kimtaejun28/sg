import { X } from 'lucide-react'

export default function Modal({ children, onClose, widthClass = 'max-w-md' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95"
          >
            <X size={22} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
