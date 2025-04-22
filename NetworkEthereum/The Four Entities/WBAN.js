const crypto = require('crypto');

class WBAN {
    constructor(userId) {
        this.userId = userId;
        this.infectionTypes = 5;
        this.keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
    }

    determineInfectionStatus() {
        const sensorReadings = Array(this.infectionTypes).fill().map(() => {
            const reading = Math.random();
            const noiseLevel = 0.05; // 5% noise
            return {
                value: reading > 0.8 ? 1 : 0,
                confidence: 1 - (Math.random() * noiseLevel)
            };
        });

        return sensorReadings;
    }

    addNoiseToStatus(status) {
        const noiseFactors = new Map();
        
        return status.map((reading, index) => {
            const noiseFactor = reading.value === 1 ? 
                0.95 + (Math.random() * 0.1) : // 5-15% noise for positive cases
                Math.random() * 0.005; // 0-0.5% noise for negative cases
            
            noiseFactors.set(`${this.userId}_${index}`, noiseFactor);
            
            return {
                value: reading.value === 1 ? 
                    reading.value * noiseFactor :
                    reading.value + noiseFactor,
                originalConfidence: reading.confidence,
                noiseFactor: noiseFactor
            };
        });
    }

    prepareData(infectionStatus) {
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16);
        const noisyStatus = this.addNoiseToStatus(infectionStatus);
        
        const data = {
            userId: this.userId,
            status: noisyStatus,
            nonce: nonce.toString('hex'),
            timestamp: timestamp
        };

        const hash = crypto.createHash('SHA256')
            .update(JSON.stringify(data))
            .digest('hex');
        
        return {
            ...data,
            hash: hash
        };
    }

    encryptAndSignData(data, recipientPublicKey) {
        const encryptedData = crypto.publicEncrypt(
            recipientPublicKey,
            Buffer.from(JSON.stringify(data))
        );

        const signature = crypto.createSign('SHA256')
            .update(JSON.stringify(data))
            .sign(this.keyPair.privateKey);

        return {
            encryptedData: encryptedData,
            signature: signature,
            publicKey: this.keyPair.publicKey
        };
    }

    getPublicKey() {
        return this.keyPair.publicKey;
    }
}

module.exports = WBAN;
