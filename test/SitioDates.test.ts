import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, formatEther } from "viem";

describe("SitioDates", function () {
  // Fixture for deploying the contract
  async function deploySitioDatesFixture() {
    const [owner, player1, player2, player3, user1, user2] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const platformFeePercentage = 500n; // 5% in basis points (500/10000)

    const sitioDates = await hre.viem.deployContract("SitioDates", [
      owner.account.address, // platformWallet
      platformFeePercentage,
    ]);

    return {
      sitioDates,
      owner,
      player1,
      player2,
      player3,
      user1,
      user2,
      publicClient,
      platformFeePercentage,
    };
  }

  // Fixture with registered players
  async function deployWithPlayersFixture() {
    const fixture = await deploySitioDatesFixture();
    const { sitioDates, owner, player1, player2 } = fixture;

    // Register player1 with FID 1001, price 0.01 ETH
    await sitioDates.write.registerPlayer(
      [1001n, player1.account.address, parseEther("0.01")],
      { account: owner.account }
    );

    // Register player2 with FID 1002, price 0.05 ETH
    await sitioDates.write.registerPlayer(
      [1002n, player2.account.address, parseEther("0.05")],
      { account: owner.account }
    );

    return fixture;
  }

  describe("Deployment & Initial State", function () {
    it("Should deploy with correct initial state", async function () {
      const { sitioDates, owner, platformFeePercentage } = await loadFixture(deploySitioDatesFixture);

      expect((await sitioDates.read.platformWallet()).toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
      expect(await sitioDates.read.platformFeePercentage()).to.equal(platformFeePercentage);
      expect(await sitioDates.read.totalDatesCount()).to.equal(0n);
      expect(await sitioDates.read.totalVolumeETH()).to.equal(0n);
    });

    it("Should set deployer as owner", async function () {
      const { sitioDates, owner } = await loadFixture(deploySitioDatesFixture);

      expect((await sitioDates.read.owner()).toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
    });

    it("Should revert with invalid platform wallet", async function () {
      const [owner] = await hre.viem.getWalletClients();

      await expect(
        hre.viem.deployContract("SitioDates", [
          "0x0000000000000000000000000000000000000000",
          5n,
        ])
      ).to.be.rejectedWith("Invalid platform wallet");
    });

    it("Should revert with fee too high", async function () {
      const [owner] = await hre.viem.getWalletClients();

      await expect(
        hre.viem.deployContract("SitioDates", [owner.account.address, 2500n]) // 25% in basis points, exceeds 20% max
      ).to.be.rejectedWith("Fee too high");
    });
  });

  describe("Player Registration", function () {
    it("Should allow owner to register a player", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.registerPlayer(
        [1001n, player1.account.address, parseEther("0.01")],
        { account: owner.account }
      );

      const player = await sitioDates.read.getPlayer([1001n]);
      expect(player[0]).to.equal(1001n); // fid
      expect(player[1].toLowerCase()).to.equal(player1.account.address.toLowerCase()); // wallet
      expect(player[2]).to.equal(parseEther("0.01")); // minPrice
      expect(player[3]).to.equal(true); // active
      expect(player[6]).to.equal(true); // exists (index shifted due to two timestamp fields)
    });

    it("Should emit PlayerRegistered event", async function () {
      const { sitioDates, owner, player1, publicClient } = await loadFixture(deploySitioDatesFixture);

      const hash = await sitioDates.write.registerPlayer(
        [1001n, player1.account.address, parseEther("0.01")],
        { account: owner.account }
      );

      await publicClient.waitForTransactionReceipt({ hash });
      const logs = await sitioDates.getEvents.PlayerRegistered();

      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.fid).to.equal(1001n);
      expect(logs[0].args.wallet?.toLowerCase()).to.equal(player1.account.address.toLowerCase());
      expect(logs[0].args.minPrice).to.equal(parseEther("0.01"));
    });

    it("Should revert if non-owner tries to register", async function () {
      const { sitioDates, player1, player2 } = await loadFixture(deploySitioDatesFixture);

      await expect(
        sitioDates.write.registerPlayer(
          [1001n, player2.account.address, parseEther("0.01")],
          { account: player1.account }
        )
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should revert with invalid FID", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deploySitioDatesFixture);

      await expect(
        sitioDates.write.registerPlayer(
          [0n, player1.account.address, parseEther("0.01")],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Invalid FID");
    });

    it("Should revert with invalid wallet", async function () {
      const { sitioDates, owner } = await loadFixture(deploySitioDatesFixture);

      await expect(
        sitioDates.write.registerPlayer(
          [1001n, "0x0000000000000000000000000000000000000000", parseEther("0.01")],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Invalid wallet");
    });

    it("Should revert if player already registered", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.registerPlayer(
        [1001n, player1.account.address, parseEther("0.01")],
        { account: owner.account }
      );

      await expect(
        sitioDates.write.registerPlayer(
          [1001n, player1.account.address, parseEther("0.02")],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Player already registered");
    });

    it("Should track registered FIDs", async function () {
      const { sitioDates, owner, player1, player2 } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.registerPlayer(
        [1001n, player1.account.address, parseEther("0.01")],
        { account: owner.account }
      );
      await sitioDates.write.registerPlayer(
        [1002n, player2.account.address, parseEther("0.02")],
        { account: owner.account }
      );

      const [fids, total] = await sitioDates.read.getRegisteredFids([0n, 100n]);
      expect(fids.length).to.equal(2);
      expect(total).to.equal(2n);
      expect(fids[0]).to.equal(1001n);
      expect(fids[1]).to.equal(1002n);
    });

    it("Should allow zero price (free dates)", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.registerPlayer(
        [1001n, player1.account.address, 0n],
        { account: owner.account }
      );

      const minPrice = await sitioDates.read.getMinPrice([1001n]);
      expect(minPrice).to.equal(0n);
    });
  });

  describe("Player Updates", function () {
    it("Should allow owner to update player price after 1h cooldown", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deployWithPlayersFixture);

      // Increase time by 1 hour for price update
      await time.increase(3600);

      await sitioDates.write.updatePlayer(
        [1001n, player1.account.address, parseEther("0.02"), true],
        { account: owner.account }
      );

      const player = await sitioDates.read.getPlayer([1001n]);
      expect(player[2]).to.equal(parseEther("0.02"));
    });

    it("Should allow owner to update player wallet after 24h cooldown", async function () {
      const { sitioDates, owner, player1, player2 } = await loadFixture(deployWithPlayersFixture);

      // Increase time by 24 hours for wallet update
      await time.increase(86400);

      await sitioDates.write.updatePlayer(
        [1001n, player2.account.address, parseEther("0.01"), true],
        { account: owner.account }
      );

      const player = await sitioDates.read.getPlayer([1001n]);
      expect(player[1].toLowerCase()).to.equal(player2.account.address.toLowerCase());
    });

    it("Should emit PlayerUpdated event", async function () {
      const { sitioDates, owner, player1, publicClient } = await loadFixture(deployWithPlayersFixture);

      await time.increase(3600);

      const hash = await sitioDates.write.updatePlayer(
        [1001n, player1.account.address, parseEther("0.02"), true],
        { account: owner.account }
      );

      await publicClient.waitForTransactionReceipt({ hash });
      const logs = await sitioDates.getEvents.PlayerUpdated();

      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.fid).to.equal(1001n);
      expect(logs[0].args.minPrice).to.equal(parseEther("0.02"));
    });

    it("Should revert if price cooldown not elapsed", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deployWithPlayersFixture);

      await expect(
        sitioDates.write.updatePlayer(
          [1001n, player1.account.address, parseEther("0.02"), true],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Price update cooldown not elapsed");
    });

    it("Should revert if wallet cooldown not elapsed", async function () {
      const { sitioDates, owner, player1, player2 } = await loadFixture(deployWithPlayersFixture);

      // Wait 1 hour (enough for price, not for wallet)
      await time.increase(3600);

      await expect(
        sitioDates.write.updatePlayer(
          [1001n, player2.account.address, parseEther("0.01"), true],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Wallet update cooldown not elapsed");
    });

    it("Should revert if player not registered", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deploySitioDatesFixture);

      await expect(
        sitioDates.write.updatePlayer(
          [9999n, player1.account.address, parseEther("0.02"), true],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Player not registered");
    });

    it("Should deactivate player without cooldown", async function () {
      const { sitioDates, owner } = await loadFixture(deployWithPlayersFixture);

      // No cooldown needed for activation/deactivation
      await sitioDates.write.deactivatePlayer([1001n], { account: owner.account });

      const player = await sitioDates.read.getPlayer([1001n]);
      expect(player[3]).to.equal(false);
    });

    it("Should activate player without cooldown", async function () {
      const { sitioDates, owner } = await loadFixture(deployWithPlayersFixture);

      // Deactivate first (no cooldown)
      await sitioDates.write.deactivatePlayer([1001n], { account: owner.account });

      // Activate immediately (no cooldown)
      await sitioDates.write.activatePlayer([1001n], { account: owner.account });

      const player = await sitioDates.read.getPlayer([1001n]);
      expect(player[3]).to.equal(true);
    });

    it("Should report correct price cooldown remaining", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      const cooldown = await sitioDates.read.getPriceCooldownRemaining([1001n]);
      expect(cooldown > 0n).to.be.true;
      expect(cooldown <= 3600n).to.be.true; // 1 hour

      await time.increase(3600);

      const cooldownAfter = await sitioDates.read.getPriceCooldownRemaining([1001n]);
      expect(cooldownAfter).to.equal(0n);
    });

    it("Should report correct wallet cooldown remaining", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      const cooldown = await sitioDates.read.getWalletCooldownRemaining([1001n]);
      expect(cooldown > 0n).to.be.true;
      expect(cooldown <= 86400n).to.be.true; // 24 hours

      await time.increase(86400);

      const cooldownAfter = await sitioDates.read.getWalletCooldownRemaining([1001n]);
      expect(cooldownAfter).to.equal(0n);
    });
  });

  describe("Player Deregistration", function () {
    it("Should allow owner to deregister a player", async function () {
      const { sitioDates, owner } = await loadFixture(deployWithPlayersFixture);

      await sitioDates.write.deregisterPlayer([1001n], { account: owner.account });

      expect(await sitioDates.read.isPlayerRegistered([1001n])).to.equal(false);
      expect(await sitioDates.read.getTotalPlayersCount()).to.equal(1n);
    });

    it("Should emit PlayerDeregistered event", async function () {
      const { sitioDates, owner, publicClient } = await loadFixture(deployWithPlayersFixture);

      const hash = await sitioDates.write.deregisterPlayer([1001n], { account: owner.account });

      await publicClient.waitForTransactionReceipt({ hash });
      const logs = await sitioDates.getEvents.PlayerDeregistered();

      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.fid).to.equal(1001n);
    });

    it("Should remove player from FID set", async function () {
      const { sitioDates, owner } = await loadFixture(deployWithPlayersFixture);

      await sitioDates.write.deregisterPlayer([1001n], { account: owner.account });

      expect(await sitioDates.read.isFidInSet([1001n])).to.equal(false);
      expect(await sitioDates.read.isFidInSet([1002n])).to.equal(true);
    });

    it("Should clear player data on deregistration", async function () {
      const { sitioDates, owner } = await loadFixture(deployWithPlayersFixture);

      await sitioDates.write.deregisterPlayer([1001n], { account: owner.account });

      const player = await sitioDates.read.getPlayer([1001n]);
      expect(player[6]).to.equal(false); // exists should be false (index shifted)
    });

    it("Should revert if player not registered", async function () {
      const { sitioDates, owner } = await loadFixture(deploySitioDatesFixture);

      await expect(
        sitioDates.write.deregisterPlayer([9999n], { account: owner.account })
      ).to.be.rejectedWith("Player not registered");
    });

    it("Should revert if non-owner tries to deregister", async function () {
      const { sitioDates, player1 } = await loadFixture(deployWithPlayersFixture);

      await expect(
        sitioDates.write.deregisterPlayer([1001n], { account: player1.account })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should allow re-registration after deregistration", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deployWithPlayersFixture);

      await sitioDates.write.deregisterPlayer([1001n], { account: owner.account });

      // Re-register with same FID
      await sitioDates.write.registerPlayer(
        [1001n, player1.account.address, parseEther("0.02")],
        { account: owner.account }
      );

      expect(await sitioDates.read.isPlayerRegistered([1001n])).to.equal(true);
      const player = await sitioDates.read.getPlayer([1001n]);
      expect(player[2]).to.equal(parseEther("0.02")); // New price
    });
  });

  describe("Pagination", function () {
    it("Should paginate registered FIDs correctly", async function () {
      const { sitioDates, owner, player1, player2, player3 } = await loadFixture(deploySitioDatesFixture);

      // Register 3 players
      await sitioDates.write.registerPlayer(
        [1001n, player1.account.address, parseEther("0.01")],
        { account: owner.account }
      );
      await sitioDates.write.registerPlayer(
        [1002n, player2.account.address, parseEther("0.02")],
        { account: owner.account }
      );
      await sitioDates.write.registerPlayer(
        [1003n, player3.account.address, parseEther("0.03")],
        { account: owner.account }
      );

      // Get first page (2 items)
      const [page1, total1] = await sitioDates.read.getRegisteredFids([0n, 2n]);
      expect(page1.length).to.equal(2);
      expect(total1).to.equal(3n);
      expect(page1[0]).to.equal(1001n);
      expect(page1[1]).to.equal(1002n);

      // Get second page (1 item)
      const [page2, total2] = await sitioDates.read.getRegisteredFids([2n, 2n]);
      expect(page2.length).to.equal(1);
      expect(total2).to.equal(3n);
      expect(page2[0]).to.equal(1003n);
    });

    it("Should return empty array when offset exceeds total", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      const [fids, total] = await sitioDates.read.getRegisteredFids([100n, 10n]);
      expect(fids.length).to.equal(0);
      expect(total).to.equal(2n);
    });

    it("Should return empty array when limit is 0", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      const [fids, total] = await sitioDates.read.getRegisteredFids([0n, 0n]);
      expect(fids.length).to.equal(0);
      expect(total).to.equal(2n);
    });

    it("Should handle limit larger than remaining items", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      const [fids, total] = await sitioDates.read.getRegisteredFids([0n, 100n]);
      expect(fids.length).to.equal(2);
      expect(total).to.equal(2n);
    });

    it("getRegisteredFidAt should return correct FID", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      expect(await sitioDates.read.getRegisteredFidAt([0n])).to.equal(1001n);
      expect(await sitioDates.read.getRegisteredFidAt([1n])).to.equal(1002n);
    });

    it("getRegisteredFidAt should revert for out of bounds index", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      // viem read calls don't expose revert reasons, just check it rejects
      await expect(
        sitioDates.read.getRegisteredFidAt([100n])
      ).to.be.rejected;
    });

    it("isFidInSet should return correct status", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      expect(await sitioDates.read.isFidInSet([1001n])).to.equal(true);
      expect(await sitioDates.read.isFidInSet([1002n])).to.equal(true);
      expect(await sitioDates.read.isFidInSet([9999n])).to.equal(false);
    });
  });

  describe("Payment Flow", function () {
    it("Should process payment correctly", async function () {
      const { sitioDates, owner, player1, user1, publicClient, platformFeePercentage } =
        await loadFixture(deployWithPlayersFixture);

      const paymentAmount = parseEther("0.1");
      const BASIS_POINTS = 10000n;
      const expectedPlatformShare = (paymentAmount * platformFeePercentage) / BASIS_POINTS;
      const expectedPlayerShare = paymentAmount - expectedPlatformShare;

      const player1BalanceBefore = await publicClient.getBalance({
        address: player1.account.address,
      });
      const platformBalanceBefore = await publicClient.getBalance({
        address: owner.account.address,
      });

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: paymentAmount,
      });

      const player1BalanceAfter = await publicClient.getBalance({
        address: player1.account.address,
      });
      const platformBalanceAfter = await publicClient.getBalance({
        address: owner.account.address,
      });

      // Player receives 95%
      expect(player1BalanceAfter - player1BalanceBefore).to.equal(expectedPlayerShare);

      // Platform receives 5%
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(expectedPlatformShare);
    });

    it("Should emit DatePaid event", async function () {
      const { sitioDates, user1, publicClient, platformFeePercentage } =
        await loadFixture(deployWithPlayersFixture);

      const paymentAmount = parseEther("0.1");

      const hash = await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: paymentAmount,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      const logs = await sitioDates.getEvents.DatePaid();

      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.fid).to.equal(1001n);
      expect(logs[0].args.payer?.toLowerCase()).to.equal(user1.account.address.toLowerCase());
      expect(logs[0].args.amount).to.equal(paymentAmount);
    });

    it("Should update statistics", async function () {
      const { sitioDates, user1 } = await loadFixture(deployWithPlayersFixture);

      const paymentAmount = parseEther("0.1");

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: paymentAmount,
      });

      expect(await sitioDates.read.totalDatesCount()).to.equal(1n);
      expect(await sitioDates.read.totalVolumeETH()).to.equal(paymentAmount);

      // Pay again
      await sitioDates.write.payForDate([1002n], {
        account: user1.account,
        value: parseEther("0.05"),
      });

      expect(await sitioDates.read.totalDatesCount()).to.equal(2n);
      expect(await sitioDates.read.totalVolumeETH()).to.equal(parseEther("0.15"));
    });

    it("Should revert if player not registered", async function () {
      const { sitioDates, user1 } = await loadFixture(deployWithPlayersFixture);

      await expect(
        sitioDates.write.payForDate([9999n], {
          account: user1.account,
          value: parseEther("0.1"),
        })
      ).to.be.rejectedWith("Player not registered");
    });

    it("Should revert if player not active", async function () {
      const { sitioDates, owner, user1 } = await loadFixture(deployWithPlayersFixture);

      // No cooldown needed for deactivation
      await sitioDates.write.deactivatePlayer([1001n], { account: owner.account });

      await expect(
        sitioDates.write.payForDate([1001n], {
          account: user1.account,
          value: parseEther("0.1"),
        })
      ).to.be.rejectedWith("Player not active");
    });

    it("Should revert if payment below minimum", async function () {
      const { sitioDates, user1 } = await loadFixture(deployWithPlayersFixture);

      await expect(
        sitioDates.write.payForDate([1001n], {
          account: user1.account,
          value: parseEther("0.005"), // Less than 0.01 ETH minimum
        })
      ).to.be.rejectedWith("Payment below minimum price");
    });

    it("Should accept exact minimum payment", async function () {
      const { sitioDates, user1 } = await loadFixture(deployWithPlayersFixture);

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: parseEther("0.01"), // Exact minimum
      });

      expect(await sitioDates.read.totalDatesCount()).to.equal(1n);
    });

    it("Should accept payment above minimum", async function () {
      const { sitioDates, user1 } = await loadFixture(deployWithPlayersFixture);

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: parseEther("1.0"), // Well above minimum
      });

      expect(await sitioDates.read.totalDatesCount()).to.equal(1n);
    });

    it("Should work with zero price player", async function () {
      const { sitioDates, owner, player3, user1 } = await loadFixture(deploySitioDatesFixture);

      // Register player with zero price
      await sitioDates.write.registerPlayer(
        [1003n, player3.account.address, 0n],
        { account: owner.account }
      );

      // Should work with zero payment
      await sitioDates.write.payForDate([1003n], {
        account: user1.account,
        value: 0n,
      });

      expect(await sitioDates.read.totalDatesCount()).to.equal(1n);
    });
  });

  describe("Platform Settings", function () {
    it("Should allow owner to update platform wallet", async function () {
      const { sitioDates, owner, player1 } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.setPlatformWallet([player1.account.address], {
        account: owner.account,
      });

      expect((await sitioDates.read.platformWallet()).toLowerCase()).to.equal(
        player1.account.address.toLowerCase()
      );
    });

    it("Should emit PlatformWalletUpdated event", async function () {
      const { sitioDates, owner, player1, publicClient } = await loadFixture(deploySitioDatesFixture);

      const hash = await sitioDates.write.setPlatformWallet([player1.account.address], {
        account: owner.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      const logs = await sitioDates.getEvents.PlatformWalletUpdated();

      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.newWallet?.toLowerCase()).to.equal(
        player1.account.address.toLowerCase()
      );
    });

    it("Should allow owner to update platform fee", async function () {
      const { sitioDates, owner } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.setPlatformFee([1000n], { account: owner.account }); // 10% in basis points

      expect(await sitioDates.read.platformFeePercentage()).to.equal(1000n);
    });

    it("Should emit PlatformFeeUpdated event", async function () {
      const { sitioDates, owner, publicClient } = await loadFixture(deploySitioDatesFixture);

      const hash = await sitioDates.write.setPlatformFee([1000n], { // 10% in basis points
        account: owner.account,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      const logs = await sitioDates.getEvents.PlatformFeeUpdated();

      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.oldFee).to.equal(500n); // 5% in basis points
      expect(logs[0].args.newFee).to.equal(1000n); // 10% in basis points
    });

    it("Should revert if fee too high", async function () {
      const { sitioDates, owner } = await loadFixture(deploySitioDatesFixture);

      await expect(
        sitioDates.write.setPlatformFee([2500n], { account: owner.account }) // 25% exceeds 20% max
      ).to.be.rejectedWith("Fee too high");
    });

    it("Should allow setting fee to 0", async function () {
      const { sitioDates, owner } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.setPlatformFee([0n], { account: owner.account });

      expect(await sitioDates.read.platformFeePercentage()).to.equal(0n);
    });

    it("Should allow setting fee to max (20%)", async function () {
      const { sitioDates, owner } = await loadFixture(deploySitioDatesFixture);

      await sitioDates.write.setPlatformFee([2000n], { account: owner.account }); // 20% in basis points

      expect(await sitioDates.read.platformFeePercentage()).to.equal(2000n);
    });
  });

  describe("View Functions", function () {
    it("isPlayerActive should return correct status", async function () {
      const { sitioDates, owner } = await loadFixture(deployWithPlayersFixture);

      expect(await sitioDates.read.isPlayerActive([1001n])).to.equal(true);
      expect(await sitioDates.read.isPlayerActive([9999n])).to.equal(false);

      // No cooldown needed for deactivation
      await sitioDates.write.deactivatePlayer([1001n], { account: owner.account });

      expect(await sitioDates.read.isPlayerActive([1001n])).to.equal(false);
    });

    it("isPlayerRegistered should return correct status", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      expect(await sitioDates.read.isPlayerRegistered([1001n])).to.equal(true);
      expect(await sitioDates.read.isPlayerRegistered([9999n])).to.equal(false);
    });

    it("getTotalPlayersCount should return correct count", async function () {
      const { sitioDates } = await loadFixture(deployWithPlayersFixture);

      expect(await sitioDates.read.getTotalPlayersCount()).to.equal(2n);
    });

    it("getStats should return correct statistics", async function () {
      const { sitioDates, user1 } = await loadFixture(deployWithPlayersFixture);

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: parseEther("0.1"),
      });

      const stats = await sitioDates.read.getStats();
      expect(stats[0]).to.equal(1n); // totalDates
      expect(stats[1]).to.equal(parseEther("0.1")); // totalVolume
      expect(stats[2]).to.equal(2n); // totalPlayers
      expect(stats[3]).to.equal(500n); // platformFee (5% = 500 basis points)
    });

    it("calculatePaymentSplit should return correct amounts", async function () {
      const { sitioDates } = await loadFixture(deploySitioDatesFixture);

      const amount = parseEther("1.0");
      const split = await sitioDates.read.calculatePaymentSplit([amount]);

      expect(split[0]).to.equal(parseEther("0.95")); // playerShare (95%)
      expect(split[1]).to.equal(parseEther("0.05")); // platformShare (5%)
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple payments to same player", async function () {
      const { sitioDates, user1, user2, player1, publicClient } =
        await loadFixture(deployWithPlayersFixture);

      const payment1 = parseEther("0.1");
      const payment2 = parseEther("0.2");

      const player1BalanceBefore = await publicClient.getBalance({
        address: player1.account.address,
      });

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: payment1,
      });

      await sitioDates.write.payForDate([1001n], {
        account: user2.account,
        value: payment2,
      });

      const player1BalanceAfter = await publicClient.getBalance({
        address: player1.account.address,
      });

      const totalPayments = payment1 + payment2;
      const BASIS_POINTS = 10000n;
      const expectedPlayerShare = (totalPayments * 9500n) / BASIS_POINTS; // 95% = 9500 basis points

      expect(player1BalanceAfter - player1BalanceBefore).to.equal(expectedPlayerShare);
      expect(await sitioDates.read.totalDatesCount()).to.equal(2n);
    });

    it("Should handle payment with updated fee", async function () {
      const { sitioDates, owner, user1, player1, publicClient } =
        await loadFixture(deployWithPlayersFixture);

      // Change fee to 10% (1000 basis points)
      await sitioDates.write.setPlatformFee([1000n], { account: owner.account });

      const paymentAmount = parseEther("1.0");

      const player1BalanceBefore = await publicClient.getBalance({
        address: player1.account.address,
      });

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: paymentAmount,
      });

      const player1BalanceAfter = await publicClient.getBalance({
        address: player1.account.address,
      });

      // Player should receive 90% with 10% fee
      expect(player1BalanceAfter - player1BalanceBefore).to.equal(parseEther("0.9"));
    });

    it("Should handle very small payments", async function () {
      const { sitioDates, owner, player3, user1 } = await loadFixture(deploySitioDatesFixture);

      // Register player with tiny price
      await sitioDates.write.registerPlayer(
        [1003n, player3.account.address, 1n], // 1 wei minimum
        { account: owner.account }
      );

      await sitioDates.write.payForDate([1003n], {
        account: user1.account,
        value: 1n,
      });

      expect(await sitioDates.read.totalDatesCount()).to.equal(1n);
    });

    it("Should handle large payments", async function () {
      const { sitioDates, user1 } = await loadFixture(deployWithPlayersFixture);

      const largePayment = parseEther("100.0");

      await sitioDates.write.payForDate([1001n], {
        account: user1.account,
        value: largePayment,
      });

      expect(await sitioDates.read.totalVolumeETH()).to.equal(largePayment);
    });
  });
});
