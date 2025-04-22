const TrustAuthority = require('./The Four Entities/TrustedAuthority');
const WBAN = require('./The Four Entities/WBAN');
const Miner = require('./The Four Entities/Miner');
const { ethers } = require('ethers');

async function runSystem() {
    console.log("Starting Infection Tracking System...\n");

    // Initialize entities
    const ta = new TrustAuthority();
    const miners = Array(3).fill().map((_, i) => new Miner(`Miner_${i + 1}`));
    const numUsers = 5;
    const wbans = Array(numUsers).fill().map((_, i) => new WBAN(`User_${i + 1}`));

    console.log("1. Initializing System (Algo1)...");
    const { matrix, signature, publicKey } = await ta.initializeSystem(numUsers);
    
    // Initialize miners with TA data
    miners.forEach(miner => {
        const success = miner.initializeWithTA(matrix, signature, publicKey);
        console.log(`Miner ${miner.minerId} initialization: ${success ? 'Success' : 'Failed'}`);

        // Register WBAN public keys with each miner
        wbans.forEach(wban => {
            try {
                const success = miner.registerUserKey(wban.userId, wban.keyPair.publicKey);
                if (success) {
                    console.log(`✅ ${wban.userId} registered with ${miner.minerId}`);
                } else {
                    console.log(`❌ Failed to register ${wban.userId} with ${miner.minerId}`);
                }
            } catch (error) {
                console.error(`Error registering ${wban.userId} with ${miner.minerId}:`, error.message);
            }
        });
    });

    console.log("\n2. Simulating Proximity Interactions (Algo2)...");
    // Simulate some interactions
    for (let i = 0; i < numUsers - 1; i++) {
        const wban1 = wbans[i];
        const wban2 = wbans[i + 1];
        
        // Record interaction in miners
        miners.forEach(miner => {
            const success = miner.processInteraction(
                wban1.userId,
                wban2.userId,
                [wban1.signData({ timestamp: Date.now() }), wban2.signData({ timestamp: Date.now() })],
                Date.now()
            );
            console.log(`Interaction ${wban1.userId} <-> ${wban2.userId} processed by ${miner.minerId}: ${success ? 'Success' : 'Failed'}`);
        });
    }

    console.log("\n3. Processing Infection Status Updates (Algo3)...");
    // Simulate infection status updates
    for (const wban of wbans) {
        const statusUpdate = wban.prepareStatusUpdate();
        const isValid = ta.validateStatusUpdate(wban.userId, JSON.stringify(statusUpdate.data), statusUpdate.signature);
        console.log(`Status update from ${wban.userId}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    console.log("\nSystem demonstration completed.");
}

// Run the system
runSystem().catch(console.error);