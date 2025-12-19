// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title SitioDates
 * @notice Smart contract for a Farcaster dating game where users can pay to have
 *         virtual dates with AI clones of registered players
 * @dev Players register via owner (gasless), users pay in native ETH
 */
contract SitioDates is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.UintSet;

    // ============================================
    // STRUCTS
    // ============================================

    struct Player {
        uint256 fid;            // Farcaster ID
        address payable wallet; // Wallet to receive payments
        uint256 minPrice;       // Minimum ETH required for a date
        bool active;            // Whether player can receive dates
        uint256 lastUpdated;    // Last update timestamp (for cooldown)
        bool exists;            // Whether player is registered
    }

    // ============================================
    // STATE VARIABLES
    // ============================================

    mapping(uint256 => Player) public players;  // fid => Player
    EnumerableSet.UintSet private _registeredFids;  // Set of all registered FIDs (O(1) add/remove)

    address payable public platformWallet;
    uint256 public platformFeePercentage;       // In basis points (e.g., 500 = 5%)

    uint256 public constant UPDATE_COOLDOWN = 1 hours;
    uint256 public constant BASIS_POINTS = 10000;  // 100% = 10000 basis points
    uint256 public constant MAX_PLATFORM_FEE = 2000; // Max 20% = 2000 basis points

    uint256 public totalDatesCount;             // Total number of dates paid
    uint256 public totalVolumeETH;              // Total ETH volume

    // ============================================
    // EVENTS
    // ============================================

    event PlayerRegistered(
        uint256 indexed fid,
        address indexed wallet,
        uint256 minPrice,
        uint256 timestamp
    );

    event PlayerUpdated(
        uint256 indexed fid,
        address indexed wallet,
        uint256 minPrice,
        bool active,
        uint256 timestamp
    );

    event DatePaid(
        uint256 indexed fid,
        address indexed payer,
        uint256 amount,
        uint256 playerShare,
        uint256 platformShare,
        uint256 timestamp
    );

    event PlatformWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet,
        uint256 timestamp
    );

    event PlatformFeeUpdated(
        uint256 oldFee,
        uint256 newFee,
        uint256 timestamp
    );

    event PlayerDeregistered(
        uint256 indexed fid,
        uint256 timestamp
    );

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(
        address payable _platformWallet,
        uint256 _platformFeePercentage
    ) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_platformFeePercentage <= MAX_PLATFORM_FEE, "Fee too high");

        platformWallet = _platformWallet;
        platformFeePercentage = _platformFeePercentage;
    }

    // ============================================
    // OWNER FUNCTIONS
    // ============================================

    /**
     * @notice Register a new player (gasless for user)
     * @param _fid Farcaster ID of the player
     * @param _wallet Wallet address to receive payments
     * @param _minPrice Minimum ETH required for a date
     */
    function registerPlayer(
        uint256 _fid,
        address payable _wallet,
        uint256 _minPrice
    ) external onlyOwner {
        require(_fid > 0, "Invalid FID");
        require(_wallet != address(0), "Invalid wallet");
        require(!players[_fid].exists, "Player already registered");

        players[_fid] = Player({
            fid: _fid,
            wallet: _wallet,
            minPrice: _minPrice,
            active: true,
            lastUpdated: block.timestamp,
            exists: true
        });

        _registeredFids.add(_fid);

        emit PlayerRegistered(_fid, _wallet, _minPrice, block.timestamp);
    }

    /**
     * @notice Deregister a player completely (removes from set)
     * @param _fid Farcaster ID of the player to deregister
     */
    function deregisterPlayer(uint256 _fid) external onlyOwner {
        require(players[_fid].exists, "Player not registered");

        // Remove from set (O(1) operation)
        _registeredFids.remove(_fid);

        // Clear player data
        delete players[_fid];

        emit PlayerDeregistered(_fid, block.timestamp);
    }

    /**
     * @notice Update an existing player's settings
     * @param _fid Farcaster ID of the player
     * @param _wallet New wallet address
     * @param _minPrice New minimum price
     * @param _active Whether player is active
     */
    function updatePlayer(
        uint256 _fid,
        address payable _wallet,
        uint256 _minPrice,
        bool _active
    ) external onlyOwner {
        require(players[_fid].exists, "Player not registered");
        require(_wallet != address(0), "Invalid wallet");
        require(
            block.timestamp >= players[_fid].lastUpdated + UPDATE_COOLDOWN,
            "Update cooldown not elapsed"
        );

        Player storage player = players[_fid];
        player.wallet = _wallet;
        player.minPrice = _minPrice;
        player.active = _active;
        player.lastUpdated = block.timestamp;

        emit PlayerUpdated(_fid, _wallet, _minPrice, _active, block.timestamp);
    }

    /**
     * @notice Deactivate a player (shortcut for updatePlayer with active=false)
     * @param _fid Farcaster ID of the player
     */
    function deactivatePlayer(uint256 _fid) external onlyOwner {
        require(players[_fid].exists, "Player not registered");
        require(players[_fid].active, "Player already inactive");
        require(
            block.timestamp >= players[_fid].lastUpdated + UPDATE_COOLDOWN,
            "Update cooldown not elapsed"
        );

        Player storage player = players[_fid];
        player.active = false;
        player.lastUpdated = block.timestamp;

        emit PlayerUpdated(
            _fid,
            player.wallet,
            player.minPrice,
            false,
            block.timestamp
        );
    }

    /**
     * @notice Activate a player (shortcut for updatePlayer with active=true)
     * @param _fid Farcaster ID of the player
     */
    function activatePlayer(uint256 _fid) external onlyOwner {
        require(players[_fid].exists, "Player not registered");
        require(!players[_fid].active, "Player already active");
        require(
            block.timestamp >= players[_fid].lastUpdated + UPDATE_COOLDOWN,
            "Update cooldown not elapsed"
        );

        Player storage player = players[_fid];
        player.active = true;
        player.lastUpdated = block.timestamp;

        emit PlayerUpdated(
            _fid,
            player.wallet,
            player.minPrice,
            true,
            block.timestamp
        );
    }

    /**
     * @notice Update the platform wallet address
     * @param _newWallet New platform wallet address
     */
    function setPlatformWallet(address payable _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet");

        address oldWallet = platformWallet;
        platformWallet = _newWallet;

        emit PlatformWalletUpdated(oldWallet, _newWallet, block.timestamp);
    }

    /**
     * @notice Update the platform fee in basis points
     * @param _newFee New fee in basis points (0-2000, where 100 = 1%)
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PLATFORM_FEE, "Fee too high");

        uint256 oldFee = platformFeePercentage;
        platformFeePercentage = _newFee;

        emit PlatformFeeUpdated(oldFee, _newFee, block.timestamp);
    }

    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================

    /**
     * @notice Pay to have a date with a player
     * @param _fid Farcaster ID of the player to date
     */
    function payForDate(uint256 _fid) external payable nonReentrant {
        Player storage player = players[_fid];

        require(player.exists, "Player not registered");
        require(player.active, "Player not active");
        require(msg.value >= player.minPrice, "Payment below minimum price");

        // Calculate fee distribution using basis points for precision
        uint256 platformShare = (msg.value * platformFeePercentage) / BASIS_POINTS;
        uint256 playerShare = msg.value - platformShare;

        // Update statistics
        totalDatesCount++;
        totalVolumeETH += msg.value;

        // Transfer to player (Checks-Effects-Interactions pattern)
        (bool playerSuccess, ) = player.wallet.call{value: playerShare}("");
        require(playerSuccess, "Player payment failed");

        // Transfer to platform
        (bool platformSuccess, ) = platformWallet.call{value: platformShare}("");
        require(platformSuccess, "Platform payment failed");

        emit DatePaid(
            _fid,
            msg.sender,
            msg.value,
            playerShare,
            platformShare,
            block.timestamp
        );
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get player information by FID
     * @param _fid Farcaster ID
     * @return fid The Farcaster ID
     * @return wallet The payment wallet
     * @return minPrice Minimum price for a date
     * @return active Whether player is active
     * @return lastUpdated Last update timestamp
     * @return exists Whether player is registered
     */
    function getPlayer(uint256 _fid) external view returns (
        uint256 fid,
        address wallet,
        uint256 minPrice,
        bool active,
        uint256 lastUpdated,
        bool exists
    ) {
        Player storage player = players[_fid];
        return (
            player.fid,
            player.wallet,
            player.minPrice,
            player.active,
            player.lastUpdated,
            player.exists
        );
    }

    /**
     * @notice Check if a player is registered and active
     * @param _fid Farcaster ID
     * @return True if player exists and is active
     */
    function isPlayerActive(uint256 _fid) external view returns (bool) {
        return players[_fid].exists && players[_fid].active;
    }

    /**
     * @notice Check if a player is registered
     * @param _fid Farcaster ID
     * @return True if player exists
     */
    function isPlayerRegistered(uint256 _fid) external view returns (bool) {
        return players[_fid].exists;
    }

    /**
     * @notice Get minimum price for a player
     * @param _fid Farcaster ID
     * @return Minimum price in wei
     */
    function getMinPrice(uint256 _fid) external view returns (uint256) {
        require(players[_fid].exists, "Player not registered");
        return players[_fid].minPrice;
    }

    /**
     * @notice Get time remaining until player can be updated
     * @param _fid Farcaster ID
     * @return Seconds until update is allowed (0 if already allowed)
     */
    function getUpdateCooldownRemaining(uint256 _fid) external view returns (uint256) {
        require(players[_fid].exists, "Player not registered");

        uint256 cooldownEnd = players[_fid].lastUpdated + UPDATE_COOLDOWN;
        if (block.timestamp >= cooldownEnd) {
            return 0;
        }
        return cooldownEnd - block.timestamp;
    }

    /**
     * @notice Get registered FIDs with pagination
     * @param _offset Starting index
     * @param _limit Maximum number of FIDs to return
     * @return fids Array of registered Farcaster IDs
     * @return total Total number of registered players
     */
    function getRegisteredFids(uint256 _offset, uint256 _limit) external view returns (
        uint256[] memory fids,
        uint256 total
    ) {
        total = _registeredFids.length();
        
        if (_offset >= total || _limit == 0) {
            return (new uint256[](0), total);
        }

        uint256 end = _offset + _limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - _offset;
        fids = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            fids[i] = _registeredFids.at(_offset + i);
        }

        return (fids, total);
    }

    /**
     * @notice Get a single registered FID by index
     * @param _index Index in the set
     * @return The FID at the given index
     */
    function getRegisteredFidAt(uint256 _index) external view returns (uint256) {
        require(_index < _registeredFids.length(), "Index out of bounds");
        return _registeredFids.at(_index);
    }

    /**
     * @notice Check if an FID is in the registered set
     * @param _fid Farcaster ID to check
     * @return True if FID is registered
     */
    function isFidInSet(uint256 _fid) external view returns (bool) {
        return _registeredFids.contains(_fid);
    }

    /**
     * @notice Get total number of registered players
     * @return Count of registered players
     */
    function getTotalPlayersCount() external view returns (uint256) {
        return _registeredFids.length();
    }

    /**
     * @notice Get contract statistics
     * @return _totalDates Total number of dates paid
     * @return _totalVolume Total ETH volume
     * @return _totalPlayers Total registered players
     * @return _platformFee Current platform fee percentage
     */
    function getStats() external view returns (
        uint256 _totalDates,
        uint256 _totalVolume,
        uint256 _totalPlayers,
        uint256 _platformFee
    ) {
        return (
            totalDatesCount,
            totalVolumeETH,
            _registeredFids.length(),
            platformFeePercentage
        );
    }

    /**
     * @notice Calculate payment distribution for a given amount
     * @param _amount Amount in wei
     * @return playerShare Amount player receives
     * @return platformShare Amount platform receives
     */
    function calculatePaymentSplit(uint256 _amount) external view returns (
        uint256 playerShare,
        uint256 platformShare
    ) {
        platformShare = (_amount * platformFeePercentage) / BASIS_POINTS;
        playerShare = _amount - platformShare;
        return (playerShare, platformShare);
    }
}
