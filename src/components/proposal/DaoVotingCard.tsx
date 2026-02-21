'use client'

import { DaoParticipant, DaoVoteStatus, DaoType, VotingChannel } from '@/lib/types'
import { ExternalLink, Shield, Users, Vote, History } from 'lucide-react'
import Link from 'next/link'
import VotingProgress from './VotingProgress'
import DaoAvatar from '@/components/ui/DaoAvatar'
import { formatVoteCount } from '@/lib/utils'

function QuorumIndicator({ participant }: { participant: DaoParticipant }) {
  const yesVotes = participant.yesVotes
  const max = participant.maxVoteWeight || 0
  const quorum = participant.quorum

  // Cool-off / Finalizing / Approved — quorum met
  if (participant.status === 'cooloff' || participant.status === 'finalizing' || participant.status === 'approved') {
    return <span className="text-xs text-success">Quorum: Met</span>
  }

  // If quorum is available (new logic)
  if (quorum && quorum > 0) {
    const isMet = yesVotes >= quorum
    const color = isMet ? 'text-[#14F195]' : 'text-zinc-400'
    const label = isMet ? 'Quorum Met' : 'Quorum'

    return (
      <span className={`text-xs ${isMet ? 'text-success' : 'text-fgd-3'}`} title={`Required: ${quorum.toLocaleString()}`}>
        {label}: {formatVoteCount(yesVotes, participant.yesVotesRaw)}/{formatVoteCount(quorum, participant.quorumRaw)}
      </span>
    )
  }

  // Fallback (Turnout) logic
  if (max <= 0) return null

  const pct = (yesVotes / max) * 100
  const pctStr = pct < 0.1 && pct > 0 ? '<0.1' : pct.toFixed(1)

  if (participant.status === 'rejected' || participant.status === 'expired') {
    return (
      <span className="text-xs text-error">
        Quorum: Not Reached ({pctStr}%)
      </span>
    )
  }

  return (
    <span className="text-xs text-warning">
      Quorum (Turnout): {formatVoteCount(yesVotes, participant.yesVotesRaw)}/{formatVoteCount(max, participant.maxVoteWeightRaw)} ({pctStr}%)
    </span>
  )
}

const statusConfig: Record<DaoVoteStatus, { label: string; bg: string; text: string; dot: string }> = {
  waiting: { label: 'Waiting', bg: 'bg-bkg-3', text: 'text-fgd-3', dot: 'bg-fgd-4' },
  voting: { label: 'Voting', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  cooloff: { label: 'Cool-off', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  finalizing: { label: 'Finalizing', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  approved: { label: 'Approved', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  rejected: { label: 'Rejected', bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
  error: { label: 'Error', bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
  expired: { label: 'Expired', bg: 'bg-bkg-3', text: 'text-fgd-3', dot: 'bg-fgd-4' },
}

// DAO type badge configuration
const daoTypeConfig: Record<DaoType, { label: string; color: string; icon: React.ReactNode }> = {
  multisig: { label: 'Multisig', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <Shield size={10} /> },
  token: { label: 'Token DAO', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: <Users size={10} /> },
  nft: { label: 'NFT DAO', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', icon: <Vote size={10} /> },
  unknown: { label: '', color: '', icon: null },
}

// Voting channel badge configuration
const votingChannelConfig: Record<VotingChannel, { label: string; color: string }> = {
  community: { label: 'Community Vote', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  multisig: { label: 'Multisig Vote', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  unknown: { label: '', color: '' },
}

function formatGovernanceParams(params?: { approvalThreshold?: number; maxVotingTime?: number; voteTipping?: string }): string {
  if (!params) return ''

  const parts: string[] = []

  if (params.approvalThreshold) {
    parts.push(`Approval: ${params.approvalThreshold}%`)
  }
  if (params.maxVotingTime) {
    parts.push(`Max voting: ${params.maxVotingTime}d`)
  }
  if (params.voteTipping && params.voteTipping !== 'unknown') {
    parts.push(`Tipping: ${params.voteTipping.charAt(0).toUpperCase() + params.voteTipping.slice(1)}`)
  }

  return parts.join(' • ')
}

export default function DaoVotingCard({ participant }: { participant: DaoParticipant }) {
  const s = statusConfig[participant.status]
  const realmsUrl = `https://v2.realms.today/dao/${participant.realmAddress}/proposal/${participant.proposalAddress}`

  const daoTypeBadge = participant.daoType && daoTypeConfig[participant.daoType]
  const votingChannelBadge = participant.votingChannel && votingChannelConfig[participant.votingChannel]

  return (
    <div className="rounded-xl border border-bkg-3 bg-bkg-2 p-5 transition-all hover:border-bkg-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <a
          href={`https://v2.realms.today/dao/${participant.realmAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <DaoAvatar
            realmName={participant.realmName}
            realmAddress={participant.realmAddress}
            size={56}
            status={participant.status}
          />
        </a>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://v2.realms.today/dao/${participant.realmAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline decoration-white/50 underline-offset-2"
                >
                  <h3 className="font-bold text-white truncate">
                    {participant.realmName || participant.realmAddress.slice(0, 12) + '...'}
                  </h3>
                </a>
                {/* DAO Type Badge */}
                {daoTypeBadge?.label && (
                  <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${daoTypeBadge.color}`}>
                    {daoTypeBadge.icon}
                    {daoTypeBadge.label}
                  </span>
                )}
              </div>
              {/* Voting Channel Badge */}
              {votingChannelBadge?.label && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border mt-1 ${votingChannelBadge.color}`}>
                  {votingChannelBadge.label}
                </span>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          <p className="text-sm text-fgd-3 truncate mt-1">
            {participant.proposalName || participant.proposalAddress.slice(0, 20) + '...'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-2">
        <VotingProgress
          yes={participant.yesVotes}
          no={participant.noVotes}
          yesRaw={participant.yesVotesRaw}
          noRaw={participant.noVotesRaw}
        />
      </div>

      {/* Participation Rate */}
      {participant.maxVoteWeight > 0 && (() => {
        const total = participant.yesVotes + participant.noVotes
        const pct = (total / participant.maxVoteWeight) * 100
        const quorumPct = participant.quorum ? (participant.quorum / participant.maxVoteWeight) * 100 : 0
        const color = pct >= quorumPct && quorumPct > 0
          ? 'text-success'
          : pct >= quorumPct * 0.5
            ? 'text-warning'
            : 'text-fgd-3'
        const pctStr = pct < 0.01 ? '<0.01' : pct.toFixed(2)
        return (
          <p className={`text-[10px] ${color} mb-2`}>
            Turnout: {pctStr}% of max supply
          </p>
        )
      })()}

      {/* Governance Params */}
      {participant.governanceParams && Object.keys(participant.governanceParams).length > 0 && (
        <div className="mb-3 pb-3 border-b border-bkg-3">
          <p className="text-[10px] text-fgd-4">
            {formatGovernanceParams(participant.governanceParams)}
          </p>
        </div>
      )}

      {/* Quorum + links row */}
      <div className="flex items-center justify-between">
        <div><QuorumIndicator participant={participant} /></div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dao/${participant.realmAddress}`}
            className="inline-flex items-center gap-1 text-xs text-fgd-4 hover:text-fgd-1 transition-colors"
          >
            <History size={11} /> History
          </Link>
          <a
            href={realmsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-success hover:underline transition-colors"
          >
            View on Realms
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}
