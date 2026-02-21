// Program ID for SPL Governance program
// Mainnet: 'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw'
// Devnet:  'GTesTBiEWE32WHXXE2S4XbZvA5CrEc4xs6ZgRe895dP'
export const GOV_PROGRAM_ID = 'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw'

// Helius RPC URL (10 RPS limit, better for getProgramAccounts)
// Set NEXT_PUBLIC_SOLANA_RPC_URL in .env.local
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://api.mainnet-beta.solana.com'
