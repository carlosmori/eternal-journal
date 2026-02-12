// ABI of the EternalJournalPureOnChain smart contract
// Manually generated from the Solidity contract

export const ETERNAL_JOURNAL_ABI = [
  {
    inputs: [{ name: 'initialOwner', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ name: 'ciphertext', type: 'bytes' }],
    name: 'addEntry',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'getEntry',
    outputs: [
      {
        components: [
          { name: 'timestamp', type: 'uint128' },
          { name: 'ciphertext', type: 'bytes' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getEntryCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'newFee', type: 'uint256' }],
    name: 'setFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_ENTRY_BYTES',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'index', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint128' },
    ],
    name: 'NewEntry',
    type: 'event',
  },
] as const;

// Contract address deployed on Base Sepolia
// UPDATE after running: npm run deploy:sepolia in contracts/
export const ETERNAL_JOURNAL_ADDRESS =
  '0x0000000000000000000000000000000000000000' as `0x${string}`;
