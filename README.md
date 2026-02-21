# CrossGov — Cross-DAO Coordination for Solana Realms

CrossGov is a coordination layer for Solana DAOs built on top of [Realms](https://realms.today). It enables multiple DAOs to link their proposals into a single **cross-proposal** with configurable approval conditions and real-time on-chain voting tracking.

## What It Does

When DAOs need to coordinate joint decisions, CrossGov allows them to:

1. **Link proposals** from 2-10 different DAOs into one coordinated cross-proposal
2. **Set approval conditions** — unanimous, majority, weighted, or first-response
3. **Track votes live** — see each DAO's voting status pulled directly from the blockchain
4. **Auto-evaluate outcomes** — overall status updates based on your chosen condition

### Example Use Case

> *"We will execute our proposal only if Bonk DAO AND Jito DAO also approve their linked proposals"*

## Features

- **4 Approval Conditions:**
  - **Unanimous** — All DAOs must approve
  - **Majority** — More than half must approve
  - **Weighted** — Custom weights per DAO
  - **First Response** — Any single DAO approval triggers
- **Live On-Chain Data** — Real-time vote counts and quorum from SPL Governance
- **Wallet Integration** — Phantom & Solflare support
- **Responsive Design** — Works on desktop and mobile

## Roadmap

### v1.0 — Coordination Layer (Current)

**Implemented in this release**

- Link proposals from multiple DAOs into cross-proposals
- Real-time voting status from on-chain data
- 4 approval conditions (Unanimous, Majority, Weighted, First Response)
- Dashboard with live tracking
- Proposal detail pages with vote feed

**How it works:**

DAO A creates proposal: "Transfer 50k USDC to address X"
DAO B creates proposal: "Allocate 500k tokens to pool"
Both proposals are linked via CrossGov.

DAO A votes Yes. DAO B votes No.
CrossGov shows: **"Rejected — DAO B declined"**.

**Important:** CrossGov is a **coordination tool, not blocking**. It cannot prevent DAO A from executing their proposal if it passed. But it provides transparency — participants see the other side rejected, so they know not to execute.

**Real-world protection:** If DAO A sends funds after DAO B rejected, it's a public reputational risk. All proposals are on-chain, fully transparent.

---

### v2.0 — Escrow Protection (Planned)

**Smart contract escrow for atomic execution**

The real solution to coordination risk:

1. Both DAOs deposit funds/assets into a smart contract escrow
2. Escrow holds funds while voting happens
3. If all DAOs approve → funds are released to intended recipients
4. If any DAO rejects → funds return to original owners

**Benefits:**
- No counterparty risk
- Atomic execution — all or nothing
- No reputational games needed

---

### v3.0 — Advanced Features (Future)

- Conditional proposal templates (if/then logic)
- Automated execution via keeper networks
- Cross-DAO treasury management
- Governance analytics and insights

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** TailwindCSS v4
- **Blockchain:** @solana/web3.js, @realms-today/spl-governance
- **Wallet:** Solana Wallet Adapter

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana wallet (Phantom or Solflare)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd crossgov

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your Helius RPC API key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

Get your free Helius API key at [https://helius.dev](https://helius.dev)

## Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add the `NEXT_PUBLIC_SOLANA_RPC_URL` environment variable in Vercel settings
4. Deploy

## Built For

**Solana Graveyard Hackathon** — Realms bounty (Governance Builders / Realms Extensions)

## License

MIT
