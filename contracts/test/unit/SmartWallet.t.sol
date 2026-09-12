// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {ISmartWallet} from "../../src/interfaces/ISmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";

contract MockTarget {
    uint256 public value;
    address public lastCaller;
    uint256 public receivedEther;

    event ValueSet(uint256 newValue, address indexed caller);

    function setValue(uint256 _value) external payable {
        value = _value;
        lastCaller = msg.sender;
        receivedEther += msg.value;
        emit ValueSet(_value, msg.sender);
    }

    function failingCall() external pure {
        revert("Target execution deliberately failed");
    }

    receive() external payable {
        receivedEther += msg.value;
    }
}

contract MockERC20 {
    string public name = "Mock Token";
    string public symbol = "MCK";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}

contract SmartWalletUnitTest is Test, IWalletErrors {
    SmartWallet internal wallet;
    MockTarget internal target;

    uint256 internal ownerPrivateKey;
    address internal ownerAddress;

    address internal unauthorizedUser;
    address internal recipient;

    bytes32 internal constant EXECUTE_TYPEHASH =
        keccak256("ExecuteTransaction(address target,uint256 value,bytes data,uint256 nonce,uint256 deadline)");

    function setUp() public {
        ownerPrivateKey = 0xA11CE;
        ownerAddress = vm.addr(ownerPrivateKey);

        unauthorizedUser = makeAddr("unauthorizedUser");
        recipient = makeAddr("recipient");

        wallet = new SmartWallet(ownerAddress);
        target = new MockTarget();

        // Fund wallet with 10 ETH
        vm.deal(address(wallet), 10 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                              1. DEPLOYMENT TESTS                           */
    /* -------------------------------------------------------------------------- */

    function test_Deployment_InitialOwner() public view {
        assertEq(wallet.owner(), ownerAddress, "Owner address mismatch");
        assertEq(wallet.getNonce(), 0, "Initial nonce must be zero");
        assertEq(wallet.getBalance(), 10 ether, "Initial balance mismatch");
    }

    function test_Deployment_RevertOnZeroAddressOwner() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidOwner.selector));
        new SmartWallet(address(0));
    }

    /* -------------------------------------------------------------------------- */
    /*                           2. ETH RECEIVE / BALANCE                         */
    /* -------------------------------------------------------------------------- */

    function test_Receive_EthDeposits() public {
        address depositor = makeAddr("depositor");
        vm.deal(depositor, 5 ether);

        vm.expectEmit(true, true, false, true, address(wallet));
        emit ISmartWallet.EthReceived(depositor, 2 ether);

        vm.prank(depositor);
        (bool success, ) = address(wallet).call{value: 2 ether}("");
        assertTrue(success, "ETH transfer failed");

        assertEq(wallet.getBalance(), 12 ether, "Balance must increase by deposited amount");
        assertEq(address(wallet).balance, 12 ether);
    }

    function test_Fallback_WithDataAndEth() public {
        address depositor = makeAddr("depositor");
        vm.deal(depositor, 5 ether);

        vm.expectEmit(true, true, false, true, address(wallet));
        emit ISmartWallet.EthReceived(depositor, 1 ether);

        vm.prank(depositor);
        (bool success, ) = address(wallet).call{value: 1 ether}(hex"1234");
        assertTrue(success, "Fallback call failed");
        assertEq(wallet.getBalance(), 11 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                       3. DIRECT OWNER EXECUTION (execute)                  */
    /* -------------------------------------------------------------------------- */

    function test_Execute_SendEthDirectly() public {
        uint256 initialRecipientBalance = recipient.balance;
        uint256 transferAmount = 1 ether;

        vm.expectEmit(true, false, false, true, address(wallet));
        emit ISmartWallet.TransactionExecuted(recipient, transferAmount, "", 0, "");

        vm.prank(ownerAddress);
        bytes memory result = wallet.execute(recipient, transferAmount, "");

        assertEq(result.length, 0);
        assertEq(recipient.balance, initialRecipientBalance + transferAmount);
        assertEq(wallet.getBalance(), 9 ether);
        assertEq(wallet.getNonce(), 1, "Nonce must increment after direct execution");
    }

    function test_Execute_ContractCallWithData() public {
        bytes memory callData = abi.encodeWithSelector(MockTarget.setValue.selector, 42);

        vm.expectEmit(true, false, false, true, address(wallet));
        emit ISmartWallet.TransactionExecuted(address(target), 0, callData, 0, "");

        vm.prank(ownerAddress);
        wallet.execute(address(target), 0, callData);

        assertEq(target.value(), 42);
        assertEq(target.lastCaller(), address(wallet));
        assertEq(wallet.getNonce(), 1);
    }

    function test_Execute_ContractCallWithValueAndData() public {
        bytes memory callData = abi.encodeWithSelector(MockTarget.setValue.selector, 100);

        vm.prank(ownerAddress);
        wallet.execute(address(target), 2 ether, callData);

        assertEq(target.value(), 100);
        assertEq(target.receivedEther(), 2 ether);
        assertEq(wallet.getBalance(), 8 ether);
    }

    function test_Execute_RevertWhen_CallerUnauthorized() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, unauthorizedUser));
        wallet.execute(recipient, 1 ether, "");
    }

    function test_Execute_RevertWhen_TargetIsZeroAddress() public {
        vm.prank(ownerAddress);
        vm.expectRevert(abi.encodeWithSelector(ZeroAddress.selector));
        wallet.execute(address(0), 1 ether, "");
    }

    function test_Execute_RevertWhen_InsufficientBalance() public {
        vm.prank(ownerAddress);
        vm.expectRevert(abi.encodeWithSelector(InsufficientBalance.selector, 10 ether, 100 ether));
        wallet.execute(recipient, 100 ether, "");
    }

    function test_Execute_TransferERC20Token() public {
        MockERC20 token = new MockERC20();
        token.mint(address(wallet), 1000e18);

        assertEq(token.balanceOf(address(wallet)), 1000e18);
        assertEq(token.balanceOf(recipient), 0);

        bytes memory transferCallData = abi.encodeWithSelector(MockERC20.transfer.selector, recipient, 250e18);

        vm.expectEmit(true, false, false, true, address(wallet));
        emit ISmartWallet.TransactionExecuted(address(token), 0, transferCallData, 0, abi.encode(true));

        vm.prank(ownerAddress);
        bytes memory result = wallet.execute(address(token), 0, transferCallData);

        bool success = abi.decode(result, (bool));
        assertTrue(success);
        assertEq(token.balanceOf(address(wallet)), 750e18);
        assertEq(token.balanceOf(recipient), 250e18);
        assertEq(wallet.getNonce(), 1);
    }

    function test_Execute_RevertWhen_TargetCallFails() public {
        bytes memory callData = abi.encodeWithSelector(MockTarget.failingCall.selector);

        vm.prank(ownerAddress);
        vm.expectRevert();
        wallet.execute(address(target), 0, callData);
    }

    /* -------------------------------------------------------------------------- */
    /*                   4. SIGNED EXECUTION (executeSigned)                      */
    /* -------------------------------------------------------------------------- */

    function _signTransaction(
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

        // Derive domain separator from wallet
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

    function test_ExecuteSigned_ValidSignatureByRelayer() public {
        address relayer = makeAddr("relayer");
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory data = abi.encodeWithSelector(MockTarget.setValue.selector, 999);

        bytes memory signature = _signTransaction(
            address(target),
            0,
            data,
            nonce,
            deadline,
            ownerPrivateKey
        );

        vm.expectEmit(true, false, false, true, address(wallet));
        emit ISmartWallet.TransactionExecuted(address(target), 0, data, nonce, "");

        vm.prank(relayer);
        wallet.executeSigned(address(target), 0, data, nonce, deadline, signature);

        assertEq(target.value(), 999);
        assertEq(target.lastCaller(), address(wallet));
        assertEq(wallet.getNonce(), 1);
    }

    function test_ExecuteSigned_RevertWhen_InvalidNonce() public {
        uint256 wrongNonce = 5;
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signTransaction(
            recipient,
            1 ether,
            "",
            wrongNonce,
            deadline,
            ownerPrivateKey
        );

        vm.expectRevert(abi.encodeWithSelector(InvalidNonce.selector, 0, wrongNonce));
        wallet.executeSigned(recipient, 1 ether, "", wrongNonce, deadline, signature);
    }

    function test_ExecuteSigned_RevertWhen_ExpiredDeadline() public {
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp - 1;
        bytes memory signature = _signTransaction(
            recipient,
            1 ether,
            "",
            nonce,
            deadline,
            ownerPrivateKey
        );

        vm.expectRevert(abi.encodeWithSelector(ExpiredSignature.selector, deadline, block.timestamp));
        wallet.executeSigned(recipient, 1 ether, "", nonce, deadline, signature);
    }

    function test_ExecuteSigned_RevertWhen_SignatureSignedByNonOwner() public {
        uint256 attackerKey = 0xBAD;
        uint256 nonce = wallet.getNonce();
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _signTransaction(
            recipient,
            1 ether,
            "",
            nonce,
            deadline,
            attackerKey
        );

        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));
        wallet.executeSigned(recipient, 1 ether, "", nonce, deadline, signature);
    }
}
