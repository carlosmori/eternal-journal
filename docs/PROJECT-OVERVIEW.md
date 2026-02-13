# Eternal Journal - Project Overview

A quick guide to understand what Eternal Journal is, how it's built, and how it works.

---

## What is Eternal Journal?

**Eternal Journal** is a personal journal that stores your entries **permanently on the blockchain**. What you write stays there forever: no one can delete or modify it.

At the same time, it's **100% private**: only you can read what you wrote. Entries are encrypted in your browser before being sent to the network. The encryption key is derived from your wallet — no passwords, no accounts.

In short: **eternal + private + on-chain journal**.

---

## Core Concept

| Question | Answer |
|----------|--------|
| **What problem does it solve?** | Provides a permanent, private place for your thoughts, without relying on a central server that could go down or censor content. |
| **How does it work?** | Connect your wallet, sign once to unlock, and write. Each entry is encrypted locally and stored in a smart contract. |
| **Why blockchain?** | Immutability (no one can delete anything), decentralization (no single owner of the data), and contract transparency. |
| **What does the user pay?** | A fixed fee per entry (e.g. ~0.00005 ETH) + network gas. The fee goes to the contract owner; gas goes to the network. |

---

## High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────▶│   Frontend  │────▶│   Wallet    │
│  (browser)  │     │  (Next.js)  │     │ (MetaMask)  │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                          │                     │
                          │ 1. Connect         │ 2. Sign message
                          │ 3. Encrypt         │ 4. Sign tx
                          │ 5. Decrypt         │
                          ▼                     ▼
                   ┌─────────────────────────────────┐
                   │     Base Sepolia (blockchain)    │
                   │  ┌─────────────────────────────┐ │
                   │  │  EternalJournalPureOnChain   │ │
                   │  │  - addEntry(ciphertext)     │ │
                   │  │  - getEntry(user, index)    │ │
                   │  │  - getEntryCount(user)      │ │
                   │  └─────────────────────────────┘ │
                   └─────────────────────────────────┘
```

### Data Flow

1. **Connect wallet** → RainbowKit shows the modal, user connects (MetaMask, WalletConnect, etc.).
2. **Unlock journal** → User signs the message `"Eternal Journal encryption key | base-mainnet | v1"`. The signature is used to derive an AES-256 key (SHA-256 of the signature). That key never leaves the browser.
3. **Write entry** → User enters title and description. Frontend encrypts with AES-256-GCM and sends the ciphertext to the contract via `addEntry(bytes)`. User pays fee + gas.
4. **Read entries** → Frontend calls `getEntryCount()` and then `getEntry(user, index)` for each entry. Decrypts locally with the derived key.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React 18 | App Router, pages, components |
| **Styling** | Tailwind CSS | Utility-first, dark/light mode |
| **Animations** | Framer Motion | Transitions, micro-interactions |
| **3D** | Three.js, React Three Fiber | Background scene (particles, torus, hex grid) |
| **Web3** | wagmi, viem, RainbowKit | Wallet connection, contract read/write |
| **Blockchain** | Base Sepolia | Coinbase L2 (testnet for MVP) |
| **Smart contract** | Solidity ^0.8.20, Hardhat | EternalJournalPureOnChain contract |
| **Encryption** | @noble/ciphers, @noble/hashes | AES-256-GCM, SHA-256 |

### Main Dependencies (web)

- `wagmi` + `viem`: blockchain interaction
- `@rainbow-me/rainbowkit`: wallet connection UI
- `@noble/ciphers`: AES-256-GCM
- `@noble/hashes`: SHA-256 for key derivation
- `framer-motion`: animations
- `@react-three/fiber` + `three`: 3D scene

---

## Repository Structure

```
eternal-journal/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router (page.tsx, journal/page.tsx, layout.tsx)
│   │   │   ├── components/     # UI (QuoteCard, AddQuoteModal, UniverseScene, etc.)
│   │   │   ├── hooks/          # useFavorites
│   │   │   └── lib/            # crypto, contract, sepoliaClient
│   │   └── public/
│   └── api/                    # NestJS backend (optional for MVP)
│       └── src/
├── contracts/                  # Smart contracts
│   ├── contracts/
│   │   └── EternalJournalPureOnChain.sol
│   ├── scripts/
│   │   └── deploy.ts
│   └── hardhat.config.ts
├── docs/
│   ├── PROJECT-OVERVIEW.md     # This document
│   └── README-BLOCKCHAIN.md    # Detailed blockchain architecture
└── package.json
```

### Main Routes

| Route | Description |
|-------|-------------|
| `/` | Home with 3D scene, "Open your journal" CTA |
| `/journal` | Entry list, filters, views (list/timeline/grid/calendar), favorites |

---

## Key Frontend Components

| Component | Role |
|-----------|------|
| `UniverseScene` | 3D background scene (torus, particles, hex grid) |
| `QuoteCard` | Entry card with title, description, date, actions (copy, share, favorite) |
| `AddQuoteModal` | Modal to create entry (date, title, description) |
| `JournalFilters` | Search, date filters (this week, this month, this year), favorites |
| `JournalViews` | Views: List, Timeline, Grid, Calendar |
| `useFavorites` | Hook for favorites in localStorage (per wallet) |

---

## Smart Contract (Summary)

- **Name**: EternalJournalPureOnChain
- **Storage**: `mapping(address => Entry[])` where `Entry = { timestamp, ciphertext }`
- **Main functions**:
  - `addEntry(bytes ciphertext) payable` — stores encrypted entry, requires exact fee
  - `getEntry(address user, uint256 index)` — returns one entry
  - `getEntryCount(address user)` — number of entries for the user
- **Limit**: `MAX_ENTRY_BYTES` (e.g. 1024 bytes) per entry
- **Owner**: Safe multisig (Gnosis Safe) for withdraw and setFee

---

## How to Run

```bash
# Install dependencies
npm install

# Development (web + api)
npm run dev

# Frontend only
npm run dev --workspace=web
```

- **Frontend**: http://localhost:3000
- **API** (if running): http://localhost:3001

### Environment Variables (web)

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

Get the Project ID at [WalletConnect Cloud](https://cloud.walletconnect.com/).

### Network and Testnet

- **Network**: Base Sepolia (testnet)
- **Faucet**: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet) for test ETH

---

## References

- [README-BLOCKCHAIN.md](./README-BLOCKCHAIN.md) — Detailed blockchain architecture, encryption, costs
- [RainbowKit](https://www.rainbowkit.com/)
- [wagmi](https://wagmi.sh)
- [Base Sepolia](https://sepolia.base.org)
