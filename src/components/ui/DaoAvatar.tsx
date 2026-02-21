'use client'

import { useState, useEffect } from 'react'
import { DaoVoteStatus } from '@/lib/types'

const REGISTRY_URL =
  'https://raw.githubusercontent.com/solana-labs/governance-ui/main/public/realms/mainnet-beta.json'
const GH_BASE =
  'https://raw.githubusercontent.com/solana-labs/governance-ui/main/public'

// Module-level cache: fetched once per page session
let registryPromise: Promise<Map<string, string>> | null = null

function resolveLogoUrl(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  // Relative path like "/realms/Jito/jito.png" → absolute GitHub raw URL
  return GH_BASE + raw
}

function getRegistry(): Promise<Map<string, string>> {
  if (!registryPromise) {
    registryPromise = fetch(REGISTRY_URL)
      .then(r => r.json())
      .then((data: Array<{ realmId?: string; ogImage?: string }>) => {
        const map = new Map<string, string>()
        for (const entry of data) {
          if (entry.realmId && entry.ogImage) {
            map.set(entry.realmId, resolveLogoUrl(entry.ogImage))
          }
        }
        return map
      })
      .catch(() => new Map<string, string>())
  }
  return registryPromise
}

function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 55%, 45%)`
}

const statusRingColor: Record<DaoVoteStatus, string> = {
  waiting: 'ring-fgd-4/50',
  voting: 'ring-warning/60',
  cooloff: 'ring-success/60',
  finalizing: 'ring-success/60',
  approved: 'ring-success/60',
  rejected: 'ring-error/60',
  error: 'ring-error/60',
  expired: 'ring-fgd-4/50',
}

interface DaoAvatarProps {
  realmName: string
  realmAddress: string
  size?: number
  ring?: boolean
  status?: DaoVoteStatus
}

export default function DaoAvatar({ realmName, realmAddress, size = 48, ring = false, status }: DaoAvatarProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    getRegistry().then(map => {
      const url = map.get(realmAddress)
      if (url) setLogoUrl(url)
      setResolved(true)
    })
  }, [realmAddress])

  const initials = (realmName || realmAddress).slice(0, 2).toUpperCase()
  const bgColor = hashColor(realmAddress)

  // Status-colored ring or default dark ring for overlap stacking
  const ringClass = status
    ? `ring-2 ${statusRingColor[status]}`
    : ring
      ? 'ring-2 ring-bkg-1'
      : ''

  // Show initials: while loading registry, if no logo found, or if img failed
  if (!resolved || !logoUrl || imgError) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 font-semibold text-white ${ringClass}`}
        style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={logoUrl}
      alt={realmName}
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 bg-black ${ringClass}`}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  )
}
