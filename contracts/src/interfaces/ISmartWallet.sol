// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWalletErrors} from "../wallet/WalletErrors.sol";

/**
 * @title ISmartWallet
 * @notice Interface definition for the primary Smart Contract Wallet account.
 */
interface ISmartWallet is IWalletErrors {
    /**
     * @notice Emitted when a transaction call is successfully executed.
     * @param target The destination address of the call.
     * @param value The amount of native ETH transferred with the call.
     * @param data The calldata executed on the target.
     * @param nonce The nonce consumed by this transaction execution.
     * @param returnData The raw return data returned from the target call.
     */
    event TransactionExecuted(
        address indexed target,
        uint256 value,
        bytes data,
        uint256 nonce,
        bytes returnData
    );

    /**
     * @notice Emitted when native ETH is deposited into the wallet.
     * @param sender The sender address of the native ETH.
     * @param amount The amount of native ETH deposited (in wei).
     */
    event EthReceived(address indexed sender, uint256 amount);

    /**
     * @notice Emitted when the wallet emergency lock state changes.
     * @param isLocked The new lock state.
     */
    event WalletLockUpdated(bool isLocked);

    /**
     * @notice Emitted when the allowlist is enabled or disabled.
     * @param isEnabled The new allowlist state.
     */
    event AllowlistStateUpdated(bool isEnabled);

    /**
     * @notice Emitted when a contract's allowlist status changes.
     * @param target The target contract address.
     * @param isAllowed Whether the contract is allowed.
     */
    event ContractAllowlisted(address indexed target, bool isAllowed);

    /**
     * @notice Emitted when the daily native ETH spending limit is set.
     * @param limit The new daily limit in wei.
     */
    event DailyLimitSet(uint256 limit);

    /**
     * @notice Returns the primary owner/signing authority of the wallet.
     */
    function owner() external view returns (address);

    /**
     * @notice Returns the current sequential transaction nonce for a given space.
     * @param space The nonce space (for concurrent execution).
     */
    function getNonce(uint256 space) external view returns (uint256);

    /**
     * @notice Returns the native ETH balance held by the wallet.
     */
    function getBalance() external view returns (uint256);

    /**
     * @notice Executes an arbitrary transaction directly by the authorized owner.
     * @param target Destination contract or recipient address.
     * @param value Amount of native ETH in wei to transfer.
     * @param data Calldata payload to execute on the destination.
     * @return returnData Raw bytes returned by the target call.
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory returnData);

    /**
     * @notice Executes an authorized transaction via an off-chain EIP-712 cryptographic signature.
     * @param target Destination contract or recipient address.
     * @param value Amount of native ETH in wei to transfer.
     * @param data Calldata payload to execute on the destination.
     * @param space Nonce space for concurrent execution.
     * @param nonce Nonce to prevent replay attacks.
     * @param deadline Unix timestamp past which the signature is invalid.
     * @param signature Cryptographic ECDSA signature signed by the wallet owner.
     * @return returnData Raw bytes returned by the target call.
     */
    function executeSigned(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 space,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external payable returns (bytes memory returnData);

    /**
     * @notice EIP-1271 standard signature validation interface.
     * @param hash The hash of the data to be signed.
     * @param signature The signature byte array associated with hash.
     * @return magicValue `0x1626ba7e` if valid, otherwise error or other bytes.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);

    /* -------------------------------------------------------------------------- */
    /*                             SECURITY CONTROLS                              */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Updates the emergency lock state.
     * @param locked Boolean indicating whether the wallet should be locked.
     */
    function setEmergencyLock(bool locked) external;

    /**
     * @notice Toggles the strict contract allowlist policy.
     * @param enabled Boolean indicating whether allowlist checking is active.
     */
    function setAllowlistEnabled(bool enabled) external;

    /**
     * @notice Updates the allowlist status for a specific target contract.
     * @param target The target contract address.
     * @param isAllowed Boolean indicating if the contract is allowed.
     */
    function setContractAllowlist(address target, bool isAllowed) external;

    /**
     * @notice Sets a daily limit for native ETH transfers.
     * @param limit The daily limit in wei.
     */
    function setDailyEthLimit(uint256 limit) external;

    /* -------------------------------------------------------------------------- */
    /*                                 RECOVERY                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Emitted when a guardian is added.
     */
    event GuardianAdded(address indexed guardian);

    /**
     * @notice Emitted when a guardian is removed.
     */
    event GuardianRemoved(address indexed guardian);

    /**
     * @notice Emitted when the recovery threshold is set.
     */
    event RecoveryThresholdSet(uint256 threshold);

    /**
     * @notice Emitted when a recovery process is initiated.
     */
    event RecoveryInitiated(address indexed proposedOwner, uint256 executeAfter);

    /**
     * @notice Emitted when a guardian approves a recovery.
     */
    event RecoveryApproved(address indexed guardian, address indexed proposedOwner);

    /**
     * @notice Emitted when a recovery is executed, transferring ownership.
     */
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);

    /**
     * @notice Emitted when a pending recovery is cancelled.
     */
    event RecoveryCancelled(address indexed by);

    function addGuardian(address guardian) external;
    function removeGuardian(address guardian) external;
    function setRecoveryThreshold(uint256 threshold) external;
    function initiateRecovery(address newOwner) external;
    function approveRecovery(address newOwner) external;
    function executeRecovery() external;
    function cancelRecovery() external;
}
