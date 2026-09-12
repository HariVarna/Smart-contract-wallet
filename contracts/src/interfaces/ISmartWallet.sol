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
     * @notice Returns the primary owner/signing authority of the wallet.
     */
    function owner() external view returns (address);

    /**
     * @notice Returns the current sequential transaction nonce.
     */
    function getNonce() external view returns (uint256);

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
     * @param nonce Nonce to prevent replay attacks.
     * @param deadline Unix timestamp past which the signature is invalid.
     * @param signature Cryptographic ECDSA signature signed by the wallet owner.
     * @return returnData Raw bytes returned by the target call.
     */
    function executeSigned(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external payable returns (bytes memory returnData);
}
