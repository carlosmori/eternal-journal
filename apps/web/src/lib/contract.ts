// ABI of the EternalJournalPureOnChainV2 smart contract (UUPS proxy)
// Manually generated from the Solidity contract

export const ETERNAL_JOURNAL_ABI = [
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
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'start', type: 'uint256' },
      { name: 'end', type: 'uint256' },
    ],
    name: 'getEntries',
    outputs: [
      {
        components: [
          { name: 'timestamp', type: 'uint128' },
          { name: 'ciphertext', type: 'bytes' },
        ],
        name: '',
        type: 'tuple[]',
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
    inputs: [{ name: 'to', type: 'address' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
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
    inputs: [],
    name: 'MAX_BATCH_SIZE',
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
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'oldFee', type: 'uint256' },
      { indexed: false, name: 'newFee', type: 'uint256' },
    ],
    name: 'FeeChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'Withdrawn',
    type: 'event',
  },
] as const;

// Contract address deployed on Base Sepolia (proxy address)
// UPDATE after running: npm run deploy:sepolia in contracts/
export const ETERNAL_JOURNAL_ADDRESS =
  '0x262a6ad7aed52247aA70E5b29EB0b6414DD07430' as `0x${string}`;
