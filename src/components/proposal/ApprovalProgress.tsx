'use client'

import { CrossProposal } from '@/lib/types'
import { Target } from 'lucide-react'
import NumberTicker from '@/components/ui/NumberTicker'

const conditionLabels: Record<string, string> = {
  all: 'Unanimous — All DAOs must approve',
  majority: 'Majority — More than 50% of DAOs',
  weighted: 'Weighted — More than 50% by weight',
  first: 'First Response — First approval wins',
}

export default function ApprovalProgress({ proposal }: { proposal: CrossProposal }) {
  const { participants, approvalCondition: cond } = proposal

  // Count cooloff and finalizing as approved (they've passed voting)
  const approvedCount = participants.filter(p => 
    p.status === 'approved' || p.status === 'cooloff' || p.status === 'finalizing'
  ).length
  const rejectedCount = participants.filter(p => 
    p.status === 'rejected' || p.status === 'error'
  ).length
  const total = participants.length

  let current = 0
  let needed = 0
  let labelNode: React.ReactNode = ''
  let progressPct = 0

  switch (cond) {
    case 'all':
      current = approvedCount
      needed = total
      labelNode = <><NumberTicker value={current} duration={1} />/<NumberTicker value={needed} duration={1} /> approved</>
      progressPct = total > 0 ? (current / needed) * 100 : 0
      break

    case 'majority': {
      const threshold = Math.floor(total / 2) + 1
      current = approvedCount
      needed = threshold
      labelNode = <><NumberTicker value={current} duration={1} />/<NumberTicker value={total} duration={1} /> approved (need <NumberTicker value={threshold} duration={1} />)</>
      progressPct = total > 0 ? (current / threshold) * 100 : 0
      break
    }

    case 'weighted': {
      const totalWeight = participants.reduce((s, p) => s + (p.weight || 1), 0)
      const approvedWeight = participants
        .filter(p => p.status === 'approved' || p.status === 'cooloff' || p.status === 'finalizing')
        .reduce((s, p) => s + (p.weight || 1), 0)
      // Normalize to percentage (always out of 100)
      const approvedPct = totalWeight > 0 ? Math.round((approvedWeight / totalWeight) * 100) : 0
      const thresholdPct = 50 // always >50%
      current = approvedPct
      needed = 100
      labelNode = <>Weight: <NumberTicker value={approvedPct} duration={1} />/100</>
      progressPct = approvedPct / thresholdPct * 100
      break
    }

    case 'first':
      current = approvedCount
      needed = 1
      labelNode = approvedCount > 0
        ? `Approved by first responder`
        : `Waiting for first approval (${rejectedCount} rejected)`
      progressPct = approvedCount > 0 ? 100 : 0
      break
  }

  const cappedPct = Math.min(progressPct, 100)
  const isComplete = proposal.status === 'approved'
  const isRejected = proposal.status === 'rejected'

  const barColor = isComplete
    ? 'bg-success glow-green'
    : isRejected
      ? 'bg-error glow-red'
      : 'bg-primary glow-purple'

  return (
    <div className="rounded-xl border border-dashed border-bkg-3 bg-bkg-2 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Target size={14} className="text-primary" />
        <span className="text-sm font-semibold text-fgd-1">Approval Condition</span>
      </div>
      <p className="text-xs text-fgd-3 mb-3">{conditionLabels[cond]}</p>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-bkg-3 overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${cappedPct}%` }}
        />
      </div>
      <p className="text-xs text-fgd-4">{labelNode}</p>

      {/* Weighted: show per-DAO weights */}
      {cond === 'weighted' && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-bkg-3">
          {participants.map((p, i) => {
            const statusColor = 
              p.status === 'approved' || p.status === 'cooloff' || p.status === 'finalizing'
                ? 'border-success/40 text-success'
                : p.status === 'rejected' || p.status === 'error'
                  ? 'border-error/40 text-error'
                  : 'border-bkg-4 text-fgd-4'
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 text-[11px] border rounded-full px-2 py-0.5 ${statusColor}`}
              >
                {p.realmName || p.realmAddress.slice(0, 6) + '...'}
                <span className="font-bold">w{p.weight || 1}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
