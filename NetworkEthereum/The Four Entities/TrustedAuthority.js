// TrustAuthority.js
const { ethers } = require("ethers");
const crypto = require("crypto");

class TrustAuthority {
    constructor() {
        // Generate TA's key pair
        this.keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        this.adjacencyMatrix = [];
        this.userPublicKeys = new Map();
        this.noisePatterns = new Map();
    }

    initializeADJ(numUsers) {
        // Initialize adjacency matrix
        this.adjacencyMatrix = Array(numUsers).fill().map(() => 
            Array(numUsers).fill(0));
        // Set diagonal to null
        for(let i = 0; i < numUsers; i++) {
            this.adjacencyMatrix[i][i] = null;
        }
        return this.adjacencyMatrix;
    }

    signADJ() {
        const sign = crypto.createSign('SHA256');
        sign.update(JSON.stringify(this.adjacencyMatrix));
        return sign.sign(this.keyPair.privateKey);
    }

    validateInfectionStatus(encryptedData, signature, publicKey) {
        try {
            const decrypted = crypto.privateDecrypt(
                this.keyPair.privateKey,
                Buffer.from(encryptedData)
            );
            
            const verify = crypto.createVerify('SHA256');
            verify.update(decrypted);
            const isValid = verify.verify(publicKey, signature);
            
            return isValid ? JSON.parse(decrypted.toString()) : null;
        } catch(error) {
            console.error('Validation error:', error);
            return null;
        }
    }

    calculateNoiseContribution(metadata) {
        let totalNoise = 0;
        for (const [userId, infections] of Object.entries(metadata)) {
            for (const [infectionId, contribution] of Object.entries(infections)) {
                const noiseKey = `${userId}_${infectionId}`;
                const noiseFactor = this.noisePatterns.get(noiseKey) || 0;
                totalNoise += noiseFactor * contribution;
            }
        }
        return totalNoise;
    }

    extractNoise(ivs_score, metadata) {
        const noiseContribution = this.calculateNoiseContribution(metadata);
        return Math.max(0, ivs_score - noiseContribution);
    }

    broadcastToMiners(data) {
        const signature = this.signData(data);
        const encrypted = this.encryptForMiners(data);
        return {
            data: encrypted,
            signature: signature,
            timestamp: Date.now()
        };
    }

    signData(data) {
        const sign = crypto.createSign('SHA256');
        sign.update(JSON.stringify(data));
        return sign.sign(this.keyPair.privateKey);
    }

    encryptForMiners(data) {
        return crypto.publicEncrypt(
            this.keyPair.publicKey,
            Buffer.from(JSON.stringify(data))
        );
    }
}

module.exports = TrustAuthority;