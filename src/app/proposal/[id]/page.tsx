'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CrossProposal } from '@/lib/types'
import OverallStatus from '@/components/proposal/OverallStatus'
import { Skeleton } from '@/components/ui/Skeleton'
import DaoVotingCard from '@/components/proposal/DaoVotingCard'
import ApprovalProgress from '@/components/proposal/ApprovalProgress'
import Timeline from '@/components/proposal/Timeline'
import VoteFeed from '@/components/proposal/VoteFeed'
import { ArrowLeft, Loader2, Calendar, User, Clock, Share2, Trash2, Bell, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import SubscribeModal from '@/components/proposal/SubscribeModal'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import { toast } from '@/components/ui/Toast'
import CountdownTimer from '@/components/ui/CountdownTimer'

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { publicKey } = useWallet()
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com')
  const [proposal, setProposal] = useState<CrossProposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    // Load cached data first, then auto-sync for fresh on-chain data
    fetch(`/api/proposals/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then(data => {
        setProposal(data)
        setLoading(false)
        // Auto-sync in background
        return fetch(`/api/sync/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then(updated => { if (updated) setProposal(updated) })
      })
      .catch(() => {
        setError('Proposal not found')
        setLoading(false)
      })
  }, [id])

  const handleSync = useCallback(async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setSyncing(true)
    setSyncError('')
    try {
      const r = await fetch(`/api/sync/${id}`)
      if (!r.ok) throw new Error('Sync failed')
      const updated = await r.json()
      setProposal(updated)
    } catch {
      const msg = 'Failed to sync — some on-chain data may be unreachable'
      setSyncError(msg)
      toast(msg, 'error')
    } finally {
      setSyncing(false)
      isSyncingRef.current = false
    }
  }, [id])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!proposal || proposal.status === 'approved' || proposal.status === 'rejected' || proposal.status === 'expired') {
      return
    }
    intervalRef.current = setInterval(() => {
      if (isSyncingRef.current) return
      isSyncingRef.current = true
      fetch(`/api/sync/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setProposal(data) })
        .catch(() => { })
        .finally(() => { isSyncingRef.current = false })
    }, 60000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [id, proposal?.status])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const r = await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
      toast('Proposal deleted', 'success')
      router.push('/')
    } catch {
      toast('Failed to delete proposal', 'error')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast('Link copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Failed to copy link', 'error')
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 pointer-events-none">
        <Skeleton className="h-4 w-16 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/4 mb-8" />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full space-y-6">
            <div className="rounded-xl border border-bkg-3 bg-bkg-2 p-5 h-64">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="rounded-xl border border-bkg-3 bg-bkg-2 p-5 h-48">
              <Skeleton className="h-6 w-48 mb-6" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
          <div className="flex-none w-full lg:w-[320px] lg:sticky lg:top-24 space-y-4">
            <Skeleton className="rounded-xl h-48 w-full" />
            <Skeleton className="rounded-xl h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-fgd-3 text-lg mb-4">{error || 'Proposal not found'}</p>
        <Link href="/" className="text-primary hover:text-success text-sm">
          &larr; Back to Dashboard
        </Link>
      </div>
    )
  }

  const created = new Date(proposal.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const expires = new Date(proposal.expiresAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-fgd-4 hover:text-fgd-1 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Title + Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2"
      >
        <h1 className="text-2xl font-bold text-fgd-1">{proposal.title}</h1>
        <OverallStatus status={proposal.status} />
      </motion.div>

      {/* Description & Subscribe */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <p className="text-fgd-3 mb-4">{proposal.description}</p>
        <button
          onClick={() => setIsSubscribeOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium mb-6"
        >
          <Bell size={16} /> Subscribe to Updates
        </button>
      </motion.div>

      {/* Meta row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fgd-4 mb-8 pb-6 border-b border-bkg-3"
      >
        <span className="flex items-center gap-1.5">
          <User size={14} />
          {proposal.creator.slice(0, 4)}...{proposal.creator.slice(-4)}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={14} />
          Created {created}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={14} className="text-red-400" />
          Expires {expires}
        </span>
        {proposal.status === 'active' && proposal.expiresAt && (
          <CountdownTimer expiresAt={proposal.expiresAt} />
        )}
        <span className="flex items-center gap-1.5">
          <Shield size={14} />
          {{ all: 'Unanimous', majority: 'Majority', weighted: 'Weighted', first: 'First Response' }[proposal.approvalCondition]}
        </span>
      </motion.div>

      {/* Refresh + Delete buttons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          DAO Participants ({proposal.participants.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            title="Copy link"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-bkg-2 border border-bkg-3 text-fgd-2 hover:bg-bkg-3 hover:text-success hover:border-success/30 transition-all"
          >
            <Share2 size={14} />
            {copied ? 'Copied!' : 'Share'}
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-bkg-2 border border-bkg-3 text-fgd-4 hover:border-error/30 hover:text-error transition-all"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-error/15 border border-error/30 text-error hover:bg-error/25 disabled:opacity-50 transition-all"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" suppressHydrationWarning /> : <Trash2 size={14} />}
              Confirm Delete
            </button>
          )}
        </div>
      </div>

      {/* Approval progress + Timeline side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ApprovalProgress proposal={proposal} />
        <Timeline events={proposal.statusHistory} participants={proposal.participants} />
      </div>

      {/* Sync error */}
      {
        syncError && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 mb-4">
            <p className="text-yellow-400 text-sm">{syncError}</p>
          </div>
        )
      }

      {/* DAO cards paired with Vote Feeds */}
      <div className="flex flex-col gap-4">
        {proposal.participants.map((p, i) => (
          <div key={i} className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
            {/* DAO Voting Card */}
            <DaoVotingCard participant={p} />

            {/* Vote Feed Desktop */}
            <div className="hidden lg:block">
              <VoteFeed
                proposalAddress={p.proposalAddress}
                realmName={p.realmName || `${p.realmAddress.slice(0, 4)}...`}
                decimals={(() => {
                  // Calculate decimals from yesVotes first (most reliable)
                  if (p.yesVotesRaw && p.yesVotesRaw > 0 && p.yesVotes > 0) {
                    const calculated = Math.round(Math.log10(p.yesVotesRaw / p.yesVotes))
                    if (calculated >= 0 && calculated <= 12) return calculated
                  }
                  // Fallback: try noVotes
                  if (p.noVotesRaw && p.noVotesRaw > 0 && p.noVotes > 0) {
                    const calculated = Math.round(Math.log10(p.noVotesRaw / p.noVotes))
                    if (calculated >= 0 && calculated <= 12) return calculated
                  }
                  // Fallback: try maxVoteWeight (but it's often unreliable)
                  if (p.maxVoteWeightRaw > 0 && p.maxVoteWeight > 0 && p.maxVoteWeightRaw > p.maxVoteWeight) {
                    return Math.round(Math.log10(p.maxVoteWeightRaw / p.maxVoteWeight))
                  }
                  // Default to 9 decimals (Solana standard)
                  return 9
                })()}
                isActive={proposal.status === 'active'}
                fallbackYes={p.yesVotes}
                fallbackNo={p.noVotes}
                useRawValues={false}
              />
            </div>
          </div>
        ))}
      </div>

      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        proposalId={proposal.id}
        proposalTitle={proposal.title}
      />
    </div >
  )
}
