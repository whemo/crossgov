'use client'

import { StatusEvent, DaoParticipant } from '@/lib/types'
import { Clock } from 'lucide-react'

const dotColor: Record<string, string> = {
  active: 'bg-warning',
  voting: 'bg-warning',
  approved: 'bg-success',
  rejected: 'bg-error',
  expired: 'bg-fgd-3',
  waiting: 'bg-fgd-3',
}

// Replace address prefixes (e.g. "84pGFuy1...") with DAO names
function resolveLabel(label: string, nameMap: Map<string, string>): string {
  for (const [addrPrefix, name] of nameMap) {
    if (label.includes(addrPrefix)) {
      return label.replace(addrPrefix, name)
    }
  }
  return label
}

interface TimelineProps {
  events: StatusEvent[]
  participants?: DaoParticipant[]
}

export default function Timeline({ events, participants }: TimelineProps) {
  if (!events || events.length === 0) return null

  // Build a map of address prefixes → realm names from participants
  const nameMap = new Map<string, string>()
  if (participants) {
    for (const p of participants) {
      if (p.realmName && p.realmAddress) {
        // Match the "addr.slice(0,8) + '...'" pattern used in sync route labels
        nameMap.set(p.realmAddress.slice(0, 8) + '...', p.realmName)
      }
    }
  }

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div className="lg:sticky lg:top-24">
      <div className="rounded-xl border border-bkg-3 bg-bkg-2 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fgd-1 mb-4">
          <Clock size={14} className="text-primary" />
          Timeline
        </h3>
        <div className="space-y-0">
          {sorted.map((event, i) => {
            const time = new Date(event.timestamp).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
            const color = dotColor[event.status] || 'bg-zinc-500'
            const isLast = i === sorted.length - 1
            const displayLabel = resolveLabel(event.label, nameMap)

            return (
              <div key={i} className="flex gap-3">
                {/* Line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />
                  {!isLast && <div className="w-px flex-1 bg-bkg-3 min-h-[20px]" />}
                </div>
                {/* Content */}
                <div className="pb-3">
                  <p className="text-sm text-fgd-2 leading-tight">{displayLabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
