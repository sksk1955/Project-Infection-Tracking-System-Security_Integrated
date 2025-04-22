# Blockchain-Based Infection Value System

A privacy-preserving infection tracking system using blockchain technology that implements three main algorithms for secure and private tracking of infection statuses.

## Table of Contents
- [System Overview](#system-overview)
- [Key Algorithms](#key-algorithms)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Demo](#running-the-demo)
- [Demo Workflow](#demo-workflow)
- [Security Features](#security-features)
- [Dependencies](#dependencies)

## System Overview

This system leverages blockchain technology to create a decentralized, privacy-preserving framework for tracking infections while maintaining user privacy. It uses advanced cryptographic techniques including noise addition, homomorphic encryption simulation, and consensus-based validation.

## Key Algorithms

### 1. System Initialization (Algo1)
- Key generation for Trust Authority and BAN users
- Adjacency matrix setup and initialization
- Key distribution and verification
- Blockchain storage with miner consensus

### 2. Proximity-Based Interaction Recording (Algo2)
- Secure interaction recording between users
- Digital signature verification
- Privacy-preserving data storage
- Consensus-based validation

### 3. Infection Status Updates (Algo3)
#### WBAN Status Determination:
- Sensor readings for n infection types

#### Noise Addition by WBAN:
- Generate noise matrix N
- Add noise to infection status: IS' = IS + N
- Encrypt noisy data with TA's public key
- Sign encrypted data
- Send {EncPK_TA(IS'), N, signature} to Miners and the noise to TA

### 4. IVS Score Calculation
- Process interaction history
- Apply infection weights
- Calculate vulnerability scores
- Classify risk levels

### 5. Noise Extraction by TA
#### Data Collection:
- Retrieve calculated IVS
- Fetch corresponding noise matrix N

#### Noise Removal:
- From the final IVA extract noise status: IvS = IvS' - N

## Project Structure of the Network Ethereum
```
infection-tracking-demo/
├── contracts/
│   └── InfectionTrackingSystem.sol    # Smart contract
├── scripts/
│   └── deploy.js                      # Deployment script
├── The Four Entities/
│   ├── TrustedAuthority.js           # TA implementation
│   ├── WBAN.js                       # WBAN implementation
│   ├── User.js                       # User entity logic
│   └── Miner.js                      # Miner implementation
├── artifacts/                         # Compiled contracts
├── demo.js                           # Main demo application
├── InfectionTrackingClient.js        # Client interface
├── InfectionTrackingSystem.json      # Contract ABI
├── hardhat.config.js                 # Hardhat configuration
└── package.json                      # Project dependencies
```

## Prerequisites
- Ethereum Blockchain (Local or Testnet)
- Node.js v14+ 
- npm v6+
- Hardhat (Ethereum Development Environment)
- MetaMask or another Web3 wallet
- Ethereum Account with test ETH (for local testing)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd infection-tracking-demo
```

2. Install dependencies:
```bash
npm install
```

## Running the Demo

1. Start local Hardhat network:
```bash
npx hardhat node
```

2. In a new terminal, deploy the smart contract:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. Copy the deployed contract address and update it in `InfectionTrackingClient.js`:
```javascript
const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

4. Run the demo application:
```bash
node demo.js
```

## Demo Workflow

1. Initialize System (Option 1)
2. Register All Users (Option 2)
3. Fund User Accounts (Option 3)
4. Record Proximity Interactions (Option 4)
5. Update Infection Status (Option 5)
6. Calculate IVS Score (Option 6)


## Dependencies

```json
{
  "dependencies": {
    "ethers": "^5.8.0",
    "crypto": "^1.0.1",
    "fs": "^0.0.1-security",
    "readline": "^1.3.0",
    "@openzeppelin/contracts": "^4.9.2"
  },
  "devDependencies": {
    "@nomiclabs/hardhat-ethers": "^2.2.3",
    "@nomiclabs/hardhat-waffle": "^2.0.6",
    "chai": "^4.3.7",
    "ethereum-waffle": "^4.0.10",
    "hardhat": "^2.17.0"
  }
}
```


## Acknowledgements

Special thanks to Dr. Subhasish Dhal, Department of Computer Science and Engineering, Indian Institute of Information Technology Guwahati (IIITG), for his invaluable guidance and support throughout the development of this project.
