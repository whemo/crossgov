'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { CrossProposal, CrossProposalStatus } from '@/lib/types'
import ProposalCard from '@/components/dashboard/ProposalCard'
import DaoAvatar from '@/components/ui/DaoAvatar'
import { Calendar, CheckCircle, ChevronDown, Clock, Layers, Plus, Search, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from '@/components/ui/Skeleton'
type StatusFilter = 'all' | CrossProposalStatus
type SortOrder = 'newest' | 'oldest' | 'expiry'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

interface DaoInfo {
  realmAddress: string
  realmName: string
}

export default function Dashboard() {
  const [proposals, setProposals] = useState<CrossProposal[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [daoSearch, setDaoSearch] = useState('')
  const [selectedDao, setSelectedDao] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOrder>('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/proposals')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(data => { setProposals(data); setLoading(false) })
      .catch(() => { setError('Failed to load proposals.'); setLoading(false) })
  }, [])

  // Unique DAOs across all proposals
  const allDaos = useMemo<DaoInfo[]>(() => {
    const map = new Map<string, string>()
    for (const p of proposals) {
      for (const part of p.participants) {
        if (!map.has(part.realmAddress)) {
          map.set(part.realmAddress, part.realmName || part.realmAddress.slice(0, 8) + '...')
        }
      }
    }
    return Array.from(map.entries()).map(([realmAddress, realmName]) => ({ realmAddress, realmName }))
  }, [proposals])

  // DAOs filtered by search term
  const filteredDaos = useMemo(() =>
    daoSearch
      ? allDaos.filter(d => d.realmName.toLowerCase().includes(daoSearch.toLowerCase()))
      : allDaos,
    [allDaos, daoSearch]
  )

  // Selected DAO info
  const selectedDaoInfo = selectedDao ? allDaos.find(d => d.realmAddress === selectedDao) : null

  // Apply all filters + sort
  const filtered = proposals
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .filter(p => !selectedDao || p.participants.some(part => part.realmAddress === selectedDao))
    .sort((a, b) => {
      if (sort === 'expiry') {
        // Active proposals first (sorted by nearest expiry), then the rest
        const aActive = a.status === 'active' ? 0 : 1
        const bActive = b.status === 'active' ? 0 : 1
        if (aActive !== bActive) return aActive - bActive
        return (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity)
      }
      if (sort === 'oldest') return a.createdAt - b.createdAt
      return b.createdAt - a.createdAt // newest
    })

  return (
    <div className="max-w-5xl mx-auto px-4 py-10" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-fgd-1 mb-2">CrossGov</h1>
          <p className="text-fgd-4">Cross-DAO Coordination for Solana Realms</p>
        </div>
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all w-full sm:w-auto bg-primary hover:bg-primary-dark"
          suppressHydrationWarning
        >
          <Plus size={16} suppressHydrationWarning />
          New Cross-Proposal
        </Link>
      </div>

      {/* Proposal search */}
      <div className="relative mt-8 mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fgd-3" suppressHydrationWarning />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search proposals by title..."
          className="w-full bg-bkg-2 border border-bkg-3 rounded-xl pl-10 pr-3 py-2.5 text-sm text-fgd-1 placeholder-fgd-4 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(203,100%,59%,0.1)] transition-all"
        />
      </div>

      {/* Status filter tabs + Sort */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === f.value
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(203,100%,59%,0.25)]'
                : 'bg-bkg-2 text-fgd-3 hover:bg-bkg-3 hover:text-white border border-bkg-4'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOrder)}
            className="appearance-none bg-bkg-2 border border-bkg-3 rounded-xl pl-3 pr-7 py-1.5 text-xs text-fgd-3 hover:text-white focus:outline-none focus:border-primary/40 transition-all cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="expiry">Expiry soon</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" suppressHydrationWarning />
        </div>
      </div>

      {/* DAO filter */}
      {!loading && allDaos.length > 0 && (
        <div className="mb-6 rounded-xl border border-bkg-3 bg-bkg-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Filter by DAO</p>
            {selectedDao && (
              <button
                onClick={() => { setSelectedDao(null); setDaoSearch('') }}
                className="text-[10px] text-zinc-600 hover:text-white flex items-center gap-1 transition-colors"
              >
                <X size={10} /> Clear
              </button>
            )}
          </div>

          {/* DAO search input */}
          <div className="relative mb-3">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={daoSearch}
              onChange={e => setDaoSearch(e.target.value)}
              placeholder="Search DAOs..."
              className="w-full bg-bkg-1 border border-bkg-3 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-fgd-4 focus:outline-none focus:border-primary/40 transition-all"
            />
          </div>

          {/* DAO pills */}
          <div className="flex flex-wrap gap-2">
            {filteredDaos.map(dao => {
              const isSelected = selectedDao === dao.realmAddress
              return (
                <button
                  key={dao.realmAddress}
                  onClick={() => setSelectedDao(isSelected ? null : dao.realmAddress)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected
                    ? 'border-primary/60 bg-primary/10 text-white'
                    : 'border-bkg-3 bg-bkg-1 text-fgd-3 hover:border-bkg-4 hover:text-white'
                    }`}
                >
                  <DaoAvatar
                    realmName={dao.realmName}
                    realmAddress={dao.realmAddress}
                    size={20}
                  />
                  {dao.realmName}
                  {isSelected && <X size={10} className="text-zinc-400 ml-0.5" />}
                </button>
              )
            })}
            {filteredDaos.length === 0 && daoSearch && (
              <p className="text-xs text-zinc-700">No DAOs match "{daoSearch}"</p>
            )}
          </div>

          {/* Active filter badge */}
          {selectedDaoInfo && (
            <p className="mt-2 text-[10px] text-primary">
              Showing proposals with <span className="font-semibold">{selectedDaoInfo.realmName}</span>
              {' '}({filtered.length} found)
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-bkg-3 bg-bkg-2 p-5 h-44">
              <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-4/5 mb-6" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bkg-2 border border-bkg-3 mb-4">
            <Layers size={28} className="text-fgd-4" suppressHydrationWarning />
          </div>
          <p className="text-zinc-400 text-lg mb-2">
            {proposals.length === 0
              ? 'No cross-proposals yet'
              : selectedDao
                ? `No proposals found with ${selectedDaoInfo?.realmName}`
                : search
                  ? 'No proposals match your search'
                  : 'No proposals match this filter'}
          </p>
          {proposals.length === 0 && (
            <>
              <p className="text-fgd-4 text-sm mb-4">Create your first cross-proposal to coordinate DAO governance</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all bg-primary hover:bg-primary-dark"
              >
                <Plus size={16} suppressHydrationWarning />
                Get Started
              </Link>
            </>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode='popLayout'>
            {filtered.map(p => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
