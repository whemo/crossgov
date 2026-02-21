import { NextRequest, NextResponse } from 'next/server'
import { fetchVoteRecords } from '@/lib/realms'

export interface VoteEntry {
  voter: string
  voterShort: string
  voteWeightRaw: number
  voteType: 'yes' | 'no' | 'abstain' | 'veto' | 'unknown'
  isRelinquished: boolean
}

// Cache 2 minutes to reduce RPC calls and avoid rate limits
const cache = new Map<string, { data: VoteEntry[]; ts: number }>()
const CACHE_TTL = 120_000

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { proposalId } = await params

  const cached = cache.get(proposalId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    // Use SDK to fetch vote records
    const entries = await fetchVoteRecords(proposalId)

    cache.set(proposalId, { data: entries, ts: Date.now() })
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Failed to fetch vote records:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
