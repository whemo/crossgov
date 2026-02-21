import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAllCrossProposals, saveCrossProposal } from '@/lib/db'
import { CrossProposal } from '@/lib/types'

// GET /api/proposals — get all cross-proposals
export async function GET() {
  const proposals = getAllCrossProposals()
  return NextResponse.json(proposals)
}

// POST /api/proposals — create a new cross-proposal
export async function POST(request: NextRequest) {
  const body = await request.json()

  const { title, description, creator, participants, approvalCondition, expiresAt } = body

  if (!title || !description || !creator || !participants?.length || !approvalCondition || !expiresAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (participants.length < 2) {
    return NextResponse.json({ error: 'At least 2 DAO participants required' }, { status: 400 })
  }

  if (participants.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 DAO participants allowed' }, { status: 400 })
  }

  const proposal: CrossProposal = {
    id: randomUUID(),
    title,
    description,
    creator,
    participants: participants.map((p: { realmAddress: string; realmName?: string; proposalAddress: string; proposalName?: string; weight?: number }) => ({
      realmAddress: p.realmAddress,
      realmName: p.realmName || '',
      proposalAddress: p.proposalAddress,
      proposalName: p.proposalName || '',
      status: 'waiting' as const,
      yesVotes: 0,
      noVotes: 0,
      totalVoters: 0,
      weight: p.weight || 1,
      maxVoteWeight: 0,
      maxVoteWeightRaw: 0,
      quorum: 0,
      quorumRaw: 0,
    })),
    approvalCondition,
    status: 'active',
    statusHistory: [{ status: 'active', timestamp: Date.now(), label: 'Cross-proposal created' }],
    createdAt: Date.now(),
    expiresAt,
  }

  saveCrossProposal(proposal)

  return NextResponse.json(proposal, { status: 201 })
}
