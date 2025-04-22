const fs = require('fs');
const path = require('path');

// Path to the compiled contract artifact
const artifactPath = path.join(__dirname, '../artifacts/contracts/InfectionTrackingSystem.sol/InfectionTrackingSystem.json');

// Read the artifact file
const artifactContent = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

// Extract the ABI
const abi = artifactContent.abi;

// Save the ABI to a file
fs.writeFileSync(
  path.join(__dirname, '../InfectionTrackingSystem.json'),
  JSON.stringify({ abi }, null, 2)
);

console.log('ABI extracted and saved to InfectionTrackingSystem.json');