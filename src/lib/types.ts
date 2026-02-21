// Single DAO voting status
export type DaoVoteStatus = 
  | 'waiting'       // Draft, SigningOff
  | 'voting'        // Voting
  | 'cooloff'       // Succeeded (waiting for cool-off period)
  | 'finalizing'    // Executing
  | 'approved'      // Completed
  | 'rejected'      // Defeated, Cancelled, Vetoed
  | 'error'         // ExecutingWithErrors
  | 'expired'       // Voting deadline passed

// DAO type
export type DaoType = 'multisig' | 'token' | 'nft' | 'unknown'

// Voting channel
export type VotingChannel = 'community' | 'multisig' | 'unknown'

// Governance parameters
export interface GovernanceParams {
  approvalThreshold?: number    // Approval percentage (0-100)
  maxVotingTime?: number        // Max voting time in days
  voteTipping?: 'early' | 'late' | 'none' | 'unknown'
}

// Overall cross-proposal status
export type CrossProposalStatus = 'active' | 'approved' | 'rejected' | 'expired'

// Approval condition
export type ApprovalCondition = 'all' | 'majority' | 'weighted' | 'first'

// Status history entry
export interface StatusEvent {
  status: DaoVoteStatus | CrossProposalStatus
  timestamp: number
  label: string             // "Mango DAO → Voting"
}

// Single DAO participant in a cross-proposal
export interface DaoParticipant {
  realmAddress: string          // Realm (DAO) Pubkey address on Realms
  realmName: string             // DAO name (for display)
  proposalAddress: string       // Proposal Pubkey address in this Realm
  proposalName: string          // Proposal name (for display)
  status: DaoVoteStatus         // Current voting status
  yesVotes: number              // Number of "for" votes (in tokens)
  noVotes: number               // Number of "against" votes (in tokens)
  yesVotesRaw?: number          // Raw "for" value (for display if < 1 token)
  noVotesRaw?: number           // Raw "against" value (for display if < 1 token)
  totalVoters: number           // Total possible votes
  weight: number                // DAO weight for weighted condition (default 1)
  maxVoteWeight: number         // Max possible vote weight (for quorum, in tokens)
  maxVoteWeightRaw: number      // Max possible vote weight (raw value)
  quorum: number                // Quorum threshold (number of "for" votes to pass)
  quorumRaw: number             // Quorum threshold (raw value)
  daoType?: DaoType             // DAO type: multisig, token, nft
  votingChannel?: VotingChannel // Voting channel: community or council
  governanceParams?: GovernanceParams  // Governance parameters
  isSowellian?: boolean         // For demo/fake proposals that shouldn't be synced
}

// Cross-proposal (main entity)
export interface CrossProposal {
  id: string                    // Unique ID (uuid)
  title: string                 // Title
  description: string           // Description
  creator: string               // Creator wallet address
  participants: DaoParticipant[] // List of DAO participants
  approvalCondition: ApprovalCondition  // "all" or "majority"
  status: CrossProposalStatus   // Overall status
  statusHistory: StatusEvent[]   // Timeline of status changes
  createdAt: number             // Creation date (timestamp)
  expiresAt: number             // Deadline (timestamp)
}
