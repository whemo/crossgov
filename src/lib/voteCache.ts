/**
 * Persistent Vote Cache with Rate Limiting
 * - Saves vote data to disk (survives restarts)
 * - Rate limiting to avoid 429 errors
 * - 15 minute TTL for fresh data
 */

import fs from 'fs'
import path from 'path'
import { VoteRecordInfo } from './realms'

const CACHE_FILE = path.join(process.cwd(), '.vote-cache.json')
const CACHE_TTL = 900_000 // 15 minutes (balance between freshness and RPC cost)

// Rate limiting configuration (Helius allows 10 RPS, we use 8 for safety margin)
const RATE_LIMIT_REQUESTS = 8  // Max 8 requests per window
const RATE_LIMIT_WINDOW = 1000 // 1 second window
const RATE_LIMIT_QUEUE: { ts: number }[] = []

interface CachedVoteData {
  [proposalAddress: string]: {
    data: VoteRecordInfo[]
    ts: number
  }
}

let cache: CachedVoteData = {}
let cacheLoaded = false

// Load cache from disk
function loadCache(): CachedVoteData {
  if (cacheLoaded) return cache
  
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8')
      cache = JSON.parse(data)
      
      // Clean expired entries on load
      const now = Date.now()
      let cleaned = 0
      for (const [key, value] of Object.entries(cache)) {
        if (now - value.ts >= CACHE_TTL) {
          delete cache[key]
          cleaned++
        }
      }
      if (cleaned > 0) {
        console.log(`[VoteCache] Cleaned ${cleaned} expired entries`)
      }
      
      console.log(`[VoteCache] Loaded ${Object.keys(cache).length} entries from disk`)
    }
  } catch (error) {
    console.error('[VoteCache] Failed to load cache:', error)
    cache = {}
  }
  
  cacheLoaded = true
  return cache
}

// Save cache to disk (debounced)
let saveTimeout: NodeJS.Timeout | null = null

function saveCache() {
  if (saveTimeout) clearTimeout(saveTimeout)
  
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
      console.log(`[VoteCache] Saved ${Object.keys(cache).length} entries to disk`)
    } catch (error) {
      console.error('[VoteCache] Failed to save cache:', error)
    }
  }, 1000) // Debounce 1 second
}

// Rate limiting: wait until we can make a request
export async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  
  // Clean old entries from queue
  while (RATE_LIMIT_QUEUE.length > 0 && now - RATE_LIMIT_QUEUE[0].ts > RATE_LIMIT_WINDOW) {
    RATE_LIMIT_QUEUE.shift()
  }
  
  // If at limit, wait
  if (RATE_LIMIT_QUEUE.length >= RATE_LIMIT_REQUESTS) {
    const oldest = RATE_LIMIT_QUEUE[0].ts
    const waitTime = RATE_LIMIT_WINDOW - (now - oldest) + 50 // +50ms buffer
    
    if (waitTime > 0) {
      console.log(`[RateLimit] Queue full (${RATE_LIMIT_QUEUE.length}), waiting ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      // Recursive call to re-check after wait
      return waitForRateLimit()
    }
  }
  
  // Add this request to queue
  RATE_LIMIT_QUEUE.push({ ts: now })
  console.log(`[RateLimit] Request queued (${RATE_LIMIT_QUEUE.length}/${RATE_LIMIT_REQUESTS})`)
}

// Get cached votes
export function getCachedVotes(proposalAddress: string): VoteRecordInfo[] | null {
  loadCache()
  const cached = cache[proposalAddress]
  
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }
  
  return null
}

// Set cached votes
export function setCachedVotes(proposalAddress: string, data: VoteRecordInfo[]) {
  loadCache()
  cache[proposalAddress] = {
    data,
    ts: Date.now()
  }
  saveCache()
}

// Get cache stats
export function getCacheStats() {
  loadCache()
  const now = Date.now()
  const entries = Object.entries(cache)
  const fresh = entries.filter(([, c]) => now - c.ts < CACHE_TTL).length
  const stale = entries.length - fresh
  
  return {
    total: entries.length,
    fresh,
    stale,
    file: CACHE_FILE,
    rateLimitQueue: RATE_LIMIT_QUEUE.length
  }
}

// Clear all cache (for debugging)
export function clearCache() {
  cache = {}
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE)
  }
  console.log('[VoteCache] Cache cleared')
}
