# Eternal Journal

Journal on the blockchain. MVP with Next.js, NestJS and TypeScript.

**New to the project?** Read [docs/PROJECT-OVERVIEW.md](docs/PROJECT-OVERVIEW.md) for a quick understanding of the app, architecture, and tech stack.

## Structure

```
├── apps/
│   ├── web/     # Next.js 15 + React + Tailwind
│   └── api/     # NestJS 11 + TypeScript
├── contracts/   # Solidity smart contract (Hardhat)
```

## Run

```bash
npm install
npm run dev
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001

## Flow

1. **Home** (`/`): Welcome screen with "Enter" button
2. **Journal** (`/journal`): List of entries (blurred by default, click to reveal) + "Add entry" button (top right) that opens the modal

## Technologies

- **Frontend**: Next.js 15, React 19, Tailwind CSS, liquid glass style, violet palette, dark/light mode
- **Backend**: NestJS 11, TypeScript
- **Blockchain**: wagmi, viem, RainbowKit, Base Sepolia (https://sepolia.base.org)

## Blockchain

Connect your wallet on Sepolia. See [docs/README-BLOCKCHAIN.md](docs/README-BLOCKCHAIN.md) for configuration and usage.
