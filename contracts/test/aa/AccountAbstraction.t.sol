// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockTarget {
    uint256 public valueReceived;
    bytes public dataReceived;

    function receiveCall(bytes calldata data) external payable {
        valueReceived = msg.value;
        dataReceived = data;
    }
}

contract AccountAbstractionTest is Test, IWalletErrors {
    SmartWallet internal wallet;
    MockTarget internal target;

    uint256 internal ownerPrivateKey;
    address internal ownerAddress;
    address internal entryPoint;
    address internal attacker;

    function setUp() public {
        ownerPrivateKey = 0xAA1234;
        ownerAddress = vm.addr(ownerPrivateKey);
        entryPoint = makeAddr("entryPoint");
        attacker = makeAddr("attacker");

        wallet = new SmartWallet(ownerAddress, entryPoint);
        target = new MockTarget();

        vm.deal(address(wallet), 10 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                                VALIDATION                                  */
    /* -------------------------------------------------------------------------- */

    function test_AA_ValidateUserOp_OnlyEntryPoint() public {
        PackedUserOperation memory userOp;
        bytes32 userOpHash = bytes32(0);
        
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(NotEntryPoint.selector));
        wallet.validateUserOp(userOp, userOpHash, 0);
    }

    function test_AA_ValidateUserOp_ValidSignature() public {
        PackedUserOperation memory userOp;
        bytes32 userOpHash = keccak256("test_hash");

        // Sign the hash
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, userOpHash);
        userOp.signature = abi.encodePacked(r, s, v);

        vm.prank(entryPoint);
        uint256 validationData = wallet.validateUserOp(userOp, userOpHash, 0);
        
        assertEq(validationData, 0, "Validation should succeed (0)");
    }

    function test_AA_ValidateUserOp_InvalidSignature() public {
        PackedUserOperation memory userOp;
        bytes32 userOpHash = keccak256("test_hash");

        // Sign with attacker key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xDEADBEEF, userOpHash);
        userOp.signature = abi.encodePacked(r, s, v);

        vm.prank(entryPoint);
        uint256 validationData = wallet.validateUserOp(userOp, userOpHash, 0);
        
        assertEq(validationData, 1, "Validation should fail (1)");
    }

    function test_AA_ValidateUserOp_PaysPrefund() public {
        PackedUserOperation memory userOp;
        bytes32 userOpHash = keccak256("test_hash");

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, userOpHash);
        userOp.signature = abi.encodePacked(r, s, v);

        uint256 prefund = 1 ether;
        uint256 entryPointBalanceBefore = entryPoint.balance;
        uint256 walletBalanceBefore = address(wallet).balance;

        vm.prank(entryPoint);
        uint256 validationData = wallet.validateUserOp(userOp, userOpHash, prefund);
        
        assertEq(validationData, 0);
        assertEq(entryPoint.balance, entryPointBalanceBefore + prefund);
        assertEq(address(wallet).balance, walletBalanceBefore - prefund);
    }

    /* -------------------------------------------------------------------------- */
    /*                                EXECUTION                                   */
    /* -------------------------------------------------------------------------- */

    function test_AA_ExecuteUserOp_OnlyEntryPoint() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(NotEntryPoint.selector));
        wallet.executeUserOp(address(target), 0, "");
    }

    function test_AA_ExecuteUserOpBatch_OnlyEntryPoint() public {
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory datas = new bytes[](1);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(NotEntryPoint.selector));
        wallet.executeUserOpBatch(targets, values, datas);
    }

    function test_AA_ExecuteUserOp_Success() public {
        bytes memory data = abi.encodeWithSelector(MockTarget.receiveCall.selector, "hello");
        uint256 value = 1 ether;

        vm.prank(entryPoint);
        wallet.executeUserOp(address(target), value, data);

        assertEq(target.valueReceived(), value);
        assertEq(target.dataReceived(), data);
    }

    function test_AA_ExecuteUserOpBatch_Success() public {
        address[] memory targets = new address[](2);
        targets[0] = address(target);
        targets[1] = address(target);

        uint256[] memory values = new uint256[](2);
        values[0] = 1 ether;
        values[1] = 2 ether;

        bytes[] memory datas = new bytes[](2);
        datas[0] = abi.encodeWithSelector(MockTarget.receiveCall.selector, "first");
        datas[1] = abi.encodeWithSelector(MockTarget.receiveCall.selector, "second");

        vm.prank(entryPoint);
        wallet.executeUserOpBatch(targets, values, datas);

        // Target state will reflect the last call
        assertEq(target.valueReceived(), 2 ether);
        assertEq(target.dataReceived(), datas[1]);
        assertEq(address(target).balance, 3 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                           POLICY ENFORCEMENT                               */
    /* -------------------------------------------------------------------------- */

    function test_AA_ExecuteUserOp_EnforcesWalletLock() public {
        vm.prank(ownerAddress);
        wallet.setEmergencyLock(true);

        vm.prank(entryPoint);
        vm.expectRevert(abi.encodeWithSelector(WalletLocked.selector));
        wallet.executeUserOp(address(target), 0, "");
    }

    function test_AA_ExecuteUserOp_EnforcesAllowlist() public {
        vm.startPrank(ownerAddress);
        wallet.setAllowlistEnabled(true);
        wallet.setContractAllowlist(address(target), false); // Not allowed
        vm.stopPrank();

        vm.prank(entryPoint);
        vm.expectRevert(abi.encodeWithSelector(TargetNotAllowlisted.selector, address(target)));
        wallet.executeUserOp(address(target), 0, "");

        // Allow it
        vm.prank(ownerAddress);
        wallet.setContractAllowlist(address(target), true);

        vm.prank(entryPoint);
        wallet.executeUserOp(address(target), 0, ""); // Should succeed
    }

    function test_AA_ExecuteUserOp_EnforcesDailyLimit() public {
        vm.prank(ownerAddress);
        wallet.setDailyEthLimit(1 ether);

        vm.prank(entryPoint);
        vm.expectRevert(abi.encodeWithSelector(ExceedsDailyLimit.selector, 2 ether, 1 ether));
        wallet.executeUserOp(address(target), 2 ether, "");
    }
}
