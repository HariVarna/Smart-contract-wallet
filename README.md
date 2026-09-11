# Smart Contract Wallet

A production-oriented, non-custodial Smart Contract Wallet built from scratch on Ethereum/EVM.

## Architecture Highlights
- **Account Abstraction & Contract Wallets**: The account itself is a smart contract executing calls, validating signatures (EIP-712/EIP-1271), and tracking nonces.
- **Monorepo Structure**: Managed with `pnpm` workspaces separating contracts, shared types, wallet-core engine, contract bindings, and the Next.js web application.
- **Security First**: Strictly non-custodial, zero private key persistence in localStorage, sanitized logging, CEI patterns, and STRIDE threat modeling.
- **Toolchain**: Solidity `^0.8.28`, Foundry (`forge`, `anvil`, `cast`), OpenZeppelin Contracts v5.x, TypeScript, Next.js (App Router), Tailwind CSS, and `viem`.

---

## Monorepo Layout

```
smart-contract-wallet/
├── apps/
│   └── web/                   # Next.js 14+ Frontend (React, Tailwind CSS, Viem)
├── contracts/                 # Foundry project (Solidity contracts, tests, scripts)
├── packages/
│   ├── config/                # Shared ESLint, Prettier, and TypeScript configurations
│   ├── contracts/             # Centralized contract ABIs, addresses, and bindings
│   ├── wallet-core/           # Framework-agnostic wallet client logic & state machines
│   └── types/                 # Shared TypeScript domain models
├── docs/                      # Architecture, Security, and Threat Model specifications
└── scripts/                   # Local Anvil node runner and deployment tooling
```

---

## Prerequisites

Ensure you have the following installed:
- **Node.js**: `v20+` (or `v24+`)
- **pnpm**: `v9+` / `v12+` (`npm install -g pnpm`)
- **Foundry**: (`forge`, `anvil`, `cast`)

---

## Quickstart & Local Development

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Local Blockchain (Anvil)
In a dedicated terminal, launch the local Anvil node with deterministic test accounts:
```bash
# On Windows PowerShell:
pnpm anvil
# Or directly via Foundry:
anvil --port 8545 --chain-id 31337 --block-time 1
```

### 3. Build & Test Smart Contracts
```bash
# Build contracts
pnpm contracts:build

# Run Foundry test suite
pnpm contracts:test
```

### 4. Run the Web Application
```bash
pnpm dev:web
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Verification Commands

| Command | Action |
| :--- | :--- |
| `pnpm build` | Builds all packages and web application |
| `pnpm typecheck` | Validates TypeScript types across all workspaces |
| `pnpm contracts:test` | Executes Foundry test suite in `contracts/` |
| `pnpm lint` | Runs ESLint across all workspaces |
| `pnpm format` | Formats code with Prettier |

---

## Documentation
- [Architecture Specification](docs/architecture.md)
- [Security Guidelines](docs/security.md)
- [Threat Model](docs/threat-model.md)
