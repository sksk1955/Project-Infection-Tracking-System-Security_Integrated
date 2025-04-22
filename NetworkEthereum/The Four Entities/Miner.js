const EventEmitter = require('events');
const crypto = require('crypto');

class Miner extends EventEmitter {
    constructor(minerId) {
        super();
        this.minerId = minerId;
        this.adjacencyMatrix = null;
        this.trustedPublicKeys = new Map();
        this.peers = new Set();
        this.consensusThreshold = 0.51;
    }

    initializeWithTA(matrix, signature, taPublicKey) {
        try {
            // Verify TA's signature
            const verify = crypto.createVerify('SHA256');
            verify.update(JSON.stringify(matrix));
            if (!verify.verify(taPublicKey, signature)) {
                throw new Error('Invalid TA signature');
            }

            this.adjacencyMatrix = matrix;
            this.trustedPublicKeys.set('TA', taPublicKey);
            return true;
        } catch(error) {
            console.error(`Miner ${this.minerId} initialization failed:`, error);
            return false;
        }
    }

    registerUserKey(userId, publicKey) {
        try {
            // Validate inputs
            if (!userId || !publicKey) {
                throw new Error('Invalid user registration parameters');
            }

            // Store the public key
            this.trustedPublicKeys.set(userId, publicKey);
            console.log(`Miner ${this.minerId}: Registered public key for ${userId}`);
            return true;
        } catch (error) {
            console.error(`Miner ${this.minerId}: Failed to register user key:`, error.message);
            return false;
        }
    }

    verifyInteractionSignatures(user1, user2, signatures) {
        try {
            if (!Array.isArray(signatures) || signatures.length !== 2) {
                return false;
            }

            const user1Key = this.trustedPublicKeys.get(user1);
            const user2Key = this.trustedPublicKeys.get(user2);

            if (!user1Key || !user2Key) {
                console.log(`Missing public keys for users ${user1} and/or ${user2}`);
                return false;
            }

            const verify1 = crypto.createVerify('SHA256');
            const verify2 = crypto.createVerify('SHA256');

            verify1.update(user1);
            verify2.update(user2);

            return verify1.verify(user1Key, signatures[0]) &&
                   verify2.verify(user2Key, signatures[1]);
        } catch (error) {
            console.error(`Signature verification failed: ${error.message}`);
            return false;
        }
    }

    verifyTASignature(data, signature, taPublicKey) {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(JSON.stringify(data));
            return verify.verify(taPublicKey, signature);
        } catch(error) {
            console.error(`Signature verification failed: ${error.message}`);
            return false;
        }
    }

    verifyUserSignatures(user1, user2, signatures) {
        try {
            return signatures.every(sig => {
                const userKey = this.trustedPublicKeys.get(sig.userId);
                const verify = crypto.createVerify('SHA256');
                verify.update(sig.data);
                return verify.verify(userKey, sig.signature);
            });
        } catch(error) {
            console.error(`User signature verification failed: ${error.message}`);
            return false;
        }
    }

    processInteractionUpdate(user1, user2, signatures) {
        if (!this.verifyUserSignatures(user1, user2, signatures)) {
            return false;
        }

        const update = {
            type: 'interaction',
            user1: user1,
            user2: user2,
            timestamp: Date.now()
        };

        if (this.initiateConsensus(update)) {
            this.updateAdjacencyMatrix(user1, user2);
            this.broadcastUpdate(update);
            return true;
        }
        return false;
    }

    processInteraction(user1, user2, signatures, timestamp) {
        if (!this.verifyInteractionSignatures(user1, user2, signatures)) {
            console.log(`Failed to verify signatures for interaction between ${user1} and ${user2}`);
            return false;
        }

        const update = {
            type: 'interaction',
            user1, 
            user2,
            timestamp,
            signatures
        };

        if (this.initiateConsensus(update)) {
            this.updateAdjacencyMatrix(user1, user2);
            this.broadcastUpdate(update);
            return true;
        }
        return false;
    }

    updateAdjacencyMatrix(user1, user2) {
        if (!this.adjacencyMatrix) {
            throw new Error('Matrix not initialized');
        }
        const index1 = this.getUserIndex(user1);
        const index2 = this.getUserIndex(user2);
        this.adjacencyMatrix[index1][index2] = 1;
        this.adjacencyMatrix[index2][index1] = 1;
    }

    processInfectionStatusUpdate(userId, encryptedData, signature) {
        if (!this.verifyTASignature(encryptedData, signature, this.trustedPublicKeys.get('TA'))) {
            return false;
        }

        const update = {
            type: 'infection',
            userId: userId,
            data: encryptedData,
            timestamp: Date.now()
        };

        if (this.initiateConsensus(update)) {
            this.adjacencyMatrix[userId][userId] = encryptedData;
            this.broadcastUpdate(update);
            return true;
        }
        return false;
    }

    initiateConsensus(update) {
        let votes = 1; // Self vote
        const totalPeers = this.peers.size + 1;
        const requiredVotes = Math.ceil(totalPeers * this.consensusThreshold);

        this.peers.forEach(peer => {
            if (peer.validateUpdate(update)) {
                votes++;
            }
        });

        return votes >= requiredVotes;
    }

    broadcastUpdate(update) {
        this.peers.forEach(peer => {
            peer.receiveUpdate(update);
        });
        this.emit('update', update);
    }

    addPeer(peer) {
        this.peers.add(peer);
    }

    removePeer(peer) {
        this.peers.delete(peer);
    }

    getUserIndex(userId) {
        // Simple implementation - assumes userId format is "User_N"
        return parseInt(userId.split('_')[1]) - 1;
    }
}

module.exports = Miner;