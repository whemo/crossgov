'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { Plus, Loader2 } from 'lucide-react'
import DaoEntry from './DaoEntry'
import { toast } from '@/components/ui/Toast'
import { ApprovalCondition } from '@/lib/types'

interface DaoEntryData {
  realmAddress: string
  realmName: string
  proposalAddress: string
  proposalName: string
  weight: number
}

const emptyDao = (): DaoEntryData => ({
  realmAddress: '',
  realmName: '',
  proposalAddress: '',
  proposalName: '',
  weight: 1,
})

const conditionOptions: { value: ApprovalCondition; label: string; desc: string }[] = [
  { value: 'all', label: 'Unanimous', desc: 'All DAOs must approve' },
  { value: 'majority', label: 'Majority', desc: '>50% of DAOs approve' },
  { value: 'weighted', label: 'Weighted', desc: '>50% by weight' },
  { value: 'first', label: 'First Response', desc: 'First DAO to approve wins' },
]

export default function CreateForm() {
  const router = useRouter()
  const { publicKey } = useWallet()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState<ApprovalCondition>('all')
  const [expires, setExpires] = useState('')
  const [daos, setDaos] = useState<DaoEntryData[]>([emptyDao(), emptyDao()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateDao = (index: number, data: DaoEntryData) => {
    setDaos(prev => prev.map((d, i) => (i === index ? data : d)))
  }

  const removeDao = (index: number) => {
    setDaos(prev => prev.filter((_, i) => i !== index))
  }

  const addDao = () => {
    if (daos.length >= 10) return
    setDaos(prev => [...prev, emptyDao()])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!publicKey) {
      setError('Connect your wallet first')
      return
    }

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required')
      return
    }

    if (!expires) {
      setError('Expiration date is required')
      return
    }

    if (new Date(expires).getTime() <= Date.now()) {
      setError('Expiration date must be in the future')
      return
    }

    const hasEmpty = daos.some(d => !d.realmAddress || !d.proposalAddress)
    if (hasEmpty) {
      setError('All DAO entries must have both Realm and Proposal addresses')
      return
    }

    const realmAddrs = daos.map(d => d.realmAddress)
    if (new Set(realmAddrs).size !== realmAddrs.length) {
      setError('Duplicate Realm Address — each DAO must be unique')
      return
    }

    const proposalAddrs = daos.map(d => d.proposalAddress)
    if (new Set(proposalAddrs).size !== proposalAddrs.length) {
      setError('Duplicate Proposal Address — each proposal must be unique')
      return
    }

    if (condition === 'weighted') {
      const totalWeight = daos.reduce((acc, d) => acc + (d.weight || 0), 0)
      if (totalWeight !== 100) {
        setError(`Total weight must be exactly 100 (currently ${totalWeight})`)
        return
      }
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          creator: publicKey.toBase58(),
          participants: daos.map(d => ({
            realmAddress: d.realmAddress,
            realmName: d.realmName,
            proposalAddress: d.proposalAddress,
            proposalName: d.proposalName,
            weight: condition === 'weighted' ? d.weight : 1,
          })),
          approvalCondition: condition,
          expiresAt: new Date(expires).getTime(),
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to create')
      }

      const proposal = await res.json()
      toast('Cross-proposal created successfully', 'success')
      router.push(`/proposal/${proposal.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      toast(msg, 'error')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-fgd-2 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Joint Analytics Grant"
          className="w-full bg-bkg-2 border border-bkg-3 rounded-xl px-3 py-2.5 text-fgd-1 placeholder-fgd-4 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(153,69,255,0.1)] transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-fgd-2 mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe the coordinated proposal..."
          className="w-full bg-bkg-2 border border-bkg-3 rounded-xl px-3 py-2.5 text-fgd-1 placeholder-fgd-4 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(153,69,255,0.1)] transition-all resize-none"
        />
      </div>

      {/* Approval Condition */}
      <div>
        <label className="block text-sm font-medium text-fgd-2 mb-2">Approval Condition</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {conditionOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCondition(opt.value)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-all ${condition === opt.value
                  ? 'bg-primary/15 border-primary/40 text-fgd-1 shadow-[0_0_12px_rgba(153,69,255,0.1)]'
                  : 'bg-bkg-2 border-bkg-3 text-fgd-3 hover:border-bkg-4 hover:text-fgd-1'
                }`}
            >
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className="block text-[10px] text-fgd-4 mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Expires */}
      <div>
        <label className="block text-sm font-medium text-fgd-2 mb-1">Expires</label>
        <input
          type="date"
          value={expires}
          onChange={e => setExpires(e.target.value)}
          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
          className="w-full sm:w-1/2 bg-bkg-2 border border-bkg-3 rounded-xl px-3 py-2.5 text-fgd-1 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(153,69,255,0.1)] transition-all [color-scheme:dark]"
        />
      </div>

      {/* DAO Participants */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-fgd-2">
            DAO Participants ({daos.length}/10)
          </label>
          {daos.length < 10 && (
            <button
              type="button"
              onClick={addDao}
              className="flex items-center gap-1 text-xs text-primary hover:text-success transition-colors font-medium"
            >
              <Plus size={14} suppressHydrationWarning />
              Add DAO
            </button>
          )}
        </div>
        <div className="space-y-3">
          {daos.map((dao, i) => (
            <DaoEntry
              key={i}
              index={i}
              data={dao}
              onChange={updateDao}
              onRemove={removeDao}
              canRemove={daos.length > 2}
              showWeight={condition === 'weighted'}
            />
          ))}
        </div>
      </div>



      {/* Total Weight Distribution */}
      {condition === 'weighted' && (
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-fgd-3">Total Weight Distribution:</span>
          <span className={`font-mono font-bold ${daos.reduce((a, b) => a + (b.weight || 0), 0) === 100 ? 'text-success' : 'text-error'
            }`}>
            {daos.reduce((a, b) => a + (b.weight || 0), 0)}/100
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-error text-sm">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !publicKey}
        className="w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(153,69,255,0.2)]"
        style={{ background: 'linear-gradient(135deg, #9945FF, #7B3FE4)' }}
        suppressHydrationWarning
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Creating...
          </>
        ) : !publicKey ? (
          'Connect wallet to create'
        ) : (
          'Create Cross-Proposal'
        )}
      </button>
    </form>
  )
}
