'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

interface CountdownTimerProps {
  expiresAt: number // unix ms
  className?: string
}

function getTimeLeft(expiresAt: number) {
  const diff = expiresAt - Date.now()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  return { d, h, m, s, diff }
}

export default function CountdownTimer({ expiresAt, className = '' }: CountdownTimerProps) {
  const [left, setLeft] = useState(() => getTimeLeft(expiresAt))

  useEffect(() => {
    const id = setInterval(() => setLeft(getTimeLeft(expiresAt)), 1_000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (!left) return (
    <span className={`text-xs text-fgd-4 ${className}`}>Voting closed</span>
  )

  const isUrgent = left.diff < 86_400_000 // < 24h
  const isWarning = left.diff < 86_400_000 * 3 // < 3 days

  const color = isUrgent
    ? 'text-error border-error/20 bg-error/[0.05]'
    : isWarning
      ? 'text-warning border-warning/20 bg-warning/[0.05]'
      : 'text-fgd-3 border-bkg-3 bg-bkg-2'

  const parts = left.d > 0
    ? `${left.d}d ${left.h}h ${left.m}m`
    : `${left.h}h ${left.m}m ${left.s}s`

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium border rounded-lg px-2 py-0.5 ${color} ${className}`}>
      <Timer size={11} className={isUrgent ? 'animate-pulse' : ''} />
      {parts}
    </span>
  )
}
