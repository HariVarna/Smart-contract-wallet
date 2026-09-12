// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISmartWallet} from "../interfaces/ISmartWallet.sol";
import {NonceManager} from "../authorization/NonceManager.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SmartWallet
 * @notice Production-oriented, non-custodial Smart Contract Wallet account.
 * @dev Enforces direct owner authorization and EIP-712 signed execution with replay protection.
 */
contract SmartWallet is ISmartWallet, NonceManager, EIP712, ReentrancyGuard {
    /// @dev EIP-712 typehash for transaction execution signatures.
    bytes32 public constant EXECUTE_TYPEHASH =
        keccak256("ExecuteTransaction(address target,uint256 value,bytes data,uint256 nonce,uint256 deadline)");

    /// @dev Authorized owner/signing authority of the smart wallet.
    address private immutable _owner;

    /**
     * @notice Initializes the smart contract wallet with an authorized owner.
     * @param initialOwner The initial authorized signing key / owner.
     */
    constructor(address initialOwner) EIP712("SmartContractWallet", "1") {
        if (initialOwner == address(0)) {
            revert InvalidOwner();
        }
        _owner = initialOwner;
    }

    /**
     * @dev Restricts invocation exclusively to the authorized wallet owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Internal helper validating caller against authorized owner.
     */
    function _checkOwner() internal view {
        if (msg.sender != _owner) {
            revert UnauthorizedCaller(msg.sender);
        }
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function owner() external view override returns (address) {
        return _owner;
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function getNonce() public view override(ISmartWallet, NonceManager) returns (uint256) {
        return super.getNonce();
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function getBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable override nonReentrant onlyOwner returns (bytes memory returnData) {
        if (target == address(0)) {
            revert ZeroAddress();
        }

        uint256 currentNonce = _useNonce();

        if (address(this).balance < value) {
            revert InsufficientBalance(address(this).balance, value);
        }

        bool success;
        (success, returnData) = target.call{value: value}(data);
        if (!success) {
            revert CallExecutionFailed(returnData);
        }

        emit TransactionExecuted(target, value, data, currentNonce, returnData);
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function executeSigned(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external payable override nonReentrant returns (bytes memory returnData) {
        if (target == address(0)) {
            revert ZeroAddress();
        }

        if (block.timestamp > deadline) {
            revert ExpiredSignature(deadline, block.timestamp);
        }

        _verifyAndUseNonce(nonce);

        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                target,
                value,
                keccak256(data),
                nonce,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        (address recoveredSigner, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, signature);

        if (err != ECDSA.RecoverError.NoError || recoveredSigner != _owner || recoveredSigner == address(0)) {
            revert InvalidSignature();
        }

        if (address(this).balance < value) {
            revert InsufficientBalance(address(this).balance, value);
        }

        bool success;
        (success, returnData) = target.call{value: value}(data);
        if (!success) {
            revert CallExecutionFailed(returnData);
        }

        emit TransactionExecuted(target, value, data, nonce, returnData);
    }

    /**
     * @notice Allows the smart wallet to receive native ETH.
     */
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @notice Fallback entrypoint when msg.data is provided with value.
     */
    fallback() external payable {
        emit EthReceived(msg.sender, msg.value);
    }
}
