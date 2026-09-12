// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWalletFactory} from "../interfaces/IWalletFactory.sol";
import {SmartWallet} from "../wallet/SmartWallet.sol";

/**
 * @title WalletFactory
 * @notice Factory contract for deploying and registering non-custodial SmartWallet accounts.
 * @dev Employs CREATE2 for counterfactual deterministic address computation.
 */
contract WalletFactory is IWalletFactory {
    /// @dev The trusted EntryPoint contract address.
    address public immutable entryPoint;

    /// @dev Registry tracking whether a smart contract address was deployed by this factory.
    mapping(address => bool) private _isWallet;

    /// @dev Registry tracking list of deployed wallet addresses per owner.
    mapping(address => address[]) private _ownerWallets;

    /**
     * @param _entryPoint The trusted ERC-4337 EntryPoint contract.
     */
    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @inheritdoc IWalletFactory
     */
    function isWallet(address walletAddress) external view override returns (bool) {
        return _isWallet[walletAddress];
    }

    /**
     * @inheritdoc IWalletFactory
     */
    function getWallets(address owner) external view override returns (address[] memory) {
        return _ownerWallets[owner];
    }

    /**
     * @inheritdoc IWalletFactory
     */
    function getWalletCount(address owner) external view override returns (uint256) {
        return _ownerWallets[owner].length;
    }

    /**
     * @inheritdoc IWalletFactory
     */
    function getAddress(address owner, uint256 salt) public view override returns (address) {
        if (owner == address(0)) {
            revert InvalidOwner();
        }

        bytes32 rawSalt = keccak256(abi.encode(owner, salt));
        bytes memory creationCode = abi.encodePacked(
            type(SmartWallet).creationCode,
            abi.encode(owner, entryPoint)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                rawSalt,
                keccak256(creationCode)
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @inheritdoc IWalletFactory
     */
    function createWallet(address owner, uint256 salt) external override returns (address walletAddress) {
        if (owner == address(0)) {
            revert InvalidOwner();
        }

        bytes32 rawSalt = keccak256(abi.encode(owner, salt));
        walletAddress = getAddress(owner, salt);

        if (walletAddress.code.length > 0 || _isWallet[walletAddress]) {
            revert WalletAlreadyExists(walletAddress);
        }

        SmartWallet newWallet = new SmartWallet{salt: rawSalt}(owner, entryPoint);
        walletAddress = address(newWallet);

        _isWallet[walletAddress] = true;
        _ownerWallets[owner].push(walletAddress);

        emit WalletCreated(walletAddress, owner, salt);
    }
}
