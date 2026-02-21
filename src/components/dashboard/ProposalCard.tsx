'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CrossProposal, CrossProposalStatus } from '@/lib/types'
import StatusBadge from './StatusBadge'
import DaoAvatar from '@/components/ui/DaoAvatar'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { Calendar } from 'lucide-react'

const stripeColor: Record<CrossProposalStatus, string> = {
  active: 'bg-warning',
  approved: 'bg-success',
  rejected: 'bg-error',
  expired: 'bg-fgd-3',
}

export default function ProposalCard({ proposal }: { proposal: CrossProposal }) {
  const date = new Date(proposal.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/proposal/${proposal.id}`}>
        <div className="group relative rounded-xl border border-bkg-3 bg-bkg-2 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(203,100%,59%,0.08)] cursor-pointer">
          {/* Left color stripe */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripeColor[proposal.status]}`} />

          <div className="p-5 pl-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-white group-hover:text-gradient transition-colors truncate">
                {proposal.title}
              </h3>
              <StatusBadge status={proposal.status} />
            </div>

            <p className="text-sm text-fgd-3 mb-4 line-clamp-2">
              {proposal.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-fgd-4">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {proposal.participants.map((p, i) => (
                    <DaoAvatar
                      key={i}
                      realmName={p.realmName}
                      realmAddress={p.realmAddress}
                      size={24}
                      ring
                    />
                  ))}
                </div>
                <span>{proposal.participants.length} DAOs</span>
              </div>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {date}
              </span>
              <span className="ml-auto">
                {proposal.status === 'active' && proposal.expiresAt
                  ? <CountdownTimer expiresAt={proposal.expiresAt} />
                  : <span className="text-fgd-4 uppercase tracking-wider text-[10px] font-medium">{{ all: 'Unanimous', majority: 'Majority', weighted: 'Weighted', first: 'First Response' }[proposal.approvalCondition]}</span>
                }
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div >
  )
}
