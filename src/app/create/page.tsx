'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CreateForm from '@/components/create/CreateForm'

export default function CreatePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-fgd-3 hover:text-fgd-1 transition-colors mb-6"
      >
        <ArrowLeft size={16} suppressHydrationWarning />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-fgd-1 mb-1">New Cross-Proposal</h1>
      <p className="text-sm text-fgd-3 mb-8">
        Link proposals from multiple DAOs into a single coordinated decision.
      </p>

      <CreateForm />
    </div>
  )
}
