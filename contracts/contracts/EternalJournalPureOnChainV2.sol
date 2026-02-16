// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title EternalJournalPureOnChainV2
/// @notice Upgradeable version of EternalJournal with AccessControl, Pausable, ReentrancyGuard,
///         administrative events, and batch reads.
/// @dev Uses UUPS proxy pattern. Owner roles are typically assigned to a Safe multisig.
contract EternalJournalPureOnChainV2 is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ──────────────────────────────────────────────
    // Roles
    // ──────────────────────────────────────────────

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // ──────────────────────────────────────────────
    // Storage
    // ──────────────────────────────────────────────

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
    uint256 public fee;

    /// @notice Maximum allowed size of ciphertext in bytes. Prevents excessive gas costs.
    uint256 public constant MAX_ENTRY_BYTES = 1024;

    /// @notice Maximum number of entries returned in a single batch read.
    uint256 public constant MAX_BATCH_SIZE = 50;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new entry is added.
    /// @param user Address of the entry author.
    /// @param index Index of the new entry in the user's journal.
    /// @param timestamp Block timestamp at creation.
    event NewEntry(address indexed user, uint256 indexed index, uint128 timestamp);

    /// @notice Emitted when the fee is changed by an admin.
    /// @param oldFee Previous fee value in wei.
    /// @param newFee New fee value in wei.
    event FeeChanged(uint256 oldFee, uint256 newFee);

    /// @notice Emitted when accumulated fees are withdrawn.
    /// @param to Address that received the funds.
    /// @param amount Amount withdrawn in wei.
    event Withdrawn(address indexed to, uint256 amount);

    // ──────────────────────────────────────────────
    // Initializer (replaces constructor)
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract with roles and default fee.
    /// @param defaultAdmin Address that receives DEFAULT_ADMIN_ROLE (typically Safe multisig).
    /// @param pauser Address that receives PAUSER_ROLE.
    /// @param upgrader Address that receives UPGRADER_ROLE.
    function initialize(
        address defaultAdmin,
        address pauser,
        address upgrader
    ) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(FEE_MANAGER_ROLE, defaultAdmin);

        fee = 0.00005 ether;
    }

    // ──────────────────────────────────────────────
    // Core functions
    // ──────────────────────────────────────────────

    /// @notice Adds a new encrypted journal entry. Requires exact fee payment.
    /// @param ciphertext AES-256-GCM encrypted bytes (IV + ciphertext + auth tag).
    /// @dev Uses msg.value == fee (exact match) to avoid overpayments. Pull pattern: fees accumulate in contract.
    function addEntry(bytes calldata ciphertext) external payable whenNotPaused nonReentrant {
        require(msg.value == fee, "Incorrect fee");
        require(ciphertext.length > 0, "Empty entry");
        require(ciphertext.length <= MAX_ENTRY_BYTES, "Entry too large");

        journal[msg.sender].push(Entry(uint128(block.timestamp), ciphertext));

        emit NewEntry(msg.sender, journal[msg.sender].length - 1, uint128(block.timestamp));
    }

    /// @notice Withdraws all accumulated fees to a recipient. Pull pattern: admin calls when ready.
    /// @param to Address to send the funds to.
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Safe transfer via low-level call.
    function withdraw(address payable to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");

        (bool ok, ) = to.call{value: balance}("");
        require(ok, "Transfer failed");

        emit Withdrawn(to, balance);
    }

    /// @notice Updates the fee amount. Only FEE_MANAGER_ROLE can call.
    /// @param newFee New fee in wei.
    function setFee(uint256 newFee) external onlyRole(FEE_MANAGER_ROLE) {
        uint256 oldFee = fee;
        fee = newFee;
        emit FeeChanged(oldFee, newFee);
    }

    // ──────────────────────────────────────────────
    // Pausable
    // ──────────────────────────────────────────────

    /// @notice Pauses the contract. Only PAUSER_ROLE can call.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract. Only PAUSER_ROLE can call.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ──────────────────────────────────────────────
    // Read functions
    // ──────────────────────────────────────────────

    /// @notice Returns a single entry by index for a given user.
    /// @param user Address of the journal owner.
    /// @param index Index of the entry.
    function getEntry(address user, uint256 index) external view returns (Entry memory) {
        require(index < journal[user].length, "Index out of range");
        return journal[user][index];
    }

    /// @notice Returns a batch of entries for a given user.
    /// @param user Address of the journal owner.
    /// @param start Start index (inclusive).
    /// @param end End index (inclusive).
    /// @return entries Array of entries from start to end.
    /// @dev Returns at most MAX_BATCH_SIZE entries. Reverts if indices are out of range.
    function getEntries(
        address user,
        uint256 start,
        uint256 end
    ) external view returns (Entry[] memory entries) {
        uint256 count = journal[user].length;
        require(start <= end, "start > end");
        require(end < count, "end out of range");

        uint256 size = end - start + 1;
        require(size <= MAX_BATCH_SIZE, "Batch too large");

        entries = new Entry[](size);
        for (uint256 i = 0; i < size; i++) {
            entries[i] = journal[user][start + i];
        }
    }

    /// @notice Returns the total number of entries for a given user.
    /// @param user Address of the journal owner.
    function getEntryCount(address user) external view returns (uint256) {
        return journal[user].length;
    }

    // ──────────────────────────────────────────────
    // UUPS upgrade authorization
    // ──────────────────────────────────────────────

    /// @dev Only UPGRADER_ROLE can authorize upgrades.
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
