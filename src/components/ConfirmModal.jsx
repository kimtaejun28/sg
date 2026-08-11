import Modal from './Modal'

export default function ConfirmModal({ title, message, danger = true, confirmLabel = '확인', onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} widthClass="max-w-sm">
      <h3 className="mb-2 pr-6 text-lg font-bold text-slate-800">{title}</h3>
      <p className="mb-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-slate-100 py-3 font-semibold text-slate-600 transition active:scale-95"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex-1 rounded-2xl py-3 font-semibold text-white transition active:scale-95 ${
            danger ? 'bg-rose-500' : 'bg-sky-500'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
