# Eternal Journal - Blockchain Architecture

A dApp where users write "eternal" journal entries (permanently stored on blockchain), with full privacy (AES-256-GCM encrypted) and decentralized monetization (per-insertion fee charged on-chain, modifiable only by the owner).

---

## Key Principles

- **100% pure on-chain**: all encrypted content is stored in the smart contract storage (no IPFS, Arweave, or off-chain).
- **Privacy**: AES-256-GCM encryption is done in the frontend (browser). The key is derived from a wallet signature and never goes on-chain.
- **Low cost**: deploy on Base L2 (Coinbase) for very low fees (~$0.0005-$0.005 per insertion in gas). Entry size limit to keep costs predictable.
- **Monetization**: fixed fee per insertion, accumulated in the contract and withdrawable by the owner (pull pattern). Modifiable only by the owner via Ownable.
- **Ownership multisig**: the contract owner is a Safe (Gnosis Safe) multisig, not a personal wallet. All owner operations (withdraw, setFee) require multiple signatures.
- **User-friendly**: wallet connection with RainbowKit, key derivation from wallet signature (no passwords), individual reads by index and local cache.
- **Scalability**: gas optimizations (bytes instead of string, packed structs, pagination in reads, MAX_ENTRY_BYTES limit).

---

## 1. Chain and Environment

| Property | Value |
|----------|-------|
| Main blockchain | **Base mainnet** (Coinbase L2, EVM-compatible) |
| Testnet (development/MVP) | **Base Sepolia** (free for testing) |
| Chain ID (Sepolia) | 84532 |
| RPC | https://sepolia.base.org |
| Explorer | https://sepolia.basescan.org |

### Why Base

- Ultra low fees (0.004-0.01 Gwei effective).
- Excellent support for wagmi/viem/RainbowKit.
- User growth.
- Easy fiat on-ramp (Coinbase).

### Real Cost per Insertion

Blockchain cost depends on **how many bytes you store**, not the "text". More bytes = more storage slots = more gas.

#### Cost Table by Entry Size (Feb 2026 data, Base L2)

| Original text | Ciphertext approx | Est. gas | USD approx (gas) |
|---------------|-------------------|----------|------------------|
| 1 short phrase (~100 chars) | ~150 bytes | ~120k-150k gas | $0.002-$0.005 |
| 1 short paragraph (~300 chars) | ~400 bytes | ~200k-250k gas | $0.005-$0.01 |
| 1 short page (~800 chars) | ~1 KB | ~700k gas | $0.02-$0.04 |

For short entries, the cost is negligible. For long texts, it stops being cheap.

#### Recommended Limit for MVP

```
MAX_ENTRY_BYTES = 1024 or 2048 bytes
```

- 1024 bytes = ~500-700 characters
- 2048 bytes = ~1 short page

The contract validates this limit:

```solidity
require(ciphertext.length <= MAX_ENTRY_BYTES, "Entry too large");
```

#### Total Fee: As the User Sees It

The user pays **two things** per insertion:

| Concept | Example |
|---------|---------|
| Gas (to the network) | $0.005 |
| Contract fee (to owner) | $0.10 |
| **Total in wallet** | **$0.105** |

The UI shows this breakdown before signing. No surprises.

### Get Test ETH (Base Sepolia)

1. [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
2. [Alchemy Base Sepolia](https://sepoliafaucet.com/) (select Base Sepolia)

---

## 2. Smart Contract: EternalJournalPureOnChain

- **Language**: Solidity ^0.8.20
- **License**: MIT
- **Dependencies**: OpenZeppelin (Ownable for owner control)

**Important note**: do not declare `address payable public owner` as your own variable. Use only OpenZeppelin's `Ownable`, which provides `owner()` internally. For transfers use `payable(owner())`. This is cleaner and avoids audit observations.

### Ownership: Multisig with Safe (Gnosis Safe)

The contract `owner()` is **not a personal wallet**, but a **Safe multisig**.

| Property | Value |
|----------|-------|
| Owner type | Safe (Gnosis Safe) |
| Signers | 2/3 (or the configuration you choose) |
| Protected operations | `withdraw()`, `setFee()`, `transferOwnership()` |

Flow to withdraw fees:

1. One signer proposes the `withdraw()` tx from the Safe.
2. Other signers approve it (2 of 3, or the configured threshold).
3. Once the threshold is reached, the Safe executes the tx against the contract.

The contract needs no special multisig logic. It only uses `Ownable` and is deployed with the Safe address as `initialOwner`. The Safe handles the multi-signature logic.

```solidity
constructor(address initialOwner) Ownable(initialOwner) {}
// initialOwner = Safe multisig address
```

### Structures and Storage

```solidity
struct Entry {
    uint128 timestamp;   // packed to save slots (block.timestamp cast)
    bytes ciphertext;    // AES-256-GCM encrypted content (optimizes vs string)
}

mapping(address => Entry[]) public journal;
```

### Key Variables and Constants

```solidity
// owner() comes from Ownable (do not declare your own variable)
uint256 public fee = 0.00005 ether;                 // initial, modifiable by owner
uint256 public constant MAX_ENTRY_BYTES = 1024;     // size limit per entry
```

### Main Functions

#### `constructor(address initialOwner)`

Passes `initialOwner` to `Ownable(initialOwner)`. On deploy, pass the Safe multisig address.

#### `addEntry(bytes calldata ciphertext) external payable`

```solidity
require(msg.value == fee, "Incorrect fee");
require(ciphertext.length <= MAX_ENTRY_BYTES, "Entry too large");
// Fee accumulates in contract balance (pull pattern)
// Save entry
journal[msg.sender].push(Entry(uint128(block.timestamp), ciphertext));
// Emit event
emit NewEntry(msg.sender, journal[msg.sender].length - 1, uint128(block.timestamp));
```

Note: uses `msg.value == fee` (exact match) instead of `>=` to avoid accidental overpayments. If a wallet rounds or the frontend has a bug, the transaction reverts instead of overcharging. If you ever want tips, add another function or explicit parameter.

#### `withdraw() external onlyOwner`

```solidity
uint256 balance = address(this).balance;
require(balance > 0, "No funds");
(bool ok, ) = payable(owner()).call{value: balance}("");
require(ok, "Transfer failed");
```

Pull pattern: fees accumulate in the contract and the owner (Safe multisig) withdraws when ready. This is safer than transferring on each insertion because:

- It separates business logic (saving entry) from payment logic.
- Auditors flag "pay first, write after" as bad practice.
- If the transfer fails for any reason, it does not block entry writes.

Uses `payable(owner())` (from Ownable) instead of your own `owner` variable.

#### `setFee(uint256 newFee) external onlyOwner`

Only the owner (Safe multisig) can change the fee (e.g. raise or lower based on usage or ETH price).

#### `getEntry(address user, uint256 index) external view returns (Entry memory)`

Individual read by index. More robust than returning arrays because:

- Returning `Entry[] memory` with large entries can cause RPCs to fail or mobile wallets to break.
- With individual reads, the frontend controls how many entries to request and in what order.

The frontend reads `getEntryCount()` and then requests one by one (or in parallel).

#### `getEntryCount(address user) external view returns (uint256)`

Returns how many entries the user has.

### Events

```solidity
event NewEntry(address indexed user, uint256 indexed index, uint128 timestamp);
```

### Gas Optimizations

- Use `bytes calldata` for input (cheap).
- `uint128` for timestamp (saves 16 bytes per entry).
- Avoid `string` (unnecessary overhead).
- `MAX_ENTRY_BYTES` as constant (no storage, embedded in bytecode).
- Events for off-chain indexing if needed later (TheGraph, etc.).

### Security

- **Ownable + Multisig**: only the owner (Safe multisig) modifies the fee and withdraws funds. Multiple signatures required for any owner operation.
- **No custom owner variable**: use exclusively OpenZeppelin's `Ownable` with `payable(owner())`. Do not declare `address payable public owner` to avoid inconsistencies and audit observations.
- **Exact payment**: `msg.value == fee` avoids overpayments and frontend/wallet errors.
- **Pull pattern**: fees accumulated in contract, withdrawn by owner via `withdraw()`. Avoids reentrancy and decouples writes from payments.
- **Size limit**: `MAX_ENTRY_BYTES` prevents excessively large entries that would consume disproportionate gas.
- **Individual reads**: `getEntry(index)` instead of returning heavy arrays. Avoids RPC and mobile wallet failures with large entries.
- **Atomicity**: each blockchain transaction is atomic. If anything fails (incorrect fee, unmet require, failed transfer), **the entry is not saved, no money is transferred, nothing is stuck**. The user only loses the failed tx gas.
- **Auditable**: simple code, no reentrancy (no complex external calls in writes).

---

## 3. Encryption: AES-256-GCM with Wallet-Derived Key

### Why AES-GCM and Not AES-CTR

AES-GCM = encryption **+ integrity verification** (authenticated).

- If someone changes 1 byte of the ciphertext, copies it wrong, or alters it, **AES-GCM fails to decrypt**. This is critical for a journal: you don't want to read corrupted garbage without noticing.
- AES-CTR only encrypts. It does not detect alteration. You could decrypt manipulated data and get garbled text with no error.

### Why Not Use the Wallet Public Key for Encryption

Ethereum **is not designed for asymmetric data encryption**:

- The real public key is not always accessible from the frontend.
- MetaMask deprecated `eth_getEncryptionPublicKey` and `eth_decrypt`.
- Encrypting large texts asymmetrically is slow and complex.
- It is not what is done in practice.

### The Right Alternative: Wallet Signature as Seed

Use the wallet to **derive** a symmetric key, not to encrypt directly.

Flow:

1. The user signs a deterministic message with their wallet:

```
"Eternal Journal encryption key | base-mainnet | v1"
```

The message includes domain and version to:
- Avoid collisions with other dApps using a similar scheme.
- Avoid accidental reuse across different chains.
- Allow versioning the encryption scheme in the future (v2, v3...).

2. That signature is:
   - secret (only the wallet can produce it)
   - unique per user (each wallet generates a different signature)
   - high entropy (256+ bits)
   - deterministic (same wallet + same message = same signature always)

3. From that signature derive an AES-256 key (SHA-256 of signature = 32 bytes)

4. Encrypt with that key using AES-256-GCM

Result:

- No passwords, no brute force possible.
- 100% Web3: security depends on the wallet.
- The key is derived on-the-fly, never stored.

### Encryption Stack

- **Next.js** (App Router)
- **wagmi + viem + RainbowKit**
- **Encryption**: `@noble/ciphers` (AES-256-GCM) - audited library, lightweight, no dependencies

### Write Flow (Add Entry)

```
1. User enters entry text
2. Frontend asks user to sign "Eternal Journal encryption key | base-mainnet | v1" (once per session)
3. Derive AES-256 key from signature (SHA-256 of signature)
4. Encrypt text with AES-256-GCM: generate random IV (12 bytes) + ciphertext + auth tag
5. Read current fee from contract (readContract)
6. Call writeContract:
   - function: addEntry
   - args: [IV + ciphertext + authTag as bytes]
   - value: fee (exact, in wei)
7. RainbowKit shows estimate (gas + fee) -> user signs
8. Tx confirmed -> entry saved on-chain
```

### Read Flow (Show Journal)

```
1. Connect wallet -> read getEntryCount() for current user
2. Read entries individually: getEntry(0), getEntry(1), ... (in parallel or batches of 20)
3. Request signature of "Eternal Journal encryption key | base-mainnet | v1" (once per session)
4. Derive AES-256 key from signature
5. For each Entry: decrypt ciphertext locally with the key
6. Display chronologically (timestamp + decrypted text)
7. Optional cache (see warning below)
```

### Local Cache: Security Warning

You can cache in `localStorage` to avoid re-reading from the blockchain on each visit. However:

- `localStorage` is vulnerable to XSS. If someone injects JavaScript into the page, they can read all cached content.
- **Recommendation**: cache the **ciphertext** (encrypted data), not the decrypted text. that way, even with an XSS attack, the attacker only gets illegible bytes.
- Alternative: if you cache decrypted text for convenience, clarify in the UI that it is optional and at the user's responsibility.

### Privacy

- The key is derived in the browser and **never** leaves it.
- Only the wallet owner can reproduce the signature and therefore the key.
- Data on the blockchain is illegible bytes to any observer.

---

## 4. Fee and Monetization Strategy

| Property | Value |
|----------|-------|
| Model | Fixed fee per insertion (pay-per-use, native web3) |
| Suggested initial fee | 0.00005 ETH (~$0.10 USD) |
| Payment | Exact (`msg.value == fee`), no overpayments |
| Adjustable by | Owner (Safe multisig) via `setFee(newFee)` |
| Fee destination | Accumulated in contract, withdrawable by owner (Safe multisig) via `withdraw()` |
| Transparency | Fee visible in contract (public), breakdown in UI before signing |

### UI Breakdown

Before the user signs, the UI shows:

```
Gas estimate:     $0.005
Journal fee:      $0.10
Total:            $0.105
```

### Dynamic Fee Adjustment

- If ETH rises a lot: lower to 0.00002 ETH.
- If the app grows: raise to 0.0001 ETH.

### Free Tier (Optional, Not MVP)

You could add logic (e.g. first 5 entries free per month by checking timestamp). For MVP: fee always.

### Potential Revenue

| Scenario | Calculation |
|----------|-------------|
| 1,000 users x 10 entries/month x $0.10 fee | **$1,000/month** |

Scalable without backend.

---

## 5. Project Configuration

### WalletConnect Project ID

RainbowKit requires a Project ID from WalletConnect Cloud for MetaMask Mobile, WalletConnect, etc.

1. Create an account at [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a project and copy the Project ID
3. Create `.env.local` in `apps/web/`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### wagmi Config File

The config is in `apps/web/src/app/wagmi.config.ts`:

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'Eternal Journal',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [baseSepolia],
  ssr: true,
});
```

### viem Client for Reading Data

To query the blockchain without a wallet (e.g. latest block):

```typescript
// apps/web/src/lib/sepoliaClient.ts
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export const sepoliaPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});
```

### RPC and Providers

The public Base Sepolia RPC is used by default. For production:

- [Alchemy](https://www.alchemy.com/)
- [Infura](https://infura.io/)
- [QuickNode](https://www.quicknode.com/)

```typescript
import { http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

const config = getDefaultConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http('https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY'),
  },
});
```

---

## 6. Quick Usage

### ConnectButton

```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

<ConnectButton />
```

### wagmi Hooks

```tsx
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address, isConnected } = useAccount();

  if (!isConnected) return <p>Connect your wallet</p>;
  return <p>Connected: {address}</p>;
}
```

### Change to Another Network

```typescript
import { baseSepolia, sepolia, mainnet } from 'wagmi/chains';

const config = getDefaultConfig({
  chains: [baseSepolia, sepolia, mainnet],
  // ...
});
```

---

## References

- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)
- [wagmi Docs](https://wagmi.sh)
- [viem Docs](https://viem.sh)
- [Base Sepolia Basescan](https://sepolia.basescan.org)
- [OpenZeppelin Ownable](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [@noble/ciphers](https://github.com/paulmillr/noble-ciphers)
- [Safe (Gnosis Safe)](https://safe.global/) - Multisig wallet for contract ownership
