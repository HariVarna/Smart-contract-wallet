# Smart Contract Wallet - Security Principles & Guidelines

## 1. Core Security Tenets

1. **Non-Custodial Invariant**:
   - The user retains sole authority over their cryptographic keys and assets.
   - No backend, intermediary server, or third-party relayer ever receives or handles user private keys or raw mnemonic seeds.
   - All critical signature generation takes place locally on the user's secure client enclave / browser memory.

2. **Zero Storage of Raw Secrets**:
   - Private keys and seed phrases MUST NEVER be persisted in unencrypted client storage (`localStorage`, `sessionStorage`, `IndexedDB`, or cookies).
   - If ephemeral local storage is required in development, keys must be stored in memory only or symmetrically encrypted using strong key derivation functions (PBKDF2/Argon2 + AES-GCM-256) with explicit user passphrases.

3. **Log Sanitization**:
   - Private keys, seed phrases, raw signatures containing sensitive payloads, and API secrets must never be passed to `console.log`, analytics trackers, or external logging sinks.

4. **Checks-Effects-Interactions (CEI)**:
   - All state-modifying smart contract operations must strictly validate input conditions first, mutate internal state (such as incrementing nonces, updating balances, or recording spending limits), and only then execute external calls.

5. **Reentrancy Protection**:
   - Functions performing external calls or value transfers must utilize OpenZeppelin's `ReentrancyGuard` or strict transient storage locks.

6. **Least Privilege & Access Control**:
   - Execution functions must explicitly check caller authorization.
   - Internal administrative mechanisms must be protected with unambiguous access control modifiers.

7. **Custom Errors & Safe Arithmetic**:
   - Use Solidity custom errors (`error Unauthorized()`, `error InvalidNonce()`, etc.) instead of error strings to minimize gas overhead and improve contract clarity.
   - Solidity `0.8.x` native overflow/underflow checks must not be bypassed using `unchecked` blocks unless rigorously proven safe.

---

## 2. Smart Contract Secure Coding Standards

| Pattern | Requirement | Rationale |
| :--- | :--- | :--- |
| **Replay Protection** | EIP-712 Structured Data Hashing with `DOMAIN_SEPARATOR` containing `block.chainid` and `address(this)`. | Prevents cross-chain and cross-contract signature replay attacks. |
| **Call Safety** | Use `.call{value: val}(data)` with checked boolean returns and bubble up revert reasons. Avoid `.transfer()` or `.send()`. | Prevents gas stipend limitations from breaking contract wallet transactions. |
| **Input Validation** | Validate all target addresses, nonces, timestamps, and signature lengths. | Guards against zero-address calls, malformed cryptographic signatures, and expired operations. |
| **Signature Malleability** | Use OpenZeppelin's `ECDSA` library enforcing `s` value in lower half order. | Prevents signature malleability exploits (`ecrecover` malleability). |
| **Proxy Security** | If upgradeable/proxied, initialize implementations and prevent storage collisions using ERC-1967 slots. | Prevents uninitialized logic contract hijacking. |

---

## 3. Frontend & Client Security Checklist

- [x] **Strict Content Security Policy (CSP)**: Disallow arbitrary inline scripts and unsafe evaluations.
- [x] **Input Sanitization**: Use Zod validation on all user form inputs, recipient addresses, and calldata decoders.
- [x] **Simulation before Execution**: Simulate transactions via `eth_call` before requesting user signature to present accurate state-change previews and prevent drainer attacks.
- [x] **Centralized Contract Registry**: Disallow manual address overrides without explicit developer confirmation to prevent phishing substitutions.
