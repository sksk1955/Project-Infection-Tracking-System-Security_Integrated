
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title InfectionTrackingSystem
 * @dev Smart contract for blockchain-based infection tracking system
 */
contract InfectionTrackingSystem {
    address public trustAuthority; // TA address
    
    // Structure to store encrypted infection data
    struct InfectionData {
        bytes encryptedStatus;      // Encrypted infection status
        bytes signature;            // Signature from WBAN/user
        uint256 timestamp;          // Time when status was updated
    }
    
    // Structure to store proximity interaction
    struct Interaction {
        address user1;
        address user2;
        uint256 timestamp;
        bytes signatures;           // Combined signatures
    }
    
    // Mapping to store users infection data (diagonal of adjacency matrix)
    mapping(address => InfectionData) public infectionStatuses;
    
    // Mapping to track interactions between users (edges of adjacency matrix)
    mapping(address => mapping(address => bool)) public interactions;
    
    // Array to store all interactions for traversal
    Interaction[] public allInteractions;
    
    // Registered BAN users
    mapping(address => bool) public registeredUsers;
    mapping(address => bytes) public userPublicKeys;
    
    // Events
    event UserRegistered(address indexed user, bytes publicKey);
    event InfectionStatusUpdated(address indexed user, uint256 timestamp);
    event InteractionRecorded(address indexed user1, address indexed user2, uint256 timestamp);
    
    // Modifiers
    modifier onlyTA() {
        require(msg.sender == trustAuthority, "Only Trust Authority can call this function");
        _;
    }
    
    modifier onlyRegisteredUser() {
        require(registeredUsers[msg.sender], "Only registered users can call this function");
        _;
    }
    
    /**
     * @dev Constructor sets the Trust Authority address
     */
    constructor() {
        trustAuthority = msg.sender;
    }
    
    /**
     * @dev Register a new BAN user
     * @param userAddress The address of the user to register
     * @param publicKey The public key of the user
     */
    function registerUser(address userAddress, bytes calldata publicKey) external onlyTA {
        registeredUsers[userAddress] = true;
        userPublicKeys[userAddress] = publicKey;
        emit UserRegistered(userAddress, publicKey);
    }
    
    /**
     * @dev Update a user's infection status (Algo3)
     * @param user The address of the user
     * @param encryptedStatus Encrypted infection status vector
     * @param signature Signature from the WBAN
     */
    function updateInfectionStatus(address user, bytes calldata encryptedStatus, bytes calldata signature) external {
        // In a real implementation, verify signature here
        // For interview purposes, we'll simplify this check
        require(msg.sender == user || msg.sender == trustAuthority, "Unauthorized");
        
        InfectionData memory newData = InfectionData({
            encryptedStatus: encryptedStatus,
            signature: signature,
            timestamp: block.timestamp
        });
        
        infectionStatuses[user] = newData;
        emit InfectionStatusUpdated(user, block.timestamp);
    }
    
    /**
     * @dev Record an interaction between two users (Algo2)
     * @param user1 First user in the interaction
     * @param user2 Second user in the interaction
     * @param combinedSignatures Combined signatures verifying the interaction
     */
    function recordInteraction(address user1, address user2, bytes calldata combinedSignatures) external {
        // In a real implementation, verify signatures here
        require(registeredUsers[user1] && registeredUsers[user2], "Users must be registered");
        
        // Update adjacency matrix
        interactions[user1][user2] = true;
        interactions[user2][user1] = true;
        
        // Store interaction for traversal
        allInteractions.push(Interaction({
            user1: user1,
            user2: user2,
            timestamp: block.timestamp,
            signatures: combinedSignatures
        }));
        
        emit InteractionRecorded(user1, user2, block.timestamp);
    }
    
    /**
     * @dev Get the infection status of a user
     * @param user The address of the user
     * @return The encrypted infection status vector
     */
    function getInfectionStatus(address user) external view returns (bytes memory) {
        return infectionStatuses[user].encryptedStatus;
    }
    
    /**
     * @dev Check if two users have interacted
     * @param user1 First user
     * @param user2 Second user
     * @return True if the users have interacted, false otherwise
     */
    function haveInteracted(address user1, address user2) external view returns (bool) {
        return interactions[user1][user2];
    }
    
    /**
     * @dev Get count of all interactions
     * @return The number of interactions recorded
     */
    function getInteractionsCount() external view returns (uint256) {
        return allInteractions.length;
    }
}
