// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC721 is ERC721 {
    constructor() ERC721("MockNFT", "MNFT") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}

contract MockERC1155 is ERC1155 {
    constructor() ERC1155("") {}

    function mint(address to, uint256 id, uint256 amount, bytes memory data) external {
        _mint(to, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external {
        _mintBatch(to, ids, amounts, data);
    }
}

contract NFTReceiverTest is Test {
    SmartWallet internal wallet;
    MockERC721 internal erc721;
    MockERC1155 internal erc1155;

    address internal ownerAddress;
    address internal entryPoint;

    function setUp() public {
        ownerAddress = makeAddr("owner");
        entryPoint = makeAddr("entryPoint");

        wallet = new SmartWallet(ownerAddress, entryPoint);
        erc721 = new MockERC721();
        erc1155 = new MockERC1155();
    }

    function test_SafeTransfer_ERC721() public {
        address sender = makeAddr("sender");
        erc721.mint(sender, 1);

        vm.prank(sender);
        erc721.safeTransferFrom(sender, address(wallet), 1);

        assertEq(erc721.ownerOf(1), address(wallet));
    }

    function test_SafeTransfer_ERC1155_Single() public {
        address sender = makeAddr("sender");
        erc1155.mint(sender, 1, 100, "");

        vm.prank(sender);
        erc1155.safeTransferFrom(sender, address(wallet), 1, 100, "");

        assertEq(erc1155.balanceOf(address(wallet), 1), 100);
    }

    function test_SafeTransfer_ERC1155_Batch() public {
        address sender = makeAddr("sender");
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100;
        amounts[1] = 200;

        erc1155.mintBatch(sender, ids, amounts, "");

        vm.prank(sender);
        erc1155.safeBatchTransferFrom(sender, address(wallet), ids, amounts, "");

        assertEq(erc1155.balanceOf(address(wallet), 1), 100);
        assertEq(erc1155.balanceOf(address(wallet), 2), 200);
    }
}
