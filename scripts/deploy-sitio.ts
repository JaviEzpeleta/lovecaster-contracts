import hre from "hardhat";
import { saveDeployment } from "./utils/saveDeployment";

/**
 * Deploy SitioDates contract
 *
 * Usage:
 *   npx hardhat run scripts/deploy-sitio.ts --network base-sepolia
 *   npx hardhat run scripts/deploy-sitio.ts --network base-mainnet
 */
async function main() {
  console.log("🚀 Deploying SitioDates...\n");

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log(`📝 Deploying with account: ${deployer.account.address}\n`);

  // Configuration
  const platformWallet = deployer.account.address;
  const platformFeePercentage = 5n; // 5%

  console.log(`💰 Platform Configuration:`);
  console.log(`   Platform Wallet: ${platformWallet}`);
  console.log(`   Platform Fee: ${platformFeePercentage}%\n`);

  // Deploy the contract
  const sitioDates = await hre.viem.deployContract("SitioDates", [
    platformWallet,
    platformFeePercentage,
  ]);

  console.log(`✅ SitioDates deployed to: ${sitioDates.address}\n`);

  // Wait for contract to propagate on network
  console.log("⏳ Waiting 4 seconds for contract propagation...");
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Verify initial state
  const owner = await sitioDates.read.owner();
  const fee = await sitioDates.read.platformFeePercentage();
  const wallet = await sitioDates.read.platformWallet();

  console.log("\n📊 Contract State:");
  console.log(`   - Owner: ${owner}`);
  console.log(`   - Platform Wallet: ${wallet}`);
  console.log(`   - Platform Fee: ${fee}%`);
  console.log(`   - Update Cooldown: 1 hour`);
  console.log(`   - Max Platform Fee: 20%\n`);

  // Save deployment info
  const network = hre.network.name;
  await saveDeployment(
    "SitioDates",
    sitioDates.address,
    network,
    deployer.account.address
  );

  // Generate BaseScan link
  const chainId = await publicClient.getChainId();
  const baseUrl =
    chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

  console.log("\n✨ Deployment complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Verify the contract on BaseScan (if on mainnet)");
  console.log("   2. Register players using registerPlayer(fid, wallet, minPrice)");
  console.log(`   3. Contract address: ${sitioDates.address}`);
  console.log(`\n🔗 View on BaseScan: ${baseUrl}/address/${sitioDates.address}\n`);

  return sitioDates.address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
  });
