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

### Con Docker (recomendado)

1. **Levantar PostgreSQL:**
   ```bash
   docker run -d --name eternal-journal-db \
     -p 5432:5432 \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=eternal_journal \
     postgres:16
   ```

2. **Configurar y migrar:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Editar apps/api/.env con tus credenciales de Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

   cd apps/api && npx prisma migrate dev --name init
   cd ../..
   ```

3. **Instalar y ejecutar:**
   ```bash
   yarn install
   yarn dev
   ```

### Sin Docker

```bash
yarn install
yarn dev
```

> Requiere PostgreSQL corriendo en `localhost:5432` con base `eternal_journal`. Ver [docs/DATABASE-SETUP.md](docs/DATABASE-SETUP.md).

---

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
