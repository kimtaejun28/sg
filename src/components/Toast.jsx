export default function Toast({ message }) {
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
      <div className="pointer-events-auto rounded-2xl bg-slate-800/95 px-5 py-3 text-sm font-medium text-white shadow-xl animate-toast-in">
        {message}
      </div>
    </div>
  )
}
