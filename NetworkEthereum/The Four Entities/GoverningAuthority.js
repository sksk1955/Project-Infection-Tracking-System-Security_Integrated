const crypto = require('crypto');

class GoverningAuthority {
    constructor() {
        this.keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        this.registeredWBANs = new Map();
        this.wbanKeyRegistry = new Map();
    }

    registerWBAN(wbanId, publicKey) {
        if (this.registeredWBANs.has(wbanId)) {
            throw new Error('WBAN already registered');
        }
        
        this.registeredWBANs.set(wbanId, {
            publicKey: publicKey,
            registrationTime: Date.now(),
            lastUpdate: Date.now(),
            status: 'active'
        });

        return {
            registrationId: crypto.randomBytes(16).toString('hex'),
            timestamp: Date.now()
        };
    }

    verifyWBANSignature(data, signature, wbanId) {
        const wbanInfo = this.registeredWBANs.get(wbanId);
        if (!wbanInfo || wbanInfo.status !== 'active') {
            return false;
        }

        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(typeof data === 'string' ? data : JSON.stringify(data));
            return verify.verify(wbanInfo.publicKey, signature);
        } catch(error) {
            console.error(`WBAN signature verification failed: ${error.message}`);
            return false;
        }
    }

    signForTA(data) {
        try {
            const sign = crypto.createSign('SHA256');
            sign.update(typeof data === 'string' ? data : JSON.stringify(data));
            return {
                signature: sign.sign(this.keyPair.privateKey),
                timestamp: Date.now()
            };
        } catch(error) {
            console.error(`Signing for TA failed: ${error.message}`);
            throw error;
        }
    }

    encryptForTA(data, taPublicKey) {
        try {
            const encryptedData = crypto.publicEncrypt(
                taPublicKey,
                Buffer.from(JSON.stringify(data))
            );

            return {
                encryptedData: encryptedData,
                timestamp: Date.now()
            };
        } catch(error) {
            console.error(`Encryption for TA failed: ${error.message}`);
            throw error;
        }
    }

    validateWBANStatus(wbanId) {
        const wban = this.registeredWBANs.get(wbanId);
        if (!wban) return false;
        
        const timeElapsed = Date.now() - wban.lastUpdate;
        const MAX_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
        
        if (timeElapsed > MAX_UPDATE_INTERVAL) {
            wban.status = 'inactive';
            this.registeredWBANs.set(wbanId, wban);
            return false;
        }
        return true;
    }

    getPublicKey() {
        return this.keyPair.publicKey;
    }
}

module.exports = GoverningAuthority;