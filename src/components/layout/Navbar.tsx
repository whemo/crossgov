'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(m => m.WalletMultiButton),
  { ssr: false }
)

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-bkg-3 backdrop-blur-md bg-bkg-1/80">
      <Link href="/" className="flex items-center gap-1">
        <span className="text-xl font-bold text-fgd-1">Cross</span>
        <span className="text-xl font-bold text-primary">Gov</span>
      </Link>

      <WalletMultiButton />
    </nav>
  )
}
