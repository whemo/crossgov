'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface DaoEntryData {
  realmAddress: string
  realmName: string
  proposalAddress: string
  proposalName: string
  weight: number
}

interface Props {
  index: number
  data: DaoEntryData
  onChange: (index: number, data: DaoEntryData) => void
  onRemove: (index: number) => void
  canRemove: boolean
  showWeight: boolean
}

function ResolveIndicator({ status }: { status: 'idle' | 'loading' | 'ok' | 'error'; }) {
  if (status === 'idle') return null
  if (status === 'loading') return <Loader2 size={14} className="animate-spin text-fgd-4" />
  if (status === 'ok') return <CheckCircle size={14} className="text-success" />
  return <AlertCircle size={14} className="text-error" />
}

export default function DaoEntry({ index, data, onChange, onRemove, canRemove, showWeight }: Props) {
  const [realmStatus, setRealmStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const realmTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const proposalTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const resolve = useCallback(async (type: 'realm' | 'proposal', address: string) => {
    if (address.length < 32) return null
    const res = await fetch(`/api/resolve?type=${type}&address=${address}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.name as string
  }, [])

  // Debounced realm resolve
  useEffect(() => {
    if (realmTimer.current) clearTimeout(realmTimer.current)
    if (data.realmAddress.length < 32) {
      setRealmStatus('idle')
      return
    }
    setRealmStatus('loading')
    realmTimer.current = setTimeout(async () => {
      const name = await resolve('realm', data.realmAddress)
      if (name) {
        setRealmStatus('ok')
        onChange(index, { ...data, realmName: name })
      } else {
        setRealmStatus('error')
        onChange(index, { ...data, realmName: '' })
      }
    }, 600)
    return () => { if (realmTimer.current) clearTimeout(realmTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.realmAddress])

  // Debounced proposal resolve
  useEffect(() => {
    if (proposalTimer.current) clearTimeout(proposalTimer.current)
    if (data.proposalAddress.length < 32) {
      setProposalStatus('idle')
      return
    }
    setProposalStatus('loading')
    proposalTimer.current = setTimeout(async () => {
      const name = await resolve('proposal', data.proposalAddress)
      if (name) {
        setProposalStatus('ok')
        onChange(index, { ...data, proposalName: name })
      } else {
        setProposalStatus('error')
        onChange(index, { ...data, proposalName: '' })
      }
    }, 600)
    return () => { if (proposalTimer.current) clearTimeout(proposalTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.proposalAddress])

  return (
    <div className="rounded-xl border border-bkg-3 bg-bkg-2 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-fgd-3">DAO #{index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-fgd-4 hover:text-error transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Realm Address */}
      <div className="mb-3">
        <label className="block text-xs text-fgd-4 mb-1">Realm Address</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={data.realmAddress}
            onChange={e => onChange(index, { ...data, realmAddress: e.target.value, realmName: '' })}
            placeholder="Pubkey of the Realm (DAO)"
            className="flex-1 bg-bkg-1 border border-bkg-3 rounded-xl px-3 py-2 text-sm text-fgd-1 placeholder-fgd-4 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(153,69,255,0.1)] transition-all"
          />
          <ResolveIndicator status={realmStatus} />
        </div>
        {data.realmName && (
          <p className="text-xs text-success mt-1">{data.realmName}</p>
        )}
        {realmStatus === 'error' && (
          <p className="text-xs text-error mt-1">Realm not found on-chain</p>
        )}
      </div>

      {/* Proposal Address */}
      <div>
        <label className="block text-xs text-fgd-4 mb-1">Proposal Address</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={data.proposalAddress}
            onChange={e => onChange(index, { ...data, proposalAddress: e.target.value, proposalName: '' })}
            placeholder="Pubkey of the Proposal"
            className="flex-1 bg-bkg-1 border border-bkg-3 rounded-xl px-3 py-2 text-sm text-fgd-1 placeholder-fgd-4 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(153,69,255,0.1)] transition-all"
          />
          <ResolveIndicator status={proposalStatus} />
        </div>
        {data.proposalName && (
          <p className="text-xs text-success mt-1">{data.proposalName}</p>
        )}
        {proposalStatus === 'error' && (
          <p className="text-xs text-error mt-1">Proposal not found on-chain</p>
        )}
      </div>

      {/* Weight (only for weighted condition) */}
      {showWeight && (
        <div className="mt-3">
          <label className="block text-xs text-fgd-4 mb-1">Weight (1–100)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={data.weight || ''}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              onChange(index, { ...data, weight: isNaN(v) ? 0 : v })
            }}
            onBlur={() => {
              const clamped = Math.max(1, Math.min(100, data.weight || 1))
              onChange(index, { ...data, weight: clamped })
            }}
            className="w-24 bg-bkg-1 border border-bkg-3 rounded-xl px-3 py-2 text-sm text-fgd-1 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(153,69,255,0.1)] transition-all"
          />
        </div>
      )}
    </div>
  )
}
