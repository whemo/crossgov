'use client'

import { CrossProposalStatus } from '@/lib/types'

const config: Record<CrossProposalStatus, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'Active', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  approved: { label: 'Approved', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  rejected: { label: 'Rejected', bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
  expired: { label: 'Expired', bg: 'bg-bkg-3', text: 'text-fgd-4', dot: 'bg-fgd-4' },
}

export default function StatusBadge({ status }: { status: CrossProposalStatus }) {
  const c = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
