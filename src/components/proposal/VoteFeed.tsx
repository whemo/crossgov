'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, Download, Vote } from 'lucide-react'

interface VoteEntry {
  voter: string
  voterShort: string
  voteWeightRaw: number
  voteType: 'yes' | 'no' | 'abstain' | 'veto' | 'unknown'
  isRelinquished: boolean
}

interface VoteFeedProps {
  proposalAddress: string
  realmName: string
  decimals?: number
  /** true = voting is ongoing (auto-refresh, show "Live Votes"). false = finished (no auto-refresh, show "Vote Feed") */
  isActive?: boolean
  /** Known totals from proposal JSON — used as fallback when individual records aren't loadable */
  fallbackYes?: number
  fallbackNo?: number
  /** If true, fallback values are in raw units (not tokens) */
  useRawValues?: boolean
  /** If true, skip RPC calls entirely and only show fallback totals */
  disableRpc?: boolean
}

function formatTokens(val: number): string {
  if (val === 0) return '0'
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M'
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K'
  if (val >= 1) return val.toFixed(0)
  if (val >= 0.01) return val.toFixed(2)
  // For very small values, use scientific notation or show as < 0.01
  if (val < 0.00001) return '< 0.01'
  return val.toFixed(4)
}

function formatFallback(val: number, useRaw?: boolean): string {
  // If value is already in tokens (> 1), format as tokens
  if (val >= 1) {
    return formatTokens(val)
  }
  
  // If useRaw is true and value is very small, it's a raw value
  if (useRaw && val > 0 && val < 1) {
    // For raw values like 1e-9, show as integer
    return val.toFixed(0)
  }
  
  // Otherwise format as tokens
  return formatTokens(val)
}

function formatWeight(raw: number, decimals: number): string {
  if (raw === 0) return '—'
  const tokens = raw / Math.pow(10, decimals)
  
  // For very small token amounts (< 0.01), show raw units instead
  // This matches Realms.today behavior for low-decimal tokens like BONK
  if (tokens < 0.01) {
    return raw.toString()
  }
  
  return formatTokens(tokens)
}

export default function VoteFeed({
  proposalAddress,
  realmName,
  decimals = 6,
  isActive = true,
  fallbackYes,
  fallbackNo,
  useRawValues = false,
  disableRpc = false,
}: VoteFeedProps) {
  const [votes, setVotes] = useState<VoteEntry[]>([])
  const [cachedVotes, setCachedVotes] = useState<VoteEntry[]>([])
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Lazy load: only fetch when component is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Unobserve after first visibility to prevent re-triggering
          if (containerRef.current) {
            observer.unobserve(containerRef.current)
          }
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, []) // Empty deps - only setup once

  const load = useCallback(async () => {
    // If RPC is disabled, skip loading individual votes
    if (disableRpc) {
      setInitialLoad(false)
      return
    }

    try {
      const r = await fetch(`/api/votes/${proposalAddress}`)
      const data = await r.json()
      
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${data.error || 'Failed'}`)
      }
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Update votes (even if empty array)
      setVotes(data as VoteEntry[])
      setCachedVotes(prev => data as VoteEntry[])
      setLastRefresh(new Date())
      setError('')
    } catch (e) {
      const msg = (e as Error).message || 'Failed'
      
      // Don't show rate limit errors to user
      if (!msg.includes('429') && !msg.includes('rate limit') && !msg.includes('NetworkError')) {
        setError(msg)
      }
      
      // Keep any cached votes we have
      setCachedVotes(prev => {
        if (prev.length > 0) {
          setVotes(prev)
        }
        return prev
      })
    } finally {
      // Always mark as loaded (prevents infinite loading)
      setInitialLoad(false)
    }
  }, [proposalAddress, disableRpc])  // Removed cachedVotes from dependencies

  useEffect(() => {
    // Only load when component is visible
    if (isVisible) {
      // Add staggered delay based on proposal address to prevent rate limit bursts
      // This spreads out RPC calls over time for pages with many DAOs
      const staggerDelay = (proposalAddress.charCodeAt(proposalAddress.length - 1) % 5) * 200 // 0-800ms
      
      const timeoutId = setTimeout(() => {
        load()
        // Stale-while-revalidate: refresh every 15 min for active, 60 min for finished
        const interval = setInterval(() => load(), isActive ? 900_000 : 3_600_000)
        return () => clearInterval(interval)
      }, staggerDelay)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isVisible, isActive, load, proposalAddress])

  const yesVotes = votes.filter(v => v.voteType === 'yes')
  const noVotes = votes.filter(v => v.voteType === 'no')
  const label = isActive ? 'Live Votes' : 'Vote Feed'

  // Count unique voters
  const yesVoterCount = yesVotes.length
  const noVoterCount = noVotes.length
  const totalVoterCount = yesVoterCount + noVoterCount

  // Determine if data is from cache
  const isFromCache = votes.length > 0 && lastRefresh && (Date.now() - lastRefresh.getTime() > 60000)

  const downloadCSV = () => {
    const rows = [
      ['voter', 'type', 'weight_raw', 'weight_tokens', 'relinquished'],
      ...votes.map(v => [
        v.voter,
        v.voteType,
        v.voteWeightRaw,
        (v.voteWeightRaw / Math.pow(10, decimals)).toFixed(6),
        v.isRelinquished,
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `votes_${proposalAddress.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Whether we have fallback totals to show instead of "no records"
  const hasFallback = (fallbackYes != null && fallbackYes > 0) || (fallbackNo != null && fallbackNo > 0)

  // If RPC is disabled, always show fallback mode
  const showFallbackOnly = disableRpc || (votes.length === 0 && hasFallback)

  return (
    <div ref={containerRef} className="rounded-xl border border-bkg-3 bg-bkg-2 p-4" style={{ height: '200px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-fgd-1 truncate">{realmName}</p>
          <p className="text-[10px] text-fgd-3 flex items-center gap-1">
            {isActive && !disableRpc && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />}
            {disableRpc || votes.length === 0 ? 'Vote Totals' : label}
            {error && votes.length > 0 && (
              <span className="text-[9px] text-warning/70">(cached)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastRefresh && !disableRpc && votes.length > 0 && (
            <p className={`text-[8px] ${error ? 'text-warning/70' : 'text-fgd-4'}`}>
              {error ? 'Cached: ' : ''}{lastRefresh.toLocaleTimeString()}
            </p>
          )}
          {!disableRpc && votes.length > 0 && (
            <button
              onClick={downloadCSV}
              title="Download votes as CSV"
              className="p-1 rounded-lg hover:bg-bkg-3 text-fgd-4 hover:text-fgd-1 transition-colors"
            >
              <Download size={10} />
            </button>
          )}
        </div>
      </div>

      {disableRpc ? (
        // Fallback mode: show only totals
        hasFallback ? (
          <div className="flex flex-col justify-center h-full">
            <div className="flex gap-3 mb-2">
              <span className="text-[10px] font-semibold text-success">
                FOR: {formatFallback(fallbackYes ?? 0, useRawValues)}
              </span>
              <span className="text-[10px] font-semibold text-error">
                AGAINST: {formatFallback(fallbackNo ?? 0, useRawValues)}
              </span>
            </div>
            <p className="text-[9px] text-fgd-4">Live voter data unavailable (RPC disabled)</p>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center text-center" style={{ height: '120px' }}>
            <div className="w-10 h-10 rounded-full bg-bkg-3 flex items-center justify-center mb-2">
              <Vote size={16} className="text-fgd-4" suppressHydrationWarning />
            </div>
            <p className="text-[10px] text-fgd-4">No vote data available</p>
          </div>
        )
      ) : initialLoad ? (
        <div className="flex items-center justify-center" style={{ height: '120px' }}>
          <Loader2 size={18} className="animate-spin text-primary" suppressHydrationWarning />
        </div>
      ) : votes.length === 0 && !hasFallback ? (
        <div className="flex flex-col justify-center items-center text-center" style={{ height: '120px' }}>
          <div className="w-10 h-10 rounded-full bg-bkg-3 flex items-center justify-center mb-2">
            <Vote size={16} className="text-fgd-4" suppressHydrationWarning />
          </div>
          <p className="text-[10px] text-fgd-4">No votes yet</p>
        </div>
      ) : votes.length === 0 && hasFallback ? (
        // No individual votes loaded yet, but we have totals from DB
        <div className="flex flex-col justify-center items-center text-center" style={{ height: '120px' }}>
          <div className="w-10 h-10 rounded-full bg-bkg-3 flex items-center justify-center mb-2">
            <Loader2 size={18} className="animate-spin text-primary" suppressHydrationWarning />
          </div>
          <p className="text-[10px] text-fgd-3">Collecting vote data...</p>
        </div>
      ) : (
        <>
          {/* Summary with voter counts */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-3">
              <span className="text-[10px] font-semibold text-success">
                FOR: {yesVoterCount} {yesVoterCount === 1 ? 'voter' : 'voters'}
              </span>
              <span className="text-[10px] font-semibold text-error">
                AGAINST: {noVoterCount} {noVoterCount === 1 ? 'voter' : 'voters'}
              </span>
            </div>
            <span className="text-[9px] text-fgd-4">
              Total: {totalVoterCount}
            </span>
          </div>

          {/* Scrollable vote list */}
          <div className="overflow-y-auto" style={{ height: '100px' }}>
            <div className="space-y-1.5 pr-1">
            {votes.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1 px-2 rounded-lg text-[10px] border gap-2"
                style={{ whiteSpace: 'nowrap' }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className={`shrink-0 font-bold text-[9px] tracking-wide ${v.voteType === 'yes' ? 'text-success' : v.voteType === 'no' ? 'text-error' : 'text-fgd-3'
                    }`}>
                    {v.voteType === 'yes' ? 'FOR' : v.voteType === 'no' ? 'AGN' : v.voteType.toUpperCase()}
                  </span>
                  <a
                    href={`https://solscan.io/account/${v.voter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-fgd-4 hover:text-fgd-1 hover:underline transition-colors truncate"
                  >
                    {v.voterShort}
                  </a>
                  {v.isRelinquished && (
                    <span className="text-[8px] text-fgd-4 border border-bkg-3 rounded px-0.5 shrink-0">rev.</span>
                  )}
                </div>
                <span className={`shrink-0 font-medium tabular-nums ${v.voteType === 'yes' ? 'text-success/70' : v.voteType === 'no' ? 'text-error/70' : 'text-fgd-3'
                  }`}>
                  {formatWeight(v.voteWeightRaw, decimals)}
                </span>
              </div>
            ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
