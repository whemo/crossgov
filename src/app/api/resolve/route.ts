import { NextRequest, NextResponse } from 'next/server'
import { fetchRealmInfo, fetchProposalStatus } from '@/lib/realms'

// GET /api/resolve?type=realm&address=xxx
// GET /api/resolve?type=proposal&address=xxx
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type')
  const address = request.nextUrl.searchParams.get('address')

  if (!type || !address) {
    return NextResponse.json({ error: 'Missing type or address' }, { status: 400 })
  }

  try {
    if (type === 'realm') {
      const info = await fetchRealmInfo(address)
      return NextResponse.json({ name: info.name })
    } else if (type === 'proposal') {
      const info = await fetchProposalStatus(address)
      return NextResponse.json({ name: info.name })
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Account not found on-chain' }, { status: 404 })
  }
}
