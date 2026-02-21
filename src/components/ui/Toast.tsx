'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

export interface ToastData {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastId = 0
let addToastFn: ((toast: ToastData) => void) | null = null

export function toast(message: string, type: 'success' | 'error' = 'success') {
  addToastFn?.({ id: ++toastId, message, type })
}

function ToastItem({ data, onClose }: { data: ToastData; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const isSuccess = data.type === 'success'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        } ${isSuccess
          ? 'bg-success/10 border-success/25 text-success'
          : 'bg-error/10 border-error/25 text-error'
        }`}
    >
      {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span className="text-sm font-medium flex-1">{data.message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }} className="opacity-50 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    addToastFn = (t) => setToasts(prev => [...prev, t])
    return () => { addToastFn = null }
  }, [])

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <ToastItem key={t.id} data={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  )
}
