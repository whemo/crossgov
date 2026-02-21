'use client'

import { formatVoteCount } from '@/lib/utils'

function compact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function VotingProgress({
  yes,
  no,
  yesRaw,
  noRaw
}: {
  yes: number;
  no: number;
  yesRaw?: number;
  noRaw?: number;
}) {
  // Use raw values if tokens < 1 (like Realms)
  const displayYes = yes < 1 && yesRaw ? yesRaw : yes
  const displayNo = no < 1 && noRaw ? noRaw : no
  const total = displayYes + displayNo
  const yesPct = total > 0 ? (displayYes / total) * 100 : 0
  const noPct = total > 0 ? (displayNo / total) * 100 : 0

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-success" title={yes.toLocaleString()}>
          For: {formatVoteCount(yes, yesRaw)}
        </span>
        <span className="text-error" title={no.toLocaleString()}>
          Against: {formatVoteCount(no, noRaw)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
        {total > 0 ? (
          <>
            <div
              className="h-full rounded-full bg-success transition-all shadow-[0_0_12px_rgba(20,241,149,0.5)]"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="h-full bg-error transition-all shadow-[0_0_12px_rgba(255,100,100,0.5)]"
              style={{ width: `${noPct}%` }}
            />
          </>
        ) : (
          <div className="h-full w-full bg-white/5" />
        )}
      </div>
      {total > 0 && (
        <div className="flex justify-between text-[10px] text-fgd-4 mt-1">
          <span>{yesPct.toFixed(1)}%</span>
          <span>{noPct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}
