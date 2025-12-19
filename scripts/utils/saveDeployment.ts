import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  address: string;
  deployedAt: string;
  deployer: string;
  network: string;
  blockExplorer: string;
}

interface DeploymentsData {
  [contractName: string]: {
    [network: string]: DeploymentInfo;
  };
}

/**
 * Get the block explorer URL for a given network and address
 */
function getBlockExplorerUrl(network: string, address: string): string {
  const explorers: { [key: string]: string } = {
    "base-mainnet": `https://basescan.org/address/${address}`,
    "base-sepolia": `https://sepolia.basescan.org/address/${address}`,
    mainnet: `https://etherscan.io/address/${address}`,
    sepolia: `https://sepolia.etherscan.io/address/${address}`,
    hardhat: `Local network (no explorer)`,
    localhost: `Local network (no explorer)`,
  };

  return explorers[network] || `Unknown network: ${network}`;
}

/**
 * Get human-readable timestamp in UTC
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

/**
 * Save deployment information to deployments.json
 */
export async function saveDeployment(
  contractName: string,
  address: string,
  network: string,
  deployer: string
): Promise<void> {
  const deploymentsPath = path.join(
    __dirname,
    "..",
    "..",
    "deployments.json"
  );

  let deployments: DeploymentsData = {};

  // Read existing deployments if file exists
  if (fs.existsSync(deploymentsPath)) {
    try {
      const fileContent = fs.readFileSync(deploymentsPath, "utf8");
      deployments = JSON.parse(fileContent);
    } catch (error) {
      console.warn("⚠️  Could not read existing deployments.json, creating new one");
    }
  }

  // Initialize contract entry if it doesn't exist
  if (!deployments[contractName]) {
    deployments[contractName] = {};
  }

  // Add or update deployment for this network
  deployments[contractName][network] = {
    address,
    deployedAt: getTimestamp(),
    deployer,
    network,
    blockExplorer: getBlockExplorerUrl(network, address),
  };

  // Write updated deployments to file
  fs.writeFileSync(
    deploymentsPath,
    JSON.stringify(deployments, null, 2),
    "utf8"
  );

  console.log(`\n💾 Deployment saved to deployments.json`);
  console.log(`   Contract: ${contractName}`);
  console.log(`   Network: ${network}`);
  console.log(`   Address: ${address}`);
}
