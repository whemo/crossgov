# CrossGov ☆ Cross-DAO Coordination for Realms

coordination layer for Solana DAOs built on top of Realms. link proposals from multiple DAOs into one cross-proposal, set approval conditions, track votes live from the blockchain.

we needed this because coordinating joint DAO decisions through discord messages doesn't really work when you're dealing with actual treasury movements ^^

---

## what it does ✧

CrossGov lets multiple DAOs (2-10) link their proposals together and agree on conditions before anyone executes anything.

1. **link proposals** from different DAOs into one coordinated cross-proposal
2. **set approval conditions** - unanimous, majority, weighted, or first-response
3. **track votes live** - status pulled directly from SPL Governance onchain accounts
4. **auto-evaluate** - overall result updates based on the condition you picked

> *"we execute our proposal only if Bonk DAO and Jito DAO also approve theirs"*

that kind of thing

---

## how it works ★

```
DAO A → proposal: "Transfer 50k USDC to address X"
DAO B → proposal: "Allocate 500k tokens to pool"

linked via CrossGov.

DAO A votes Yes ✓
DAO B votes No ✗

CrossGov: "Rejected - DAO B declined"
```

CrossGov v1 is a coordination tool (!) - it won't prevent DAO A from executing if they really want to. but everything is on-chain and transparent - if someone acts after the other side rejected, everyone sees it.

reputation risk on the blockchain is permanent ^^

*(for actual cryptographic guarantees - escrow in v2, see roadmap)*

---

## approval conditions ✦

**Unanimous** - all DAOs must approve. for critical decisions.

**Majority** - more than half say yes. works well with 3+ DAOs.

**Weighted** - custom weight per DAO. when participants aren't equal.

**First Response** - one approval is enough. race mode.

---

## stack ⟡

- Next.js 16 (App Router, TypeScript)
- TailwindCSS v4
- @solana/web3.js
- @realms-today/spl-governance
- Solana Wallet Adapter (Phantom & Solflare)

---

## getting started ˚✩

Node.js 18+ and a Solana wallet required.

```bash
git clone https://github.com/whemo/crossgov.git
cd crossgov
npm install

cp .env.local.example .env.local
```

`.env.local`:
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY_HERE
```

```bash
npm run dev
# → http://localhost:3000
```

---

## roadmap ☆

### v1.0 - coordination layer ✓ ← current

proposal linking, live vote tracking, 4 approval conditions, dashboard. works, usable now.

### v2.0 - escrow protection ⟡

smart contract escrow:
1. DAOs deposit funds into escrow
2. escrow holds while voting happens
3. all approve → funds released
4. someone rejects → funds returned

### v3.0 - advanced ✧

conditional templates (if/then), automated execution via keepers, cross-DAO treasury management, governance analytics.

---

## why this exists

couldn't find a tool for coordinating proposals across multiple Solana DAOs. so we made one ^^

---

MIT license.

*DAOs coordinating through discord screenshots era is over* ˚ʚ♡ɞ˚
