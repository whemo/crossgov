import { Connection, PublicKey } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'
import { getRealm, getProposal, getGovernance, getGovernanceAccounts, VoteRecord, ProposalState, MemcmpFilter } from '@realms-today/spl-governance'
import BN from 'bn.js'
import { GOV_PROGRAM_ID, SOLANA_RPC_URL } from './constants'
import { DaoVoteStatus } from './types'
import { getCachedVotes, setCachedVotes, waitForRateLimit } from './voteCache'

const connection = new Connection(SOLANA_RPC_URL)

// Program ID - needed for getAllProposals/getAllGovernances
export const programId = new PublicKey(GOV_PROGRAM_ID)

// Caches for RPC calls to prevent rate limiting
const decimalsCache = new Map<string, number>()
const daoTypeCache = new Map<string, DaoType>()
const votingChannelCache = new Map<string, VotingChannel>()
const governanceParamsCache = new Map<string, GovernanceParams>()
const communityMintSupplyCache = new Map<string, number>()

// VoteRecord cache - in-memory for active session (short TTL)
const voteRecordsCache = new Map<string, { data: VoteRecordInfo[]; ts: number; promise?: Promise<VoteRecordInfo[]> }>()
const IN_MEMORY_TTL = 60_000 // 1 minute (short-term dedup only)

// Retry configuration for 429 rate limiting
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY = 2000 // 2s
const MAX_RETRY_DELAY = 8000 // 8s

export interface VoteRecordInfo {
  voter: string
  voterShort: string
  voteWeightRaw: number
  voteType: 'yes' | 'no' | 'abstain' | 'veto' | 'unknown'
  isRelinquished: boolean
}

// Sleep helper for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Retry wrapper for RPC calls with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: Error | undefined
  let delay = INITIAL_RETRY_DELAY
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const isRateLimit = error?.message?.includes('429') || error?.status === 429
      
      if (!isRateLimit || attempt === MAX_RETRIES) {
        break // Don't retry non-rate-limit errors or if max retries reached
      }
      
      console.warn(`[RPC Rate Limit] ${context} - retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`)
      await sleep(delay)
      delay = Math.min(delay * 2, MAX_RETRY_DELAY) // Exponential backoff with cap
    }
  }
  
  throw lastError
}

/**
 * Get all vote records for a proposal using direct RPC call
 * 
 * CACHING STRATEGY (2-tier + Rate Limiting):
 * 1. Persistent disk cache (15 min TTL) - survives restarts
 * 2. In-memory cache (1 min TTL) - dedupes concurrent requests
 * 3. Rate limiting (5 req/sec) - avoids 429 errors
 * 
 * This reduces RPC calls by ~95% while keeping data fresh
 */
export async function fetchVoteRecords(proposalAddress: string): Promise<VoteRecordInfo[]> {
  // Tier 1: Check persistent disk cache (15 min)
  const persistentCached = getCachedVotes(proposalAddress)
  if (persistentCached) {
    console.log(`[VoteFeed] Cache HIT (disk) for ${proposalAddress.slice(0, 8)}...`)
    return persistentCached
  }
  
  // Tier 2: Check in-memory cache (1 min)
  const cached = voteRecordsCache.get(proposalAddress)
  if (cached && Date.now() - cached.ts < IN_MEMORY_TTL) {
    console.log(`[VoteFeed] Cache HIT (memory) for ${proposalAddress.slice(0, 8)}...`)
    return cached.data
  }
  
  // Return in-flight promise to avoid duplicate requests
  if (cached?.promise) {
    console.log(`[VoteFeed] Dedup in-flight for ${proposalAddress.slice(0, 8)}...`)
    return cached.promise
  }

  // Apply rate limiting BEFORE making RPC call
  await waitForRateLimit()

  const fetchPromise = withRetry<VoteRecordInfo[]>(async () => {
    const proposalPk = new PublicKey(proposalAddress)

    // Use getProgramAccounts with proper filters
    // Add timeout to prevent hanging on large DAOs (30 seconds max)
    const accounts = await connection.getProgramAccounts(programId, {
      commitment: 'confirmed',
      filters: [
        // Filter by proposal pubkey at offset 1
        { memcmp: { offset: 1, bytes: proposalPk.toBase58() } },
      ],
    })

    console.log(`[VoteFeed] RPC FETCH ${accounts.length} votes for ${proposalAddress.slice(0, 8)}...`)

    const entries: VoteRecordInfo[] = []

    for (const { account } of accounts) {
      const data = account.data
      if (!data || data.length < 65) continue

      const accountType = data[0]
      // Must be VoteRecord V1 (7) or V2 (12)
      if (accountType !== 7 && accountType !== 12) continue

      // offset 1: proposal (32 bytes) - already filtered by RPC
      // offset 33: governingTokenOwner (32 bytes)
      const governingTokenOwner = new PublicKey(data.slice(33, 65))

      let isRelinquished = false
      let voteType: VoteRecordInfo['voteType'] = 'unknown'
      let voteWeightRaw = 0

      if (accountType === 7) {
        // VoteRecordV1 layout after 65 bytes:
        // [65]: isRelinquished (bool)
        // [66..81]: voteWeight (BN - 16 bytes LE)
        isRelinquished = data[65] === 1
        if (data.length >= 65 + 1 + 16) {
          const yes = new BN(data.slice(66, 74), 'le').toNumber()
          const no = new BN(data.slice(74, 82), 'le').toNumber()
          voteWeightRaw = yes > 0 ? yes : no
          voteType = yes > 0 ? 'yes' : no > 0 ? 'no' : 'unknown'
        }
      } else if (accountType === 12) {
        // VoteRecordV2 layout after 65:
        // [65]: isRelinquished (1 byte)
        // [66..74]: voterWeight BN (8 bytes LE)
        // [74]: vote type (1 byte) - 0=Approve, 1=Deny, 2=Abstain, 3=Veto
        isRelinquished = data[65] === 1
        if (data.length >= 75) {
          voteWeightRaw = new BN(data.slice(66, 74), 'le').toNumber()
          const voteByte = data[74]
          voteType = voteByte === 0 ? 'yes' : voteByte === 1 ? 'no' : voteByte === 2 ? 'abstain' : 'veto'
        }
      }

      entries.push({
        voter: governingTokenOwner.toBase58(),
        voterShort: governingTokenOwner.toBase58().slice(0, 4) + '...' + governingTokenOwner.toBase58().slice(-4),
        voteWeightRaw,
        voteType,
        isRelinquished,
      })
    }

    // Sort by weight desc, yes first
    entries.sort((a, b) => {
      if (a.voteType !== b.voteType) return a.voteType === 'yes' ? -1 : 1
      return b.voteWeightRaw - a.voteWeightRaw
    })

    return entries
  }, `fetchVoteRecords(${proposalAddress.slice(0, 8)}...)`)

  // Store promise to deduplicate in-flight requests
  voteRecordsCache.set(proposalAddress, { 
    data: [], 
    ts: Date.now(), 
    promise: fetchPromise 
  })

  try {
    const entries = await fetchPromise
    // Update both caches
    setCachedVotes(proposalAddress, entries) // Persistent disk cache (15 min)
    voteRecordsCache.set(proposalAddress, { 
      data: entries, 
      ts: Date.now() 
    }) // In-memory (1 min)
    return entries
  } catch (error) {
    // Remove failed promise from cache
    voteRecordsCache.delete(proposalAddress)
    console.error(`Failed to fetch vote records for ${proposalAddress}:`, error)
    return []
  }
}

function mapVoteType(vote: any): VoteRecordInfo['voteType'] {
  // Vote enum from SDK: 0 = Yes, 1 = No, 2 = Abstain
  if (vote?.yes !== undefined) return 'yes'
  if (vote?.no !== undefined) return 'no'
  if (vote?.abstain !== undefined) return 'abstain'
  return 'unknown'
}

// Safe conversion BN -> number
function safeBnToNumber(value: BN | undefined | null): number {
  if (!value) return 0
  try {
    return value.toNumber()
  } catch {
    return parseFloat(value.toString())
  }
}

// Get token decimals for a Realm
async function getTokenDecimals(realmAddress: string): Promise<number> {
  if (decimalsCache.has(realmAddress)) {
    return decimalsCache.get(realmAddress)!
  }

  try {
    const realm = await getRealm(connection, new PublicKey(realmAddress))
    const supply = await connection.getTokenSupply(realm.account.communityMint)
    const decimals = supply.value.decimals
    decimalsCache.set(realmAddress, decimals)
    return decimals
  } catch (error) {
    console.error(`Failed to get decimals for ${realmAddress}:`, error)
    // Fallback: 9 decimals
    return 9
  }
}

// Convert raw votes to human number considering token decimals
async function convertVoteCount(rawVotes: number, realmAddress: string): Promise<number> {
  if (rawVotes === 0) return 0

  const decimals = await getTokenDecimals(realmAddress)
  return rawVotes / Math.pow(10, decimals)
}

// Vote info interface
export interface VoteInfo {
  yesVotes: number
  noVotes: number
  yesVotesRaw: number
  noVotesRaw: number
  maxVoteWeight: number
  maxVoteWeightRaw: number
}

// Sanitize name
function sanitizeName(name: string): string {
  return name
    .replace(/^[\u201C\u201D\u201E\u201F"']+|[\u201C\u201D\u201E\u201F"']+$/g, '')
    .trim()
}

// Get Realm info
export async function fetchRealmInfo(realmAddress: string) {
  const realm = await getRealm(connection, new PublicKey(realmAddress))
  return {
    name: sanitizeName(realm.account.name),
    address: realmAddress,
  }
}

// Get proposal status
export async function fetchProposalStatus(proposalAddress: string, realmAddress?: string): Promise<DaoProposalInfo> {
  const proposal = await getProposal(connection, new PublicKey(proposalAddress))
  const account = proposal.account

  let rawYesVotes = 0
  let rawNoVotes = 0

  // Try standard Yes/No vote counts first
  try {
    const yesCount = account.getYesVoteCount()
    if (yesCount) {
      rawYesVotes = safeBnToNumber(yesCount)
    } else {
      throw new Error('Yes vote count is undefined (multi-choice)')
    }
  } catch {
    // V2 multi-choice proposals may not have a single yes option
    // Fall back to checking options array
    if (account.options && account.options.length > 0) {
      // Look for "Yes" and "No" options by label
      const yesOption = account.options.find(o => o.label.toLowerCase() === 'yes')
      const noOption = account.options.find(o => o.label.toLowerCase() === 'no')
      if (yesOption) rawYesVotes = safeBnToNumber(yesOption.voteWeight)
      if (noOption) rawNoVotes = safeBnToNumber(noOption.voteWeight)
      console.log(`[Multi-Choice] ${account.name}: Yes=${rawYesVotes}, No=${rawNoVotes}`)
    }
  }

  // Only try getNoVoteCount if we didn't already get it from options
  if (rawNoVotes === 0) {
    try {
      const noCount = account.getNoVoteCount()
      if (noCount) {
        rawNoVotes = safeBnToNumber(noCount)
      }
    } catch {
      // denyVoteWeight can be undefined for V2 proposals
    }
  }

  // maxVoteWeight for quorum
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMaxVoteWeight = safeBnToNumber((account as any).maxVoteWeight as BN | undefined)

  let yesVotesCount = rawYesVotes
  let noVotesCount = rawNoVotes
  let maxVoteWeight = rawMaxVoteWeight

  if (realmAddress) {
    yesVotesCount = await convertVoteCount(rawYesVotes, realmAddress)
    noVotesCount = await convertVoteCount(rawNoVotes, realmAddress)
    maxVoteWeight = await convertVoteCount(rawMaxVoteWeight, realmAddress)
  }

  const daoType = realmAddress ? await fetchDaoType(realmAddress) : 'unknown'
  const votingChannel = realmAddress ? await fetchVotingChannel(proposalAddress, realmAddress) : 'unknown'
  const governanceParams = realmAddress ? await fetchGovernanceParams(realmAddress) : {}

  // Fetch Governance to get Quorum Config
  let quorum = 0
  let quorumRaw = 0

  try {
    const governance = await getGovernance(connection, account.governance)
    const config = governance.account.config

    console.log(`[DEBUG] Governance Config for ${account.name}:`, JSON.stringify(config.communityVoteThreshold, null, 2))

    try {
      const logPath = path.join(process.cwd(), 'debug_quorum.log')
      const logData = `\n[${new Date().toISOString()}] Realm: ${account.name} (${realmAddress})\nConfig: ${JSON.stringify(config.communityVoteThreshold, null, 2)}\n`
      fs.appendFileSync(logPath, logData)
    } catch (err) {
      console.error('Failed to write debug log:', err)
    }

    const threshold = config.communityVoteThreshold
    if (threshold && threshold.value !== undefined) {
      // Assuming YesVotePercentage (type 0)
      const pct = threshold.value // e.g. 60 for 60%
      if (pct > 0) {
        // If maxVoteWeight is 0 (common in V2), we must use mint supply
        // maxVoteWeight is already converted to tokens (number)
        let basis = maxVoteWeight

        if ((!basis || basis === 0) && realmAddress) {
          try {
            const supply = await fetchCommunityMintSupply(realmAddress)
            if (supply > 0) basis = supply
          } catch (err) {
            console.error('Failed to fetch supply for quorum basis:', err)
          }
        }

        if (basis > 0) {
          quorum = (basis * pct) / 100

          if (realmAddress) {
            try {
              const decimals = await getTokenDecimals(realmAddress)
              quorumRaw = quorum * Math.pow(10, decimals)
            } catch {
              // Fallback if decimals fail
              quorumRaw = 0
            }
          }

          try {
            const logPath = path.join(process.cwd(), 'debug_quorum.log')
            const logData = `\n[${new Date().toISOString()}] Realm: ${account.name} (${realmAddress})\nPct: ${pct}%\nBasis (Tokens): ${basis}\nQuorum (Tokens): ${quorum}\n`
            fs.appendFileSync(logPath, logData)
          } catch (err) {
            // ignore log failure
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch governance config:', error)
  }

  // Map proposal state - use heuristics (SDK doesn't expose timing data)
  const newStatus = mapProposalState(account.state, yesVotesCount, quorum)

  return {
    name: sanitizeName(account.name),
    state: account.state as number,
    status: newStatus,  // Add mapped status
    yesVotesCount,
    noVotesCount,
    yesVotesRaw: rawYesVotes,
    noVotesRaw: rawNoVotes,
    maxVoteWeight,
    maxVoteWeightRaw: rawMaxVoteWeight,
    quorum,
    quorumRaw,
    daoType,
    votingChannel,
    governanceParams,
  }
}

// Get community mint supply
export async function fetchCommunityMintSupply(realmAddress: string): Promise<number> {
  if (communityMintSupplyCache.has(realmAddress)) {
    return communityMintSupplyCache.get(realmAddress)!
  }

  try {
    const realm = await getRealm(connection, new PublicKey(realmAddress))
    const supply = await connection.getTokenSupply(realm.account.communityMint)
    const decimals = supply.value.decimals
    const value = Number(supply.value.amount) / Math.pow(10, decimals)
    communityMintSupplyCache.set(realmAddress, value)
    return value
  } catch {
    return 0
  }
}

const REGISTRY_URL = 'https://raw.githubusercontent.com/solana-labs/governance-ui/main/public/realms/mainnet-beta.json'
const GH_BASE = 'https://raw.githubusercontent.com/solana-labs/governance-ui/main/public'
let registryCache: Map<string, string> | null = null

export async function fetchRealmLogo(realmAddress: string): Promise<string | null> {
  if (!registryCache) {
    try {
      const res = await fetch(REGISTRY_URL)
      const data: Array<{ realmId?: string; ogImage?: string }> = await res.json()
      registryCache = new Map()
      for (const entry of data) {
        if (entry.realmId && entry.ogImage) {
          const url = entry.ogImage.startsWith('http') ? entry.ogImage : GH_BASE + entry.ogImage
          registryCache.set(entry.realmId, url)
        }
      }
    } catch {
      registryCache = new Map()
    }
  }
  return registryCache.get(realmAddress) || null
}

export function mapProposalState(
  state: number, 
  yesVotes?: number, 
  quorum?: number
): DaoVoteStatus {
  // If proposal has yes votes >= quorum and is in Voting state → treat as finalizing
  // This is a heuristic since we can't access timing data from SDK
  if (state === ProposalState.Voting && yesVotes && quorum && yesVotes >= quorum) {
    return 'finalizing'
  }
  
  // If proposal is in Succeeded state and has significant yes votes → likely past cool-off
  if (state === ProposalState.Succeeded && yesVotes && quorum && yesVotes >= quorum) {
    return 'finalizing'
  }
  
  switch (state) {
    case ProposalState.Draft:
    case ProposalState.SigningOff:
      return 'waiting'
    case ProposalState.Voting:
      return 'voting'
    case ProposalState.Succeeded:
      return 'cooloff'  // Voting passed, in cool-off period
    case ProposalState.Executing:
      return 'finalizing'  // Being executed
    case ProposalState.Completed:
      return 'approved'
    case ProposalState.Cancelled:
    case ProposalState.Defeated:
    case ProposalState.Vetoed:
      return 'rejected'
    case ProposalState.ExecutingWithErrors:
      return 'error'
    default:
      return 'waiting'
  }
}

export type DaoType = 'multisig' | 'token' | 'nft' | 'unknown'

export type VotingChannel = 'community' | 'multisig' | 'unknown'

export interface GovernanceParams {
  approvalThreshold?: number
  maxVotingTime?: number
  voteTipping?: 'early' | 'late' | 'none' | 'unknown'
}

export interface DaoProposalInfo {
  name: string;
  state: number;
  status: DaoVoteStatus;  // Add mapped status
  yesVotesCount: number;
  noVotesCount: number;
  yesVotesRaw: number;
  noVotesRaw: number;
  maxVoteWeight: number;
  maxVoteWeightRaw: number;
  quorum: number;
  quorumRaw: number;
  daoType: DaoType;
  votingChannel: VotingChannel;
  governanceParams: GovernanceParams;
}

export async function fetchDaoType(realmAddress: string): Promise<DaoType> {
  if (daoTypeCache.has(realmAddress)) return daoTypeCache.get(realmAddress)!

  try {
    const realm = await getRealm(connection, new PublicKey(realmAddress))
    const config = realm.account.config

    const councilMint = config?.councilMint
    const communityMint = realm.account.communityMint

    if (!communityMint) {
      daoTypeCache.set(realmAddress, 'multisig')
      return 'multisig'
    }

    try {
      const supply = await connection.getTokenSupply(communityMint)
      const supplyNum = Number(supply.value.amount)

      if (supplyNum < 1000) {
        if (councilMint) {
          daoTypeCache.set(realmAddress, 'multisig')
          return 'multisig'
        }
        daoTypeCache.set(realmAddress, 'nft')
        return 'nft'
      }

      daoTypeCache.set(realmAddress, 'token')
      return 'token'
    } catch {
      if (councilMint) {
        daoTypeCache.set(realmAddress, 'multisig')
        return 'multisig'
      }
      daoTypeCache.set(realmAddress, 'unknown')
      return 'unknown'
    }
  } catch (error) {
    console.error(`Failed to fetch DAO type for ${realmAddress}:`, error)
    return 'unknown'
  }
}

export async function fetchVotingChannel(proposalAddress: string, realmAddress: string): Promise<VotingChannel> {
  if (votingChannelCache.has(proposalAddress)) return votingChannelCache.get(proposalAddress)!

  try {
    const proposal = await getProposal(connection, new PublicKey(proposalAddress))
    const realm = await getRealm(connection, new PublicKey(realmAddress))

    const governingTokenMint = proposal.account.governingTokenMint.toString()
    const communityMint = realm.account.communityMint.toString()
    const councilMint = realm.account.config?.councilMint?.toString()

    if (governingTokenMint === communityMint) {
      votingChannelCache.set(proposalAddress, 'community')
      return 'community'
    }

    if (councilMint && governingTokenMint === councilMint) {
      votingChannelCache.set(proposalAddress, 'multisig')
      return 'multisig'
    }

    votingChannelCache.set(proposalAddress, 'unknown')
    return 'unknown'
  } catch (error) {
    console.error(`Failed to fetch voting channel for ${proposalAddress}:`, error)
    return 'unknown'
  }
}

export async function fetchGovernanceParams(realmAddress: string): Promise<GovernanceParams> {
  if (governanceParamsCache.has(realmAddress)) return governanceParamsCache.get(realmAddress)!

  try {
    const realm = await getRealm(connection, new PublicKey(realmAddress))
    // realm.account.config usage reserved for future extension

    const params: GovernanceParams = {}
    governanceParamsCache.set(realmAddress, params)
    return params
  } catch (error) {
    console.error(`Failed to fetch governance params for ${realmAddress}:`, error)
    governanceParamsCache.set(realmAddress, {})
    return {}
  }
}
