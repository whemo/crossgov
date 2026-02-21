import type { Metadata } from 'next'
import './globals.css'
import AppWalletProvider from '@/components/providers/WalletProvider'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ToastContainer from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'CrossGov — Cross-DAO Coordination',
  description: 'Coordinate proposals across multiple Solana DAOs on Realms',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AppWalletProvider>
          <Navbar />
          <main className="pt-[73px] min-h-screen">
            {children}
          </main>
          <Footer />
          <ToastContainer />
        </AppWalletProvider>
      </body>
    </html>
  )
}
