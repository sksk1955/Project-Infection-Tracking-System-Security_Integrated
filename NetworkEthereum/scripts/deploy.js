const { ethers } = require("hardhat");

async function main() {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy the contract
    const InfectionTrackingSystem = await ethers.getContractFactory("InfectionTrackingSystem");
    const contract = await InfectionTrackingSystem.deploy();
    await contract.deployed();

    console.log("Contract deployed to:", contract.address);
    console.log("Trust Authority address:", await contract.trustAuthority());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
