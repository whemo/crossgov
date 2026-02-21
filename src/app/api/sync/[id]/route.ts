import { NextRequest, NextResponse } from 'next/server'
import { getCrossProposal, updateCrossProposal } from '@/lib/db'
import { fetchProposalStatus, mapProposalState, fetchCommunityMintSupply, fetchRealmInfo } from '@/lib/realms'
import { DaoParticipant, ApprovalCondition, CrossProposalStatus, StatusEvent } from '@/lib/types'

function calculateOverallStatus(
  participants: DaoParticipant[],
  condition: ApprovalCondition,
  expiresAt: number
): CrossProposalStatus {
  const now = Date.now()
  if (now > expiresAt) return 'expired'

  const approvedCount = participants.filter(p => 
    p.status === 'approved' || p.status === 'cooloff' || p.status === 'finalizing'
  ).length
  const rejectedCount = participants.filter(p => 
    p.status === 'rejected' || p.status === 'error'
  ).length
  const totalCount = participants.length

  switch (condition) {
    case 'all':
      if (rejectedCount > 0) return 'rejected'
      if (approvedCount === totalCount) return 'approved'
      break

    case 'majority':
      if (approvedCount > totalCount / 2) return 'approved'
      if (rejectedCount > totalCount / 2) return 'rejected'
      break

    case 'weighted': {
      const totalWeight = participants.reduce((s, p) => s + (p.weight || 1), 0)
      const approvedWeight = participants
        .filter(p => p.status === 'approved' || p.status === 'cooloff' || p.status === 'finalizing')
        .reduce((s, p) => s + (p.weight || 1), 0)
      const rejectedWeight = participants
        .filter(p => p.status === 'rejected' || p.status === 'error')
        .reduce((s, p) => s + (p.weight || 1), 0)
      if (approvedWeight > totalWeight / 2) return 'approved'
      if (rejectedWeight > totalWeight / 2) return 'rejected'
      break
    }

    case 'first':
      if (approvedCount > 0) return 'approved'
      if (rejectedCount === totalCount) return 'rejected'
      break
  }

  return 'active'
}

// GET /api/sync/[id] — update statuses from blockchain
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const proposal = getCrossProposal(id)
  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  const newEvents: StatusEvent[] = []
  const now = Date.now()

  // Pre-fetch community mint supply per unique realm (cached, avoids duplicate RPC calls)
  const supplyCache = new Map<string, number>()
  const uniqueRealms = [...new Set(proposal.participants.map(p => p.realmAddress))]
  for (const realmAddr of uniqueRealms) {
    supplyCache.set(realmAddr, await fetchCommunityMintSupply(realmAddr))
  }

  // Sequential sync to avoid mainnet RPC rate limiting
  const updatedParticipants: DaoParticipant[] = []
  for (const participant of proposal.participants) {
    try {
      // Skip sync for Sowellian/demo proposals (they have fake addresses)
      if (participant.isSowellian) {
        updatedParticipants.push(participant)
        continue
      }
      
      const onchainStatus = await fetchProposalStatus(participant.proposalAddress, participant.realmAddress)
      const newStatus = onchainStatus.status  // Use pre-mapped status from fetchProposalStatus

      if (newStatus !== participant.status) {
        const name = participant.realmName || participant.realmAddress.slice(0, 8) + '...'
        newEvents.push({
          status: newStatus,
          timestamp: now,
          label: `${name} → ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        })
      }

      let maxVoteWeight = onchainStatus.maxVoteWeight
        || participant.maxVoteWeight
        || supplyCache.get(participant.realmAddress)
        || 0

      // Sanity check: maxVoteWeight cannot be less than current votes cast
      const currentVotes = onchainStatus.yesVotesCount + onchainStatus.noVotesCount
      if (maxVoteWeight < currentVotes) {
        maxVoteWeight = supplyCache.get(participant.realmAddress) || maxVoteWeight
      }

      // Resolve realm name if missing
      let realmName = participant.realmName
      if (!realmName) {
        try {
          const info = await fetchRealmInfo(participant.realmAddress)
          realmName = info.name
        } catch { /* keep empty */ }
      }

      updatedParticipants.push({
        ...participant,
        realmName,
        proposalName: onchainStatus.name || participant.proposalName,
        status: newStatus,
        yesVotes: onchainStatus.yesVotesCount,
        noVotes: onchainStatus.noVotesCount,
        yesVotesRaw: onchainStatus.yesVotesRaw,
        noVotesRaw: onchainStatus.noVotesRaw,
        maxVoteWeight,
        maxVoteWeightRaw: onchainStatus.maxVoteWeightRaw,
        quorum: onchainStatus.quorum,
        quorumRaw: onchainStatus.quorumRaw,
        daoType: onchainStatus.daoType,
        votingChannel: onchainStatus.votingChannel,
        governanceParams: onchainStatus.governanceParams,
      })
    } catch (error) {
      console.error(`Failed to sync participant ${participant.realmAddress}:`, error)
      // Even on failure, try to set maxVoteWeight from supply cache
      updatedParticipants.push({
        ...participant,
        maxVoteWeight: participant.maxVoteWeight || supplyCache.get(participant.realmAddress) || 0,
        quorum: participant.quorum || 0,
        quorumRaw: participant.quorumRaw || 0,
      })
    }
  }

  const overallStatus = calculateOverallStatus(
    updatedParticipants,
    proposal.approvalCondition,
    proposal.expiresAt
  )

  if (overallStatus !== proposal.status) {
    newEvents.push({
      status: overallStatus,
      timestamp: now,
      label: `Overall → ${overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}`,
    })
  }

  const statusHistory = [...(proposal.statusHistory || []), ...newEvents]

  updateCrossProposal(id, {
    participants: updatedParticipants,
    status: overallStatus,
    statusHistory,
  })

  const updated = { ...proposal, participants: updatedParticipants, status: overallStatus, statusHistory }
  return NextResponse.json(updated)
}
