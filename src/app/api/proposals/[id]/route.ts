import { NextRequest, NextResponse } from 'next/server'
import { getCrossProposal, deleteCrossProposal } from '@/lib/db'

// GET /api/proposals/[id] — get a single cross-proposal by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const proposal = getCrossProposal(id)

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  return NextResponse.json(proposal)
}

// DELETE /api/proposals/[id] — delete a cross-proposal
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const deleted = deleteCrossProposal(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
