export const WalletFactoryABI = [
  {
    type: 'function',
    name: 'createWallet',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'salt', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'walletAddress', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAddress',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'salt', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWalletCount',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWallets',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'address[]', internalType: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isWallet',
    inputs: [{ name: 'walletAddress', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'WalletCreated',
    inputs: [
      { name: 'wallet', type: 'address', indexed: true, internalType: 'address' },
      { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
      { name: 'salt', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'CallExecutionFailed',
    inputs: [{ name: 'revertData', type: 'bytes', internalType: 'bytes' }],
  },
  {
    type: 'error',
    name: 'ExpiredSignature',
    inputs: [
      { name: 'deadline', type: 'uint256', internalType: 'uint256' },
      { name: 'currentTimestamp', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InsufficientBalance',
    inputs: [
      { name: 'currentBalance', type: 'uint256', internalType: 'uint256' },
      { name: 'requiredAmount', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidNonce',
    inputs: [
      { name: 'expected', type: 'uint256', internalType: 'uint256' },
      { name: 'provided', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidOwner',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidSignature',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnauthorizedCaller',
    inputs: [{ name: 'caller', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'WalletAlreadyExists',
    inputs: [{ name: 'wallet', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
] as const;
