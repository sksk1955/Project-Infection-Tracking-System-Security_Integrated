const InfectionTrackingClient = require('./InfectionTrackingClient');
const readline = require('readline');
const { ethers } = require('ethers');
const crypto = require('crypto');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Initialize the client
const providerUrl = 'http://localhost:8545'; // For local development
const client = new InfectionTrackingClient(providerUrl);

// Set number of users for the simulation
const NUM_USERS = 50;

// Trust Authority key (from Hardhat default accounts)
const trustAuthorityKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Generate deterministic private keys for all users
function generateUserPrivateKey(index) {
    // Create a deterministic but unique private key for each user
    // NOTE: This is only for demo purposes - never generate private keys this way in production!
    const hash = crypto.createHash('sha256').update(`user-${index}-demo-key`).digest('hex');
    return `0x${hash}`;
}

// Create users array
const users = [{ name: "Trust Authority", key: trustAuthorityKey }];

// Generate 50 users with deterministic keys
for (let i = 1; i <= NUM_USERS; i++) {
    users.push({
        name: `User ${i}`,
        key: generateUserPrivateKey(i)
    });
}

// Main menu function
async function showMainMenu() {
    console.clear();
    console.log(`=== Blockchain-Based Infection Tracking System Demo (${NUM_USERS} Users) ===\n`);
    console.log("1. Initialize System (Trust Authority Setup)");
    console.log("2. Register All Users");
    console.log("3. Fund User Accounts");
    console.log("4. Generate Random Interactions");
    console.log("5. Update Infection Status (Randomly)");
    console.log("6. Calculate IVS Score");
    console.log("7. Exit\n");
    
    rl.question("Select an option: ", async (answer) => {
        switch (answer) {
            case '1':
                await initializeSystem();
                break;
            case '2':
                await registerAllUsers();
                break;
            case '3':
                await fundUserAccounts();
                break;
            case '4':
                await generateRandomInteractions();
                break;
            case '5':
                await updateRandomInfectionStatuses();
                break;
            case '6':
                await calculateIVS();
                break;
            case '7':
                rl.close();
                console.log("Exiting. Thank you for using the demo!");
                process.exit(0);
                break;
            default:
                console.log("Invalid option. Please try again.");
                setTimeout(showMainMenu, 1000);
        }
    });
}

// Initialize the system as Trust Authority
async function initializeSystem() {
    console.clear();
    console.log("=== Initializing System as Trust Authority ===\n");
    
    try {
        // Connect as Trust Authority
        const taAddress = await client.connectWallet(trustAuthorityKey);
        console.log(`Connected as Trust Authority (${taAddress})`);
        
        console.log("\nSystem initialized successfully!");
    } catch (error) {
        console.error("Error initializing system:", error.message);
    }
    
    await waitForEnter();
    showMainMenu();
}

async function registerAllUsers() {
    console.clear();
    console.log("=== Register All Users ===\n");
    
    try {
        // Connect as Trust Authority
        await client.connectWallet(trustAuthorityKey);
        const connectedAddress = await client.wallet.getAddress();
        console.log(`Connected as Trust Authority (${connectedAddress})`);
        
        console.log(`\nRegistering ${NUM_USERS} users...`);
        
        // Register users in batches to avoid overwhelming the network
        const BATCH_SIZE = 5;
        const totalBatches = Math.ceil((users.length - 1) / BATCH_SIZE);
        
        for (let batch = 0; batch < totalBatches; batch++) {
            const start = batch * BATCH_SIZE + 1; // Skip Trust Authority (index 0)
            const end = Math.min(start + BATCH_SIZE, users.length);
            
            console.log(`\nProcessing batch ${batch + 1}/${totalBatches} (Users ${start} to ${end - 1})...`);
            
            // Process registrations sequentially within each batch
            for (let i = start; i < end; i++) {
                const user = users[i];
                console.log(`Registering ${user.name}...`);
                
                // Generate key pair
                const { publicKey } = client.generateKeyPair();
                
                // Get user wallet address
                const userWallet = new ethers.Wallet(user.key);
                
                // Process registration and wait for completion before continuing
                try {
                    const receipt = await client.registerUser(userWallet.address, publicKey);
                    console.log(`✅ ${user.name} registered successfully (TX: ${receipt.transactionHash.slice(0, 10)}...)`);
                } catch (err) {
                    console.error(`❌ Failed to register ${user.name}: ${err.message}`);
                    
                    // Optional: Add a retry mechanism here if needed
                    // if (err.message.includes("nonce")) { ... retry logic ... }
                }
                
                // Optional: Add a small delay between transactions to ensure proper nonce sequencing
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`\nRegistration process completed.`);
    } catch (error) {
        console.error("Error in registration process:", error.message);
    }
    
    await waitForEnter();
    showMainMenu();
}

// Fund user accounts in batches
async function fundUserAccounts() {
    console.clear();
    console.log("=== Fund User Accounts ===\n");
    
    try {
        // Connect as Trust Authority
        await client.connectWallet(trustAuthorityKey);
        const connectedAddress = await client.wallet.getAddress();
        console.log(`Connected as Trust Authority (${connectedAddress})`);
        
        console.log(`\nFunding ${NUM_USERS} user accounts...`);
        
        // Fund users in batches to avoid overwhelming the network
        const BATCH_SIZE = 10;
        const totalBatches = Math.ceil((users.length - 1) / BATCH_SIZE);
        
        for (let batch = 0; batch < totalBatches; batch++) {
            const start = batch * BATCH_SIZE + 1; // Skip Trust Authority (index 0)
            const end = Math.min(start + BATCH_SIZE, users.length);
            
            console.log(`\nProcessing batch ${batch + 1}/${totalBatches} (Users ${start} to ${end - 1})...`);
            
            // Process funding sequentially within each batch
            for (let i = start; i < end; i++) {
                const user = users[i];
                const userAddress = new ethers.Wallet(user.key).address;
                
                try {
                    // Check current balance first
                    const currentBalance = await client.provider.getBalance(userAddress);
                    
                    // Only send funds if balance is low
                    if (currentBalance.lt(ethers.utils.parseEther("0.1"))) {
                        console.log(`Funding ${user.name} (${userAddress.slice(0, 10)}...)...`);
                        
                        // Send 0.5 ETH to the user
                        const tx = await client.wallet.sendTransaction({
                            to: userAddress,
                            value: ethers.utils.parseEther("0.5") // 0.5 ETH per user
                        });
                        
                        await tx.wait();
                        console.log(`✅ Sent 0.5 ETH to ${user.name}`);
                    } else {
                        console.log(`ℹ️ ${user.name}: Already funded`);
                    }
                } catch (err) {
                    console.error(`❌ Failed to fund ${user.name}: ${err.message}`);
                }
                
                // Small delay between transactions to ensure proper nonce handling
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`\nFunding process completed.`);
    } catch (error) {
        console.error("Error funding accounts:", error.message);
    }
    
    await waitForEnter();
    showMainMenu();
}

// Generate random interactions between users
// Generate random interactions between users - FIXED VERSION
async function generateRandomInteractions() {
    console.clear();
    console.log("=== Generate Random Interactions ===\n");
    
    try {
        // First check if users are registered and funded
        console.log("Checking user registration and funding status...");
        
        let anyUserNotReady = false;
        
        for (let i = 1; i < Math.min(5, users.length); i++) { // Just check first few users as sample
            const user = users[i];
            const userWallet = new ethers.Wallet(user.key);
            
            // Check registration
            const isRegistered = await client.contract.registeredUsers(userWallet.address);
            
            // Check funding
            const balance = await client.provider.getBalance(userWallet.address);
            const hasFunds = !balance.isZero();
            
            if (!isRegistered) {
                console.log(`❌ ${user.name} is not registered. Please register users first (Option 2).`);
                anyUserNotReady = true;
            }
            
            if (!hasFunds) {
                console.log(`❌ ${user.name} has no funds. Please fund users first (Option 3).`);
                anyUserNotReady = true;
            }
        }
        
        if (anyUserNotReady) {
            throw new Error("Some users are not ready. Please register and fund users first.");
        }
        
        // Ask how many interactions to generate
        rl.question("\nHow many random interactions to generate? (recommended: 100-200): ", async (answer) => {
            const numInteractions = parseInt(answer);
            
            if (isNaN(numInteractions) || numInteractions <= 0) {
                console.log("Invalid number. Please enter a positive number.");
                await waitForEnter();
                showMainMenu();
                return;
            }
            
            console.log(`\nGenerating ${numInteractions} random interactions between ${NUM_USERS} users...`);
            
            // Track progress
            let completedInteractions = 0;
            let failedInteractions = 0;
            
            // Generate interactions in batches
            const BATCH_SIZE = 5;
            const totalBatches = Math.ceil(numInteractions / BATCH_SIZE);
            
            // Keep track of active wallets to manage nonces correctly
            const activeWallets = {};
            
            for (let batch = 0; batch < totalBatches; batch++) {
                const batchSize = Math.min(BATCH_SIZE, numInteractions - batch * BATCH_SIZE);
                console.log(`\nProcessing batch ${batch + 1}/${totalBatches} (${batchSize} interactions)...`);
                
                // Process interactions sequentially to avoid nonce issues
                for (let i = 0; i < batchSize; i++) {
                    // Select two random users (not including Trust Authority)
                    const userIndex1 = Math.floor(Math.random() * NUM_USERS) + 1; // 1 to NUM_USERS
                    let userIndex2 = Math.floor(Math.random() * NUM_USERS) + 1;
                    
                    // Make sure they're different users
                    while (userIndex2 === userIndex1) {
                        userIndex2 = Math.floor(Math.random() * NUM_USERS) + 1;
                    }
                    
                    const fromUser = users[userIndex1];
                    const toUser = users[userIndex2];
                    
                    try {
                        // Check if this wallet was already used
                        if (activeWallets[userIndex1]) {
                            // If recently used, wait a moment to ensure previous TX is processed
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                        
                        // Connect as the first user
                        await client.connectWallet(fromUser.key);
                        activeWallets[userIndex1] = true;
                        
                        // Record the interaction
                        const timestamp = Math.floor(Date.now() / 1000);
                        await client.recordInteraction(
                            new ethers.Wallet(toUser.key).address, 
                            timestamp
                        );
                        
                        console.log(`✅ Recorded: ${fromUser.name} <-> ${toUser.name}`);
                        completedInteractions++;
                    } catch (err) {
                        console.error(`❌ Failed: ${fromUser.name} <-> ${toUser.name} (${err.message})`);
                        failedInteractions++;
                        
                        // If there's a nonce error, force a delay to let the mempool clear
                        if (err.message.includes("nonce")) {
                            console.log("   Nonce issue detected, waiting for transactions to clear...");
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                    
                    // Add a delay between transactions to ensure proper nonce sequencing
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            console.log(`\nInteraction generation completed.`);
            console.log(`✅ Successfully recorded: ${completedInteractions} interactions`);
            if (failedInteractions > 0) {
                console.log(`❌ Failed: ${failedInteractions} interactions`);
            }
            
            await waitForEnter();
            showMainMenu();
        });
        return; // Don't continue to waitForEnter() yet
        
    } catch (error) {
        console.error("Error generating interactions:", error.message);
        await waitForEnter();
        showMainMenu();
    }
}

// Update infection statuses with random data - FIXED VERSION
async function updateRandomInfectionStatuses() {
    console.clear();
    console.log("=== Update Random Infection Statuses ===\n");
    
    try {
        // Check if users are registered and funded first (check a few sample users)
        console.log("Checking user registration and funding status...");
        
        let anyUserNotReady = false;
        
        for (let i = 1; i < Math.min(5, users.length); i++) {
            const user = users[i];
            const userWallet = new ethers.Wallet(user.key);
            
            // Check registration
            const isRegistered = await client.contract.registeredUsers(userWallet.address);
            
            // Check funding
            const balance = await client.provider.getBalance(userWallet.address);
            const hasFunds = !balance.isZero();
            
            if (!isRegistered) {
                console.log(`❌ ${user.name} is not registered. Please register users first (Option 2).`);
                anyUserNotReady = true;
            }
            
            if (!hasFunds) {
                console.log(`❌ ${user.name} has no funds. Please fund users first (Option 3).`);
                anyUserNotReady = true;
            }
        }
        
        if (anyUserNotReady) {
            throw new Error("Some users are not ready. Please register and fund users first.");
        }
        
        // Generate random infection patterns
        console.log(`\nSimulating infection spread for ${NUM_USERS} users...`);
        
        // Parameters for random infection distribution
        const INFECTION_RATES = [0.1, 0.05, 0.03, 0.02, 0.08]; // Probability of each infection type
        
        // Track success/failure
        let successCount = 0;
        let failureCount = 0;
        
        // Process users in batches
        const BATCH_SIZE = 5; // Reduced batch size for better nonce management
        const totalBatches = Math.ceil(NUM_USERS / BATCH_SIZE);
        
        for (let batch = 0; batch < totalBatches; batch++) {
            const start = batch * BATCH_SIZE + 1; // Skip Trust Authority (index 0)
            const end = Math.min(start + BATCH_SIZE, users.length);
            
            console.log(`\nProcessing batch ${batch + 1}/${totalBatches} (Users ${start} to ${end - 1})...`);
            
            // Process updates sequentially instead of in parallel
            for (let i = start; i < end; i++) {
                const user = users[i];
                
                // Generate random infection status (5 infection types)
                const infectionStatus = INFECTION_RATES.map(rate => 
                    Math.random() < rate ? 1 : 0
                );
                
                try {
                    // Connect as this user
                    await client.connectWallet(user.key);
                    
                    // Update infection status
                    await client.updateInfectionStatus(infectionStatus);
                    
                    const statusSummary = infectionStatus.map(s => s === 1 ? '✓' : '✗').join(' ');
                    console.log(`✅ ${user.name}: [${statusSummary}]`);
                    successCount++;
                } catch (err) {
                    const statusSummary = infectionStatus.map(s => s === 1 ? '✓' : '✗').join(' ');
                    console.error(`❌ ${user.name}: [${statusSummary}] - ${err.message}`);
                    failureCount++;
                    
                    // If there's a nonce error, force a delay to let the mempool clear
                    if (err.message.includes("nonce")) {
                        console.log("   Nonce issue detected, waiting for transactions to clear...");
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                
                // Add a delay between transactions to ensure proper nonce sequencing
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        console.log(`\nInfection status update completed.`);
        console.log(`✅ Successfully updated: ${successCount} users`);
        if (failureCount > 0) {
            console.log(`❌ Failed: ${failureCount} users`);
        }
        
    } catch (error) {
        console.error("Error updating infection statuses:", error.message);
    }
    
    await waitForEnter();
    showMainMenu();
}

// Calculate IVS score for a selected user
async function calculateIVS() {
    console.clear();
    console.log("=== Calculate IVS Score ===\n");
    
    try {
        // Verify contract connection
        if (!client.contract) {
            throw new Error("Smart contract not connected");
        }

        // Show list of users
        console.log("Available Users:");
        for (let i = 1; i < Math.min(10, users.length); i++) {
            const user = users[i];
            const userWallet = new ethers.Wallet(user.key);
            const isRegistered = await client.contract.registeredUsers(userWallet.address);
            console.log(`${i}. ${user.name} ${isRegistered ? '(✓ Registered)' : '(✗ Not Registered)'}`);
        }

        // Get user selection
        const userIndex = await new Promise((resolve) => {
            rl.question("\nSelect user (1-50): ", (answer) => {
                const index = parseInt(answer);
                if (isNaN(index) || index < 1 || index > NUM_USERS) {
                    throw new Error("Invalid user selection");
                }
                resolve(index);
            });
        });

        const selectedUser = users[userIndex];
        console.log(`\nCalculating IVS score for ${selectedUser.name}...`);

        // Connect as selected user
        await client.connectWallet(selectedUser.key);
        const userAddress = await client.wallet.getAddress();
        console.log(`Connected as ${selectedUser.name} (${userAddress})`);

        // Get infection status
        const infectionStatus = await client.contract.getInfectionStatus(userAddress);
        console.log("\nCurrent Infection Status:", 
            infectionStatus.map((status, i) => `Type ${i + 1}: ${status ? '✓' : '✗'}`).join(', '));

        // Get interaction count
        const interactions = await client.contract.getUserInteractions(userAddress);
        console.log(`Total Interactions: ${interactions.length}`);

        // Calculate IVS scores for each infection type
        const ivsScores = [];
        for (let i = 0; i < 5; i++) {
            const score = await client.calculateTypeIVS(userAddress, i);
            ivsScores.push(score);
        }

        // Display results
        console.log("\nIVS Scores:");
        ivsScores.forEach((score, i) => {
            console.log(`Infection Type ${i + 1}: ${score.toFixed(2)}`);
        });

        // Calculate weighted sum
        const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
        const weightedSum = ivsScores.reduce((sum, score, i) => sum + score * weights[i], 0);
        console.log(`\nWeighted IVS Score: ${weightedSum.toFixed(2)}`);

        // Classify risk level
        const riskLevel = weightedSum > 0.7 ? "HIGH" : weightedSum > 0.3 ? "MEDIUM" : "LOW";
        console.log(`Risk Level: ${riskLevel}`);

    } catch (error) {
        console.error("Error calculating IVS score:", error.message);
    }

    await waitForEnter();
    showMainMenu();
}

// Process IVS calculation for a selected user
async function processIVSCalculation(userIndex) {
    try {
        const user = users[userIndex];
        console.log(`\nCalculating IVS score for ${user.name}...`);
        
        // Connect as this user
        await client.connectWallet(user.key);
        
        // Calculate IVS score
        const userWallet = new ethers.Wallet(user.key);
        const ivsScore = await client.calculateIVSScore(userWallet.address);
        
        console.log("\nIVS Scores:");
        for (let i = 0; i < ivsScore.length; i++) {
            console.log(`Infection ${i+1}: ${ivsScore[i].toFixed(2)}`);
        }
        
        // Classify IVS score
        const result = client.classifyIVSScore(ivsScore);
        
        console.log("\nClassifications:");
        for (const classification of result.classifications) {
            console.log(classification);
        }
        
        console.log(`\nWeighted Sum: ${result.weightedSum.toFixed(2)}`);
        console.log(`Final Decision: ${result.finalDecision}`);
        
    } catch (error) {
        console.error("Error calculating IVS score:", error.message);
    }
    
    await waitForEnter();
    showMainMenu();
}

// Helper function to wait for Enter key
async function waitForEnter() {
    return new Promise((resolve) => {
        rl.question("\nPress Enter to continue...", () => {
            resolve();
        });
    });
}

// Start the demo
console.log(`Starting Blockchain-Based Infection Tracking System Demo for ${NUM_USERS} users...`);
setTimeout(showMainMenu, 1000);