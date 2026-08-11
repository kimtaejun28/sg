import { Settings } from 'lucide-react'

export default function StudentCard({ student, gradient, onOpen, onEdit }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(student)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(student)
      }}
      className={`relative flex min-h-[140px] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-4 text-left shadow-md transition active:scale-95`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onEdit(student)
        }}
        aria-label="학생 정보 수정"
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-slate-700 backdrop-blur transition hover:bg-white/90 active:scale-90"
      >
        <Settings size={18} />
      </button>

      <div className="mt-8 flex-1">
        <p className="text-2xl font-display text-slate-800 drop-shadow-sm">{student.name}</p>
      </div>

      {student.memo && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-700/80">{student.memo}</p>
      )}
    </div>
  )
}
