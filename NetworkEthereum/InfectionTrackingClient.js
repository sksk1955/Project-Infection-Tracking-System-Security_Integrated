// Client-side code for interacting with the Ethereum smart contract

const { ethers } = require("ethers");
const crypto = require("crypto");

// ABI will be generated after compiling the contract
const contractABI = require('./InfectionTrackingSystem.json').abi;
const contractAddress = "Change this as in readme";

class InfectionTrackingClient {
    // Add tracking for noise patterns
    constructor(providerUrl) {
        try {
            this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
            this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
            this.wallet = null;
            this.noisePatterns = new Map();
            
            // Test provider connection
            this.provider.getNetwork().catch(error => {
                console.error("Failed to connect to network:", error.message);
                throw new Error("Network connection failed");
            });
        } catch (error) {
            console.error("Failed to initialize client:", error.message);
            throw error;
        }
    }

    // Connect wallet with error handling
    async connectWallet(privateKey) {
        try {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.contractWithSigner = this.contract.connect(this.wallet);
            const address = await this.wallet.getAddress();
            console.log(`Successfully connected wallet with address: ${address}`);
            return address;
        } catch (error) {
            console.error("Failed to connect wallet:", error.message);
            throw error;
        }
    }

    // Simulate homomorphic encryption for infection status
    encryptInfectionStatus(status) {
        // In a real implementation, use a proper homomorphic encryption library
        // For demo purposes, just apply basic encryption simulation
        const statusStr = JSON.stringify(status);
        
        // For demo purposes, just return a "mock encrypted" version
        // This avoids actual crypto library incompatibilities
        return ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(`ENCRYPTED:${statusStr}`)
        );
    }
    

    // Modify existing addNoiseToStatus to track noise
    addNoiseToStatus(status) {
        const noisyStatus = status.map((value, infectionId) => {
            const personId = this.wallet.address;
            const key = `${personId}_${infectionId}`;
            
            if (value === 1) {
                const noiseFactor = 0.95 + Math.random() * 0.1;
                this.noisePatterns.set(key, noiseFactor);
                return value * noiseFactor;
            } else {
                const noise = Math.random() * 0.005;
                this.noisePatterns.set(key, noise);
                return value + noise;
            }
        });
        return noisyStatus;
    }
    

    // Generate a key pair for a BAN user
    generateKeyPair() {
        // Return mock keys for demo purposes
        return { 
            publicKey: "MOCK_PUBLIC_KEY_" + Math.random().toString(36).substring(2, 15),
            privateKey: "MOCK_PRIVATE_KEY_" + Math.random().toString(36).substring(2, 15)
        };
    }

    // Sign data with private key
   // Sign data with private key - simplified version
signData(data, privateKeyPem) {
    // For demo, just create a mock signature
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const mockSignature = "SIG_" + ethers.utils.id(dataStr + privateKeyPem).substring(0, 20);
    return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(mockSignature));
}

    // Register a new user (Trust Authority function)
    async registerUser(userAddress, publicKey) {
        if (!this.wallet) throw new Error("Wallet not connected");
        
        const transaction = await this.contractWithSigner.registerUser(
            userAddress,
            ethers.utils.hexlify(Buffer.from(publicKey))
        );
        
        return await transaction.wait();
    }

    // Update infection status
    async updateInfectionStatus(infectionStatusVector) {
        if (!this.wallet) throw new Error("Wallet not connected");
        
        // Add noise for privacy
        const noisyStatus = this.addNoiseToStatus(infectionStatusVector);
        
        // Encrypt the noisy status
        const encryptedStatus = this.encryptInfectionStatus(noisyStatus);
        
        // Sign the encrypted status
        const signature = this.signData(encryptedStatus, this.wallet.privateKey);
        
        // Send transaction to blockchain
        const transaction = await this.contractWithSigner.updateInfectionStatus(
            this.wallet.address,
            encryptedStatus,
            signature
        );
        
        return await transaction.wait();
    }

    // Record an interaction between two BAN users
    async recordInteraction(otherUserAddress, timestamp) {
        if (!this.wallet) throw new Error("Wallet not connected");
        
        try {
            // Verify both users are registered
            const user1Registered = await this.contract.registeredUsers(this.wallet.address);
            const user2Registered = await this.contract.registeredUsers(otherUserAddress);
            
            if (!user1Registered || !user2Registered) {
                throw new Error("Both users must be registered");
            }
            
            // Sign the interaction data
            const signature = this.signData({
                user1: this.wallet.address,
                user2: otherUserAddress,
                timestamp
            }, this.wallet.privateKey);
            
            // Record the interaction
            const transaction = await this.contractWithSigner.recordInteraction(
                this.wallet.address,
                otherUserAddress,
                signature
            );
            
            return await transaction.wait();
        } catch (error) {
            throw new Error(`Failed to record interaction: ${error.message}`);
        }
    }

    // Calculate IVS score (would be performed off-chain)
    async calculateIVSScore(userAddress) {
        // Get all interactions for traversal
        const interactionsCount = await this.contract.getInteractionsCount();
        
        // Build adjacency graph from interactions
        const adjacencyGraph = new Map();
        
        for (let i = 0; i < interactionsCount; i++) {
            const interaction = await this.contract.allInteractions(i);
            
            if (!adjacencyGraph.has(interaction.user1)) {
                adjacencyGraph.set(interaction.user1, new Set());
            }
            if (!adjacencyGraph.has(interaction.user2)) {
                adjacencyGraph.set(interaction.user2, new Set());
            }
            
            adjacencyGraph.get(interaction.user1).add(interaction.user2);
            adjacencyGraph.get(interaction.user2).add(interaction.user1);
        }
        
        // Define parameters
        const alpha = 5;  // Base risk score
        const severityFactors = [0.5, 1.0, 1.5, 0.8, 1.2];  // For 5 infection types
        const maxDistance = 5;  // Max traversal depth
        
        // Calculate IVS with BFS traversal
        const visited = new Set();
        const queue = [[userAddress, 0]];  // [person, distance]
        
        let ivsScore = Array(5).fill(alpha);  // Start with base score for each infection
        const ivs_metadata = {};
        
        while (queue.length > 0) {
            const [person, distance] = queue.shift();
            
            if (distance > maxDistance || visited.has(person)) {
                continue;
            }
            
            visited.add(person);
            
            // Get neighbors
            const neighbors = adjacencyGraph.get(person) || new Set();
            
            for (const neighbor of neighbors) {
                if (visited.has(neighbor)) continue;
                
                // Get infection status (in real system, would decrypt homomorphically)
                // For demo, we'll simulate with random values
                const encryptedStatus = await this.contract.getInfectionStatus(neighbor);
                
                // In a real system, we would do homomorphic operations here
                // For demo, simulate by generating random infection status
                const simulatedStatus = Array(5).fill(0).map(() => Math.random() > 0.8 ? 1 : 0);
                
                // Calculate contribution to IVS score
                for (let i = 0; i < 5; i++) {  // For each infection type
                    if (simulatedStatus[i] > 0.5) {  // Consider as infected if > 0.5
                        const contribution = 1 / (Math.pow(severityFactors[i], distance));
                        ivsScore[i] += contribution;

                        const base_contribution = contribution;
                        if (!ivs_metadata[neighbor]) {
                            ivs_metadata[neighbor] = {};
                        }
                        ivs_metadata[neighbor][i] = base_contribution;
                    }
                }
                
                queue.push([neighbor, distance + 1]);
            }
        }
        
        const noisy_score = ivsScore;
        const actual_score = this.extractNoise(noisy_score, ivs_metadata);
        
        return actual_score;
    }

    // Add new method for noise extraction
    extractNoise(ivs_score_encrypted, ivs_metadata) {
        let total_noise_contribution = 0;
        
        for (const [neighbor, contributions] of Object.entries(ivs_metadata)) {
            for (const [infectionId, base_contribution] of Object.entries(contributions)) {
                const key = `${neighbor}_${infectionId}`;
                const noiseFactor = this.noisePatterns.get(key);
                
                if (noiseFactor) {
                    if (this.getOriginalStatus(neighbor, infectionId) === 1) {
                        total_noise_contribution += (noiseFactor - 1) * base_contribution;
                    } else {
                        total_noise_contribution += noiseFactor * base_contribution;
                    }
                }
            }
        }

        return ivs_score_encrypted - total_noise_contribution;
    }

    // Helper method to get original infection status
    getOriginalStatus(address, infectionId) {
        // Implement logic to retrieve original status from blockchain
        // This would need to decrypt the stored status
        return 0; // Default return, implement actual logic
    }

    // Classify IVS score
    classifyIVSScore(ivsScore) {
        const THRESHOLD_SAFE = 8;
        const THRESHOLD_CAUTION = 12;
        
        // Calculate weighted sum (simulate weights based on R0 values)
        const weights = [0.15, 0.25, 0.3, 0.1, 0.2];  // Normalized to sum 1
        const weightedSum = ivsScore.reduce((sum, score, idx) => sum + score * weights[idx], 0);
        
        const classifications = ivsScore.map((score, i) => {
            if (score < THRESHOLD_SAFE) {
                return `Infection ${i+1}: Safe to attend gatherings ✅`;
            } else if (score < THRESHOLD_CAUTION) {
                return `Infection ${i+1}: Exercise caution; avoid large gatherings ⚠️`;
            } else {
                return `Infection ${i+1}: High risk; should not attend gatherings ❌`;
            }
        });
        
        let finalDecision;
        if (weightedSum < THRESHOLD_SAFE) {
            finalDecision = "✅ Person is allowed to attend gatherings.";
        } else if (weightedSum < THRESHOLD_CAUTION) {
            finalDecision = "⚠️ Person should avoid large gatherings.";
        } else {
            finalDecision = "❌ Person is NOT allowed to attend gatherings.";
        }
        
        return {
            individualScores: ivsScore,
            classifications,
            weightedSum,
            finalDecision
        };
    }
}

module.exports = InfectionTrackingClient;