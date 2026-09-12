// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISmartWallet} from "../interfaces/ISmartWallet.sol";
import {NonceManager} from "../authorization/NonceManager.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {GuardianRecovery} from "../recovery/GuardianRecovery.sol";
import {IAccount} from "@account-abstraction/contracts/interfaces/IAccount.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

/**
 * @title SmartWallet
 * @notice Production-oriented, non-custodial Smart Contract Wallet account.
 * @dev Enforces direct owner authorization and EIP-712 signed execution with replay protection.
 */
contract SmartWallet is ISmartWallet, NonceManager, EIP712, ReentrancyGuard, GuardianRecovery, IAccount {
    /// @dev EIP-712 typehash for transaction execution signatures.
    bytes32 public constant EXECUTE_TYPEHASH =
        keccak256("ExecuteTransaction(address target,uint256 value,bytes data,uint256 space,uint256 nonce,uint256 deadline)");

    /// @dev EIP-1271 magic value
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    /// @dev Authorized owner/signing authority of the smart wallet.
    address private _owner;

    /// @dev ERC-4337 trusted EntryPoint
    address public immutable override entryPoint;

    // --- Security Configuration ---
    bool public isLocked;
    bool public allowlistEnabled;
    mapping(address => bool) public isAllowedContract;
    
    uint256 public dailyEthLimit;
    uint256 public ethSpentToday;
    uint256 public lastDayReset;

    /**
     * @notice Initializes the smart contract wallet with an authorized owner and an EntryPoint.
     * @param initialOwner The initial authorized signing key / owner.
     * @param _entryPoint The trusted ERC-4337 EntryPoint contract.
     */
    constructor(address initialOwner, address _entryPoint) EIP712("SmartContractWallet", "1") {
        if (initialOwner == address(0) || _entryPoint == address(0)) {
            revert InvalidOwner();
        }
        _owner = initialOwner;
        entryPoint = _entryPoint;
    }

    /**
     * @dev Restricts invocation exclusively to the authorized wallet owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Restricts invocation to the trusted EntryPoint.
     */
    modifier onlyEntryPoint() {
        if (msg.sender != entryPoint) {
            revert NotEntryPoint();
        }
        _;
    }

    /**
     * @dev Restricts invocation when the wallet is locked.
     */
    modifier whenNotLocked() {
        if (isLocked) {
            revert WalletLocked();
        }
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
     * @dev Must be implemented by the inheriting wallet to update ownership.
     */
    function _setOwner(address newOwner) internal override {
        _owner = newOwner;
    }

    /**
     * @dev Must be implemented by the inheriting wallet to restrict access to the owner.
     */
    function _requireOwner() internal view override {
        _checkOwner();
    }

    /**
     * @dev Centralized security policy validation.
     */
    function _validatePolicy(address target, uint256 value) internal {
        if (isLocked) {
            revert WalletLocked();
        }
        if (allowlistEnabled && !isAllowedContract[target]) {
            revert TargetNotAllowlisted(target);
        }
        
        if (value > 0) {
            if (block.timestamp >= lastDayReset + 1 days) {
                ethSpentToday = 0;
                lastDayReset = block.timestamp;
            }
            if (dailyEthLimit > 0) {
                uint256 remaining = dailyEthLimit >= ethSpentToday ? dailyEthLimit - ethSpentToday : 0;
                if (value > remaining) {
                    revert ExceedsDailyLimit(value, remaining);
                }
                ethSpentToday += value;
            }
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
    function getNonce(uint256 space) public view override(ISmartWallet, NonceManager) returns (uint256) {
        return super.getNonce(space);
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

        uint256 currentNonce = _useNonce(0); // Default space for direct owner execution
        
        _validatePolicy(target, value);

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
        uint256 space,
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

        _verifyAndUseNonce(space, nonce);
        
        _validatePolicy(target, value);

        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                target,
                value,
                keccak256(data),
                space,
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

    /* -------------------------------------------------------------------------- */
    /*                             ACCOUNT ABSTRACTION                            */
    /* -------------------------------------------------------------------------- */

    /**
     * @inheritdoc IAccount
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override onlyEntryPoint returns (uint256 validationData) {
        (address recoveredSigner, ECDSA.RecoverError err, ) = ECDSA.tryRecover(userOpHash, userOp.signature);
        
        if (err != ECDSA.RecoverError.NoError || recoveredSigner != _owner || recoveredSigner == address(0)) {
            return 1; // SIG_VALIDATION_FAILED
        }
        
        if (missingAccountFunds > 0) {
            (bool success, ) = msg.sender.call{value: missingAccountFunds}("");
            require(success, "Prefund failed");
        }
        
        return 0; // Success
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function executeUserOp(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable override onlyEntryPoint returns (bytes memory returnData) {
        if (target == address(0)) revert ZeroAddress();
        
        _validatePolicy(target, value);
        if (address(this).balance < value) revert InsufficientBalance(address(this).balance, value);

        bool success;
        (success, returnData) = target.call{value: value}(data);
        if (!success) revert CallExecutionFailed(returnData);

        emit TransactionExecuted(target, value, data, 0, returnData);
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function executeUserOpBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external payable override onlyEntryPoint returns (bytes[] memory returnDatas) {
        require(targets.length == values.length && values.length == datas.length, "Length mismatch");
        returnDatas = new bytes[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            address target = targets[i];
            uint256 value = values[i];
            bytes calldata data = datas[i];

            if (target == address(0)) revert ZeroAddress();
            
            _validatePolicy(target, value);
            if (address(this).balance < value) revert InsufficientBalance(address(this).balance, value);

            bool success;
            (success, returnDatas[i]) = target.call{value: value}(data);
            if (!success) revert CallExecutionFailed(returnDatas[i]);
            
            emit TransactionExecuted(target, value, data, 0, returnDatas[i]);
        }
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function isValidSignature(bytes32 hash, bytes memory signature) external view override returns (bytes4 magicValue) {
        (address recoveredSigner, ECDSA.RecoverError err, ) = ECDSA.tryRecover(hash, signature);
        if (err == ECDSA.RecoverError.NoError && recoveredSigner == _owner && recoveredSigner != address(0)) {
            return MAGICVALUE;
        }
        return 0xffffffff;
    }

    /* -------------------------------------------------------------------------- */
    /*                             SECURITY CONTROLS                              */
    /* -------------------------------------------------------------------------- */

    /**
     * @inheritdoc ISmartWallet
     */
    function setEmergencyLock(bool locked) external override onlyOwner {
        isLocked = locked;
        emit WalletLockUpdated(locked);
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function setAllowlistEnabled(bool enabled) external override onlyOwner {
        allowlistEnabled = enabled;
        emit AllowlistStateUpdated(enabled);
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function setContractAllowlist(address target, bool isAllowed) external override onlyOwner {
        isAllowedContract[target] = isAllowed;
        emit ContractAllowlisted(target, isAllowed);
    }

    /**
     * @inheritdoc ISmartWallet
     */
    function setDailyEthLimit(uint256 limit) external override onlyOwner {
        dailyEthLimit = limit;
        emit DailyLimitSet(limit);
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
