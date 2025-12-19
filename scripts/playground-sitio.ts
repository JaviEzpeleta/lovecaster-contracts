import hre from "hardhat";
import { parseEther, formatEther } from "viem";

/**
 * Playground script for testing SitioDates on testnet
 *
 * This script demonstrates the full flow:
 * 1. Register players with different prices
 * 2. Pay for dates
 * 3. Verify fee distribution
 * 4. Update player settings
 * 5. Deactivate/reactivate players
 *
 * Usage:
 *   npx hardhat run scripts/playground-sitio.ts --network base-sepolia
 *
 * Note: Update SITIO_DATES_ADDRESS with your deployed contract address
 */

// UPDATE THIS with your deployed contract address
const SITIO_DATES_ADDRESS = process.env.SITIO_DATES_ADDRESS || "0x...";

async function main() {
  console.log("🎮 SitioDates Playground\n");
  console.log("=".repeat(50));

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log(`\n👤 Using account: ${deployer.account.address}`);

  // Check if address is set
  if (SITIO_DATES_ADDRESS === "0x...") {
    console.log("\n⚠️  Please set SITIO_DATES_ADDRESS in the script or via environment variable!");
    console.log("   export SITIO_DATES_ADDRESS=0x...");
    console.log("   Then run: npx hardhat run scripts/playground-sitio.ts --network base-sepolia");
    return;
  }

  // Get contract instance
  const sitioDates = await hre.viem.getContractAt(
    "SitioDates",
    SITIO_DATES_ADDRESS as `0x${string}`
  );

  console.log(`📜 Contract: ${SITIO_DATES_ADDRESS}`);

  // Get chain info
  const chainId = await publicClient.getChainId();
  const baseUrl =
    chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

  console.log(`🔗 BaseScan: ${baseUrl}/address/${SITIO_DATES_ADDRESS}`);

  // Check initial state
  console.log("\n📊 Initial Contract State:");
  const stats = await sitioDates.read.getStats();
  console.log(`   Total Dates: ${stats[0]}`);
  console.log(`   Total Volume: ${formatEther(stats[1])} ETH`);
  console.log(`   Total Players: ${stats[2]}`);
  console.log(`   Platform Fee: ${stats[3]}%`);

  // Demo: Register players
  console.log("\n" + "=".repeat(50));
  console.log("📝 STEP 1: Registering test players");
  console.log("=".repeat(50));

  // Test player FIDs (use your own FIDs in production!)
  const testPlayers = [
    { fid: 99001n, wallet: deployer.account.address, price: parseEther("0.001"), name: "Player A" },
    { fid: 99002n, wallet: deployer.account.address, price: parseEther("0.005"), name: "Player B" },
    { fid: 99003n, wallet: deployer.account.address, price: parseEther("0.01"), name: "Player C" },
  ];

  for (const player of testPlayers) {
    // Check if already registered
    const isRegistered = await sitioDates.read.isPlayerRegistered([player.fid]);

    if (isRegistered) {
      console.log(`\n   ✓ ${player.name} (FID ${player.fid}) already registered`);
      const info = await sitioDates.read.getPlayer([player.fid]);
      console.log(`     Wallet: ${info[1]}`);
      console.log(`     Min Price: ${formatEther(info[2])} ETH`);
      console.log(`     Active: ${info[3]}`);
    } else {
      console.log(`\n   📝 Registering ${player.name} (FID ${player.fid})...`);

      const hash = await sitioDates.write.registerPlayer(
        [player.fid, player.wallet, player.price],
        { account: deployer.account }
      );

      console.log(`      TX: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`      ✅ Registered!`);
      console.log(`      Min Price: ${formatEther(player.price)} ETH`);
    }
  }

  // Demo: Pay for dates
  console.log("\n" + "=".repeat(50));
  console.log("💰 STEP 2: Paying for dates");
  console.log("=".repeat(50));

  // Pay for a date with Player A
  const playerAToPay = 99001n;
  const paymentAmount = parseEther("0.002"); // More than minimum

  console.log(`\n   💳 Paying ${formatEther(paymentAmount)} ETH for date with FID ${playerAToPay}...`);

  // Check balance before
  const balanceBefore = await publicClient.getBalance({
    address: deployer.account.address,
  });

  // Calculate expected split
  const split = await sitioDates.read.calculatePaymentSplit([paymentAmount]);
  console.log(`      Player will receive: ${formatEther(split[0])} ETH (95%)`);
  console.log(`      Platform will receive: ${formatEther(split[1])} ETH (5%)`);

  const payHash = await sitioDates.write.payForDate([playerAToPay], {
    account: deployer.account,
    value: paymentAmount,
  });

  console.log(`      TX: ${payHash}`);
  await publicClient.waitForTransactionReceipt({ hash: payHash });
  console.log(`      ✅ Date paid!`);

  // Check updated stats
  const statsAfter = await sitioDates.read.getStats();
  console.log(`\n   📊 Updated Stats:`);
  console.log(`      Total Dates: ${statsAfter[0]}`);
  console.log(`      Total Volume: ${formatEther(statsAfter[1])} ETH`);

  // Demo: Check cooldown and update (will fail if within cooldown)
  console.log("\n" + "=".repeat(50));
  console.log("⏰ STEP 3: Checking update cooldown");
  console.log("=".repeat(50));

  const cooldown = await sitioDates.read.getUpdateCooldownRemaining([99001n]);
  if (cooldown > 0n) {
    console.log(`\n   ⏳ Cooldown remaining for FID 99001: ${cooldown} seconds`);
    console.log(`      (~${Number(cooldown) / 60} minutes remaining)`);
    console.log(`      Cannot update player settings yet.`);
  } else {
    console.log(`\n   ✅ No cooldown - player can be updated!`);

    // Try updating price
    console.log(`\n   📝 Updating Player A price to 0.002 ETH...`);
    const updateHash = await sitioDates.write.updatePlayer(
      [99001n, deployer.account.address, parseEther("0.002"), true],
      { account: deployer.account }
    );
    console.log(`      TX: ${updateHash}`);
    await publicClient.waitForTransactionReceipt({ hash: updateHash });
    console.log(`      ✅ Updated!`);
  }

  // Demo: View all registered players
  console.log("\n" + "=".repeat(50));
  console.log("👥 STEP 4: Listing all registered players");
  console.log("=".repeat(50));

  const allFids = await sitioDates.read.getAllRegisteredFids();
  console.log(`\n   Total registered: ${allFids.length} players\n`);

  for (const fid of allFids) {
    const info = await sitioDates.read.getPlayer([fid]);
    const isActive = await sitioDates.read.isPlayerActive([fid]);
    console.log(`   FID ${fid}:`);
    console.log(`      Wallet: ${info[1]}`);
    console.log(`      Min Price: ${formatEther(info[2])} ETH`);
    console.log(`      Active: ${isActive ? "✅" : "❌"}`);
    console.log("");
  }

  // Final summary
  console.log("=".repeat(50));
  console.log("✨ Playground Complete!");
  console.log("=".repeat(50));
  console.log(`\n📊 Final Contract State:`);

  const finalStats = await sitioDates.read.getStats();
  console.log(`   Total Dates: ${finalStats[0]}`);
  console.log(`   Total Volume: ${formatEther(finalStats[1])} ETH`);
  console.log(`   Total Players: ${finalStats[2]}`);
  console.log(`   Platform Fee: ${finalStats[3]}%`);

  console.log(`\n🔗 View on BaseScan: ${baseUrl}/address/${SITIO_DATES_ADDRESS}`);
  console.log("\n🎉 Done!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
