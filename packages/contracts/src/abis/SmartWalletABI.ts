export const SmartWalletABI = [
  {
    type: 'constructor',
    inputs: [{ name: 'initialOwner', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'fallback',
    stateMutability: 'payable',
  },
  {
    type: 'receive',
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'EXECUTE_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'eip712Domain',
    inputs: [],
    outputs: [
      { name: 'fields', type: 'bytes1', internalType: 'bytes1' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'version', type: 'string', internalType: 'string' },
      { name: 'chainId', type: 'uint256', internalType: 'uint256' },
      { name: 'verifyingContract', type: 'address', internalType: 'address' },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      { name: 'extensions', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      { name: 'target', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
      { name: 'data', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: 'returnData', type: 'bytes', internalType: 'bytes' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'executeSigned',
    inputs: [
      { name: 'target', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
      { name: 'data', type: 'bytes', internalType: 'bytes' },
      { name: 'nonce', type: 'uint256', internalType: 'uint256' },
      { name: 'deadline', type: 'uint256', internalType: 'uint256' },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: 'returnData', type: 'bytes', internalType: 'bytes' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getBalance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNonce',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'EIP712DomainChanged',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EthReceived',
    inputs: [
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TransactionExecuted',
    inputs: [
      { name: 'target', type: 'address', indexed: true, internalType: 'address' },
      { name: 'value', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'data', type: 'bytes', indexed: false, internalType: 'bytes' },
      { name: 'nonce', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'returnData', type: 'bytes', indexed: false, internalType: 'bytes' },
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
    name: 'ECDSAInvalidSignature',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ECDSAInvalidSignatureLength',
    inputs: [{ name: 'length', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'error',
    name: 'ECDSAInvalidSignatureS',
    inputs: [{ name: 's', type: 'bytes32', internalType: 'bytes32' }],
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
    name: 'InvalidShortString',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidSignature',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'StringTooLong',
    inputs: [{ name: 'str', type: 'string', internalType: 'string' }],
  },
  {
    type: 'error',
    name: 'UnauthorizedCaller',
    inputs: [{ name: 'caller', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
] as const;
