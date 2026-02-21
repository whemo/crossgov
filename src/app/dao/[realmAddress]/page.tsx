'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CrossProposal } from '@/lib/types'
import DaoAvatar from '@/components/ui/DaoAvatar'
import { Skeleton } from '@/components/ui/Skeleton'
import StatusBadge from '@/components/dashboard/StatusBadge'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import NumberTicker from '@/components/ui/NumberTicker'

export default function DaoPage() {
  const { realmAddress } = useParams<{ realmAddress: string }>()
  const router = useRouter()
  const [proposals, setProposals] = useState<CrossProposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/proposals')
      .then(r => r.json())
      .then((all: CrossProposal[]) => {
        setProposals(all.filter(p => p.participants.some(part => part.realmAddress === realmAddress)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [realmAddress])

  const daoName = proposals[0]?.participants.find(p => p.realmAddress === realmAddress)?.realmName
    || realmAddress.slice(0, 8) + '...'

  const stats = {
    total: proposals.length,
    active: proposals.filter(p => p.status === 'active').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-fgd-3 hover:text-fgd-1 mb-7 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* DAO Header */}
      <div className="flex items-center gap-4 mb-8">
        <DaoAvatar realmName={daoName} realmAddress={realmAddress} size={56} />
        <div>
          <h1 className="text-2xl font-bold text-fgd-1">{daoName}</h1>
          <p className="text-xs text-fgd-4 font-mono mt-0.5">{realmAddress}</p>
        </div>
      </div>

      {/* Stats row */}
      {loading ? (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-bkg-3 bg-bkg-2 p-4 flex flex-col items-center">
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-fgd-1' },
            { label: 'Active', value: stats.active, color: 'text-warning' },
            { label: 'Approved', value: stats.approved, color: 'text-success' },
            { label: 'Rejected', value: stats.rejected, color: 'text-error' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-bkg-3 bg-bkg-2 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>
                <NumberTicker value={s.value} />
              </p>
              <p className="text-xs text-fgd-4 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-fgd-3 mb-4 uppercase tracking-wider">
        Cross-Proposals
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-bkg-3 bg-bkg-2 p-4 h-24 flex flex-col justify-between">
              <Skeleton className="h-5 w-1/2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <p className="text-fgd-4 text-center py-16">No cross-proposals found for this DAO</p>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => {
            const participant = p.participants.find(part => part.realmAddress === realmAddress)!
            const otherDaos = p.participants.filter(part => part.realmAddress !== realmAddress)
            return (
              <Link key={p.id} href={`/proposal/${p.id}`}>
                <div className="group rounded-xl border border-bkg-3 bg-bkg-2 p-4 hover:border-bkg-4 hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(153,69,255,0.07)] transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-fgd-1 group-hover:text-primary transition-colors leading-snug">
                      {p.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={p.status} />
                      {p.status === 'active' && p.expiresAt && (
                        <CountdownTimer expiresAt={p.expiresAt} />
                      )}
                    </div>
                  </div>

                  {/* This DAO's vote status */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${participant.status === 'approved' ? 'text-success border-success/20 bg-success/5'
                      : participant.status === 'rejected' ? 'text-error border-error/20 bg-error/5'
                        : participant.status === 'voting' ? 'text-warning border-warning/20 bg-warning/5'
                          : 'text-fgd-4 border-bkg-3 bg-bkg-2'
                      }`}>
                      {daoName}: {participant.status}
                    </span>
                    {participant.yesVotes > 0 || participant.noVotes > 0 ? (
                      <span className="text-xs text-fgd-4">
                        FOR {(participant.yesVotes / 1_000_000).toFixed(1)}M
                        {' · '}AGN {(participant.noVotes / 1_000_000).toFixed(1)}M
                      </span>
                    ) : null}
                  </div>

                  {/* Other participating DAOs */}
                  {otherDaos.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-fgd-4">Also:</span>
                      <div className="flex -space-x-1">
                        {otherDaos.map((d, i) => (
                          <DaoAvatar key={i} realmName={d.realmName} realmAddress={d.realmAddress} size={18} ring />
                        ))}
                      </div>
                      <span className="text-[10px] text-fgd-4">
                        {otherDaos.map(d => d.realmName || d.realmAddress.slice(0, 6)).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
