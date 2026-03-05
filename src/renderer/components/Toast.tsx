import { useCallback, useState, useRef, useEffect } from 'react'
import { ToastContext } from './ToastContext'
import type { Toast, ToastType } from './ToastContext'

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++
    setToasts((prev) => {
      const next = [...prev, { id, message, type }]
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast, i) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={i}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, index, onDismiss }: {
  toast: Toast
  index: number
  onDismiss: () => void
}) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    timerRef.current = setTimeout(() => setExiting(true), AUTO_DISMISS_MS - 300)
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleClose = () => {
    setExiting(true)
    setTimeout(onDismiss, 250)
  }

  const typeLabel = toast.type === 'error' ? 'ERR' : toast.type === 'success' ? 'OK' : 'SYS'

  return (
    <div
      className={`toast toast--${toast.type} ${exiting ? 'toast--exit' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
      onAnimationEnd={(e) => {
        if (e.animationName === 'toastSlideOut') onDismiss()
      }}
    >
      {/* LED indicator */}
      <span className={`toast-led toast-led--${toast.type}`} />

      {/* Type badge */}
      <span className={`toast-type toast-type--${toast.type}`}>{typeLabel}</span>

      {/* Message */}
      <span className="toast-message">{toast.message}</span>

      {/* Dismiss */}
      <button className="toast-close" onClick={handleClose} title="Dismiss">
        x
      </button>

      {/* Countdown drain bar */}
      <span className="toast-drain" />
    </div>
  )
}
