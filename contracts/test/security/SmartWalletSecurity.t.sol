// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {ISmartWallet} from "../../src/interfaces/ISmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";

contract ReentrancyMaliciousTarget is IWalletErrors {
    SmartWallet public immutable wallet;
    bool public attacked;

    constructor(address _wallet) {
        wallet = SmartWallet(payable(_wallet));
    }

    function attackViaExecute() external payable {
        // Attempt reentrant execute call
        wallet.execute(address(this), 0, "");
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            // Attempt reentrancy during ETH transfer
            wallet.execute(msg.sender, 0, "");
        }
    }
}

contract SmartWalletSecurityTest is Test, IWalletErrors {
    SmartWallet internal wallet;
    SmartWallet internal secondWallet;

    uint256 internal ownerPrivateKey;
    address internal ownerAddress;

    address internal attacker;
    address internal recipient;

    bytes32 internal constant EXECUTE_TYPEHASH =
        keccak256("ExecuteTransaction(address target,uint256 value,bytes data,uint256 nonce,uint256 deadline)");

    function setUp() public {
        ownerPrivateKey = 0xABCD1234;
        ownerAddress = vm.addr(ownerPrivateKey);

        attacker = makeAddr("attacker");
        recipient = makeAddr("recipient");

        wallet = new SmartWallet(ownerAddress);
        secondWallet = new SmartWallet(ownerAddress);

        vm.deal(address(wallet), 10 ether);
        vm.deal(address(secondWallet), 10 ether);
    }

    function _sign(
        address _verifyingContract,
        address _target,
        uint256 _value,
        bytes memory _data,
        uint256 _nonce,
        uint256 _deadline,
        uint256 _chainId,
        uint256 _privateKey
    ) internal pure returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                _target,
                _value,
                keccak256(_data),
                _nonce,
                _deadline
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("SmartContractWallet")),
                keccak256(bytes("1")),
                _chainId,
                _verifyingContract
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    /* -------------------------------------------------------------------------- */
    /*                         1. REPLAY ATTACK DEFENSE                           */
    /* -------------------------------------------------------------------------- */

    function test_Security_ReplayAttack_SameSignatureFailsSecondTime() public {
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        // First execution succeeds
        wallet.executeSigned(recipient, 1 ether, "", nonce, deadline, signature);
        assertEq(recipient.balance, 1 ether);
        assertEq(wallet.getNonce(), 1);

        // Attacker attempts to replay same signature payload
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidNonce.selector, 1, nonce));
        wallet.executeSigned(recipient, 1 ether, "", nonce, deadline, signature);
    }

    function test_Security_CrossWalletReplay_FailsAcrossWallets() public {
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        // Signature generated specifically for wallet 1
        bytes memory signatureForWallet1 = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        // Attacker submits signature to wallet 2 (which has same owner)
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        secondWallet.executeSigned(recipient, 1 ether, "", nonce, deadline, signatureForWallet1);
    }

    function test_Security_CrossChainReplay_FailsOnForkOrOtherChain() public {
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 originalChainId = block.chainid;

        bytes memory signatureOriginalChain = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            nonce,
            deadline,
            originalChainId,
            ownerPrivateKey
        );

        // Simulate chain fork or different network (e.g. Chain ID 1 -> 137)
        vm.chainId(137);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, 1 ether, "", nonce, deadline, signatureOriginalChain);
    }

    /* -------------------------------------------------------------------------- */
    /*                       2. SIGNATURE TAMPERING DEFENSE                       */
    /* -------------------------------------------------------------------------- */

    function test_Security_Tampering_TargetAddressFails() public {
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        address tamperedTarget = makeAddr("tamperedTarget");

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(tamperedTarget, 1 ether, "", nonce, deadline, signature);
    }

    function test_Security_Tampering_ValueFails() public {
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        uint256 tamperedValue = 5 ether;

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, tamperedValue, "", nonce, deadline, signature);
    }

    function test_Security_Tampering_CalldataFails() public {
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            0,
            hex"1122",
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        bytes memory tamperedData = hex"3344";

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, 0, tamperedData, nonce, deadline, signature);
    }

    /* -------------------------------------------------------------------------- */
    /*                         3. REENTRANCY ATTACK DEFENSE                       */
    /* -------------------------------------------------------------------------- */

    function test_Security_Reentrancy_BlockedOnDirectExecute() public {
        ReentrancyMaliciousTarget malicious = new ReentrancyMaliciousTarget(address(wallet));

        vm.prank(ownerAddress);
        vm.expectRevert();
        wallet.execute(address(malicious), 1 ether, "");
    }

    function test_Security_Reentrancy_BlockedOnSignedExecute() public {
        ReentrancyMaliciousTarget malicious = new ReentrancyMaliciousTarget(address(wallet));
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            address(malicious),
            1 ether,
            "",
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        vm.expectRevert();
        wallet.executeSigned(address(malicious), 1 ether, "", nonce, deadline, signature);
    }
}
