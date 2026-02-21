'use client'

import { CrossProposalStatus } from '@/lib/types'

const config: Record<CrossProposalStatus, { label: string; bg: string; text: string; border: string; glow: string }> = {
  active: { label: 'Active — Awaiting Votes', bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/25', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.1)]' },
  approved: { label: 'Approved', bg: 'bg-success/10', text: 'text-success', border: 'border-success/25', glow: 'shadow-[0_0_12px_rgba(20,241,149,0.1)]' },
  rejected: { label: 'Rejected', bg: 'bg-error/10', text: 'text-error', border: 'border-error/25', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.1)]' },
  expired: { label: 'Expired', bg: 'bg-bkg-3', text: 'text-fgd-4', border: 'border-bkg-4', glow: '' },
}

export default function OverallStatus({ status }: { status: CrossProposalStatus }) {
  const c = config[status]
  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border ${c.bg} ${c.text} ${c.border} ${c.glow}`}>
      {c.label}
    </div>
  )
}
