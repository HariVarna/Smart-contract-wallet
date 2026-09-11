# Smart Contract Wallet - Threat Model

## 1. Overview & Methodology

This threat model applies the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) to analyze attack vectors, failure modes, and mitigation strategies for the Smart Contract Wallet architecture.

---

## 2. Threat Analysis Matrix

### 2.1 Spoofing Identity (S)
| Threat | Attack Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Unauthorized Execution** | An attacker transmits arbitrary transaction calldata directly to the smart wallet contract. | Total asset loss / drain. | Strict caller authentication (`require(msg.sender == owner)` or valid EIP-712 cryptographic signature matching owner). |
| **Signature Forgery** | An attacker creates a counterfeit signature payload or exploits weak hashing schemes. | Unauthorized state change. | Utilize OpenZeppelin's `ECDSA` / `SignatureChecker` with EIP-712 structured typed data hashing including domain separator. |
| **Cross-Chain Replay** | A valid transaction signed on Ethereum Mainnet is submitted by an attacker on Arbitrum/Polygon where the user has an identical address. | Unauthorized token transfer on secondary chain. | Include `block.chainid` dynamically computed in the EIP-712 domain separator; do not cache static domain separators across forks. |

---

### 2.2 Tampering with Data (T)
| Threat | Attack Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Calldata Manipulation** | A malicious frontend or intercepted RPC node modifies the `to`, `value`, or `data` fields before signature verification. | Funds redirected to attacker. | The signed hash covers all execution parameters (`to`, `value`, `data`, `nonce`, `deadline`). Contract validates hash integrity before execution. |
| **Nonce Manipulation** | An attacker reorders or replays an earlier transaction signed by the owner. | Double-spending or out-of-order execution. | Monotonically incrementing nonces or bitmap-based sequential/2D nonce tracking in smart contract storage. |

---

### 2.3 Repudiation (R)
| Threat | Attack Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **State Mutation Denial** | A signer claims they never authorized an on-chain execution or recovery event. | Dispute / audit uncertainty. | Emit comprehensive Solidity events (`TransactionExecuted`, `OwnerChanged`, etc.) logging hashes, nonces, and execution statuses. |

---

### 2.4 Information Disclosure (I)
| Threat | Attack Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Private Key Leakage** | Client code accidentally stores keys in unencrypted web storage or prints to log files. | Complete wallet compromise. | Pure in-memory key lifecycles, zero `localStorage` plaintext persistence, sanitized logging in `@scw/wallet-core`. |
| **Unintended Privacy Exposure** | RPC endpoints track IP addresses and tie them to wallet addresses. | User privacy loss. | Configurable RPC providers, batching, and support for private RPC / bundler endpoints. |

---

### 2.5 Denial of Service (DoS) (D)
| Threat | Attack Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Gas Griefing / Out of Gas** | Target contract execution consumes all forwarded gas, reverting the entire transaction. | Failed transactions, wasted relayer fees. | Exact gas forwarding controls, custom error bubbling, and simulation prior to dispatch. |
| **Reentrancy Lockout** | Malicious external contract attempts to re-enter wallet execution function. | State corruption or permanent lock. | Implement OpenZeppelin's `ReentrancyGuard` on all external execution entrypoints. |

---

### 2.6 Elevation of Privilege (E)
| Threat | Attack Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Proxy Logic Hijacking** | Implementation contracts left uninitialized allowing an attacker to call `initialize()` and `selfdestruct`. | Proxy bricking. | Call `_disableInitializers()` in the constructor of implementation contracts. |
| **Privilege Escalation via Delegatecall** | Wallet contract executes `delegatecall` to an untrusted contract, mutating internal wallet storage. | Wallet takeover. | Prohibit arbitrary `delegatecall` in standard wallet execution; only allow plain `call` or strictly whitelisted delegatecall modules. |

---

## 3. Residual Risk & Future Phase Considerations

As future phases introduce Social Recovery, Spending Limits, and ERC-4337 Account Abstraction:
- **Guardian Collusion**: Safeguarded via minimum threshold `M-of-N` signatures and timelocks for recovery.
- **Paymaster Drain**: Safeguarded via gas validation limits and strict bundler reputation tracking.
