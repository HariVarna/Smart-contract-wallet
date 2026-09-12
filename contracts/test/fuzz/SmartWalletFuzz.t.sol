// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {ISmartWallet} from "../../src/interfaces/ISmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";

contract FuzzReceiver {
    uint256 public totalReceived;
    bytes public lastData;

    fallback() external payable {
        totalReceived += msg.value;
        lastData = msg.data;
    }

    receive() external payable {
        totalReceived += msg.value;
    }
}

contract SmartWalletFuzzTest is Test, IWalletErrors {
    SmartWallet internal wallet;
    FuzzReceiver internal receiver;

    uint256 internal ownerPrivateKey;
    address internal ownerAddress;

    bytes32 internal constant EXECUTE_TYPEHASH =
        keccak256("ExecuteTransaction(address target,uint256 value,bytes data,uint256 nonce,uint256 deadline)");

    function setUp() public {
        ownerPrivateKey = 0xCAFE1234;
        ownerAddress = vm.addr(ownerPrivateKey);

        wallet = new SmartWallet(ownerAddress, address(0x999));
        receiver = new FuzzReceiver();

        vm.deal(address(wallet), 1000 ether);
    }

    function _sign(
        address _target,
        uint256 _value,
        bytes memory _data,
        uint256 _nonce,
        uint256 _deadline,
        uint256 _privateKey
    ) internal view returns (bytes memory) {
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
                block.chainid,
                address(wallet)
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    /* -------------------------------------------------------------------------- */
    /*                              FUZZ TESTS                                    */
    /* -------------------------------------------------------------------------- */

    function testFuzz_Receive_ArbitraryEth(uint96 depositAmount) public {
        vm.assume(depositAmount > 0);
        address depositor = makeAddr("depositor");
        vm.deal(depositor, depositAmount);

        uint256 initialWalletBalance = wallet.getBalance();

        vm.prank(depositor);
        (bool success, ) = address(wallet).call{value: depositAmount}("");
        assertTrue(success);

        assertEq(wallet.getBalance(), initialWalletBalance + depositAmount);
    }

    function testFuzz_Execute_DirectByOwner(uint96 sendAmount, bytes calldata callData) public {
        vm.assume(sendAmount <= 1000 ether);

        uint256 initialNonce = wallet.getNonce();
        uint256 initialReceiverBalance = address(receiver).balance;

        vm.prank(ownerAddress);
        wallet.execute(address(receiver), sendAmount, callData);

        assertEq(wallet.getNonce(), initialNonce + 1);
        assertEq(address(receiver).balance, initialReceiverBalance + sendAmount);
    }

    function testFuzz_ExecuteSigned_ValidPayloads(
        uint96 sendAmount,
        uint32 deadlineOffset,
        bytes calldata callData
    ) public {
        vm.assume(sendAmount <= 1000 ether);
        vm.assume(deadlineOffset > 0);

        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + deadlineOffset;

        bytes memory signature = _sign(
            address(receiver),
            sendAmount,
            callData,
            nonce,
            deadline,
            ownerPrivateKey
        );

        address relayer = makeAddr("randomRelayer");

        vm.prank(relayer);
        wallet.executeSigned(
            address(receiver),
            sendAmount,
            callData,
            nonce,
            deadline,
            signature
        );

        assertEq(wallet.getNonce(), nonce + 1);
        assertEq(receiver.totalReceived(), sendAmount);
    }

    function testFuzz_Execute_UnauthorizedCallerAlwaysReverts(
        address unauthorizedCaller,
        uint96 sendAmount
    ) public {
        vm.assume(unauthorizedCaller != ownerAddress);
        vm.assume(unauthorizedCaller != address(0));

        vm.prank(unauthorizedCaller);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, unauthorizedCaller));
        wallet.execute(address(receiver), sendAmount, "");
    }
}
