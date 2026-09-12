// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWalletErrors} from "../wallet/WalletErrors.sol";

/**
 * @title IWalletFactory
 * @notice Interface for deploying and tracking deterministic SmartWallet accounts.
 */
interface IWalletFactory is IWalletErrors {
    /**
     * @notice Emitted when a new SmartWallet is deployed.
     * @param wallet The address of the deployed smart wallet.
     * @param owner The initial authorized owner address.
     * @param salt The salt value used for deterministic address generation.
     */
    event WalletCreated(
        address indexed wallet,
        address indexed owner,
        uint256 salt
    );

    /// @notice Thrown when attempting to deploy a wallet that is already deployed.
    /// @param wallet The address of the existing wallet.
    error WalletAlreadyExists(address wallet);

    /**
     * @notice Deploys a new deterministic SmartWallet instance.
     * @param owner The authorized owner for the new smart wallet.
     * @param salt Unique salt parameter per owner.
     * @return wallet The address of the created smart wallet.
     */
    function createWallet(address owner, uint256 salt) external returns (address wallet);

    /**
     * @notice Computes the deterministic CREATE2 address for a wallet before deployment.
     * @param owner The authorized owner address.
     * @param salt The unique salt value.
     * @return predictedAddress The counterfactual smart wallet address.
     */
    function getAddress(address owner, uint256 salt) external view returns (address predictedAddress);

    /**
     * @notice Returns whether an address was deployed through this factory.
     * @param wallet The address to check.
     */
    function isWallet(address wallet) external view returns (bool);

    /**
     * @notice Returns the list of all wallet addresses created for an owner.
     * @param owner The owner address.
     */
    function getWallets(address owner) external view returns (address[] memory);

    /**
     * @notice Returns the total count of wallets created for an owner.
     * @param owner The owner address.
     */
    function getWalletCount(address owner) external view returns (uint256);
}
