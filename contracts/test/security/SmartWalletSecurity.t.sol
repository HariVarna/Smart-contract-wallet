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
        keccak256("ExecuteTransaction(address target,uint256 value,bytes data,uint256 space,uint256 nonce,uint256 deadline)");

    function setUp() public {
        ownerPrivateKey = 0xABCD1234;
        ownerAddress = vm.addr(ownerPrivateKey);

        attacker = makeAddr("attacker");
        recipient = makeAddr("recipient");

        wallet = new SmartWallet(ownerAddress, address(0x999));
        secondWallet = new SmartWallet(ownerAddress, address(0x999));

        vm.deal(address(wallet), 10 ether);
        vm.deal(address(secondWallet), 10 ether);
    }

    function _sign(
        address _verifyingContract,
        address _target,
        uint256 _value,
        bytes memory _data,
        uint256 _space,
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
                _space,
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
        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        // First execution succeeds
        wallet.executeSigned(recipient, 1 ether, "", space, nonce, deadline, signature);
        assertEq(recipient.balance, 1 ether);
        assertEq(wallet.getNonce(space), 1);

        // Attacker attempts to replay same signature payload
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidNonce.selector, 1, nonce));
        wallet.executeSigned(recipient, 1 ether, "", space, nonce, deadline, signature);
    }

    function test_Security_CrossWalletReplay_FailsAcrossWallets() public {
        uint256 space = 0;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        // Signature generated specifically for wallet 1
        bytes memory signatureForWallet1 = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        // Attacker submits signature to wallet 2 (which has same owner)
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        secondWallet.executeSigned(recipient, 1 ether, "", space, nonce, deadline, signatureForWallet1);
    }

    function test_Security_CrossChainReplay_FailsOnForkOrOtherChain() public {
        uint256 space = 0;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 originalChainId = block.chainid;

        bytes memory signatureOriginalChain = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            space,
            nonce,
            deadline,
            originalChainId,
            ownerPrivateKey
        );

        // Simulate chain fork or different network (e.g. Chain ID 1 -> 137)
        vm.chainId(137);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, 1 ether, "", space, nonce, deadline, signatureOriginalChain);
    }

    /* -------------------------------------------------------------------------- */
    /*                       2. SIGNATURE TAMPERING DEFENSE                       */
    /* -------------------------------------------------------------------------- */

    function test_Security_Tampering_TargetAddressFails() public {
        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        address tamperedTarget = makeAddr("tamperedTarget");

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(tamperedTarget, 1 ether, "", space, nonce, deadline, signature);
    }

    function test_Security_Tampering_ValueFails() public {
        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        uint256 tamperedValue = 5 ether;

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, tamperedValue, "", space, nonce, deadline, signature);
    }

    function test_Security_Tampering_CalldataFails() public {
        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            0,
            hex"1122",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        bytes memory tamperedData = hex"3344";

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, 0, tamperedData, space, nonce, deadline, signature);
    }

    function test_Security_Tampering_NonceSpaceFails() public {
        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        uint256 tamperedSpace = 1;

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, 1 ether, "", tamperedSpace, nonce, deadline, signature);
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
        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            address(malicious),
            1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        vm.expectRevert();
        wallet.executeSigned(address(malicious), 1 ether, "", space, nonce, deadline, signature);
    }

    /* -------------------------------------------------------------------------- */
    /*                         4. AUTHORIZATION POLICIES                          */
    /* -------------------------------------------------------------------------- */

    function test_Security_Auth_OnlyOwnerCanSetConfiguration() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, attacker));
        wallet.setEmergencyLock(true);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, attacker));
        wallet.setAllowlistEnabled(true);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, attacker));
        wallet.setContractAllowlist(recipient, true);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, attacker));
        wallet.setDailyEthLimit(1 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                         5. SPENDING LIMITS                                 */
    /* -------------------------------------------------------------------------- */

    function test_Security_Limits_DailyLimitEnforced() public {
        vm.prank(ownerAddress);
        wallet.setDailyEthLimit(1 ether);

        // Try to spend more than limit
        vm.prank(ownerAddress);
        vm.expectRevert(abi.encodeWithSelector(ExceedsDailyLimit.selector, 2 ether, 1 ether));
        wallet.execute(recipient, 2 ether, "");

        // Spend exact limit
        vm.prank(ownerAddress);
        wallet.execute(recipient, 1 ether, "");

        // Try to spend more
        vm.prank(ownerAddress);
        vm.expectRevert(abi.encodeWithSelector(ExceedsDailyLimit.selector, 0.1 ether, 0));
        wallet.execute(recipient, 0.1 ether, "");

        // Advance time to next day
        vm.warp(block.timestamp + 1 days + 1);

        // Should be able to spend again
        vm.prank(ownerAddress);
        wallet.execute(recipient, 1 ether, "");
    }

    function test_Security_Limits_BypassFails() public {
        vm.prank(ownerAddress);
        wallet.setDailyEthLimit(1 ether);

        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            2 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        vm.expectRevert(abi.encodeWithSelector(ExceedsDailyLimit.selector, 2 ether, 1 ether));
        wallet.executeSigned(recipient, 2 ether, "", space, nonce, deadline, signature);
    }

    /* -------------------------------------------------------------------------- */
    /*                         6. CONTRACT ALLOWLISTS                             */
    /* -------------------------------------------------------------------------- */

    function test_Security_Allowlist_EnforcedWhenEnabled() public {
        vm.startPrank(ownerAddress);
        wallet.setAllowlistEnabled(true);
        wallet.setContractAllowlist(recipient, true);
        vm.stopPrank();

        // Execution to allowed contract succeeds
        vm.prank(ownerAddress);
        wallet.execute(recipient, 0.1 ether, "");

        // Execution to non-allowed contract fails
        address nonAllowed = makeAddr("nonAllowed");
        vm.prank(ownerAddress);
        vm.expectRevert(abi.encodeWithSelector(TargetNotAllowlisted.selector, nonAllowed));
        wallet.execute(nonAllowed, 0.1 ether, "");
    }

    function test_Security_Allowlist_BypassFails() public {
        vm.startPrank(ownerAddress);
        wallet.setAllowlistEnabled(true);
        vm.stopPrank();

        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            0.1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        vm.expectRevert(abi.encodeWithSelector(TargetNotAllowlisted.selector, recipient));
        wallet.executeSigned(recipient, 0.1 ether, "", space, nonce, deadline, signature);
    }

    /* -------------------------------------------------------------------------- */
    /*                         7. EMERGENCY LOCK                                  */
    /* -------------------------------------------------------------------------- */

    function test_Security_Lock_EnforcedWhenLocked() public {
        vm.prank(ownerAddress);
        wallet.setEmergencyLock(true);

        vm.prank(ownerAddress);
        vm.expectRevert(abi.encodeWithSelector(WalletLocked.selector));
        wallet.execute(recipient, 0.1 ether, "");
    }

    function test_Security_Lock_BypassFails() public {
        vm.prank(ownerAddress);
        wallet.setEmergencyLock(true);

        uint256 space = 0;
        uint256 nonce = wallet.getNonce(space);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _sign(
            address(wallet),
            recipient,
            0.1 ether,
            "",
            space,
            nonce,
            deadline,
            block.chainid,
            ownerPrivateKey
        );

        vm.expectRevert(abi.encodeWithSelector(WalletLocked.selector));
        wallet.executeSigned(recipient, 0.1 ether, "", space, nonce, deadline, signature);
    }
}
