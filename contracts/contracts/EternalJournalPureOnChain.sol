// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title EternalJournalPureOnChain
/// @notice A decentralized journal where users store encrypted entries permanently on-chain.
/// @dev Uses Ownable for owner-only operations (withdraw, setFee). Owner is typically a Safe multisig.
contract EternalJournalPureOnChain is Ownable {
    /// @notice Represents a single journal entry stored on-chain.
    /// @param timestamp Block timestamp when the entry was created.
    /// @param ciphertext AES-256-GCM encrypted content (date, title, description as JSON).
    struct Entry {
        uint128 timestamp;
        bytes ciphertext;
    }

    /// @notice Maps each user address to their array of journal entries.
    mapping(address => Entry[]) private journal;

    /// @notice Fixed fee per entry (in wei). Payable on addEntry.
    uint256 public fee = 0.00005 ether;

    /// @notice Maximum allowed size of ciphertext in bytes. Prevents excessive gas costs.
    uint256 public constant MAX_ENTRY_BYTES = 1024;

    /// @notice Emitted when a new entry is added.
    /// @param user Address of the entry author.
    /// @param index Index of the new entry in the user's journal.
    /// @param timestamp Block timestamp at creation.
    event NewEntry(address indexed user, uint256 indexed index, uint128 timestamp);

    /// @notice Initializes the contract with the owner (typically a Safe multisig address).
    /// @param initialOwner Address that will own the contract (e.g. Gnosis Safe).
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Adds a new encrypted journal entry. Requires exact fee payment.
    /// @param ciphertext AES-256-GCM encrypted bytes (IV + ciphertext + auth tag).
    /// @dev Uses msg.value == fee (exact match) to avoid overpayments. Pull pattern: fees accumulate in contract.
    function addEntry(bytes calldata ciphertext) external payable {
        require(msg.value == fee, "Incorrect fee");
        require(ciphertext.length <= MAX_ENTRY_BYTES, "Entry too large");

        journal[msg.sender].push(Entry(uint128(block.timestamp), ciphertext));

        emit NewEntry(msg.sender, journal[msg.sender].length - 1, uint128(block.timestamp));
    }

    /// @notice Withdraws all accumulated fees to the owner. Pull pattern: owner calls when ready.
    /// @dev Only callable by owner. Safe transfer via low-level call.
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "Transfer failed");
    }

    /// @notice Updates the fee amount. Only owner can call.
    /// @param newFee New fee in wei.
    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
    }

    /// @notice Returns a single entry by index for a given user.
    /// @param user Address of the journal owner.
    /// @param index Index of the entry.
    /// @dev Individual reads scale better than returning arrays (avoids RPC limits).
    function getEntry(address user, uint256 index) external view returns (Entry memory) {
        require(index < journal[user].length, "Index out of range");
        return journal[user][index];
    }

    /// @notice Returns the total number of entries for a given user.
    /// @param user Address of the journal owner.
    function getEntryCount(address user) external view returns (uint256) {
        return journal[user].length;
    }
}
