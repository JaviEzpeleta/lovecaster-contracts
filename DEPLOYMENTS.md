# 📦 Smart Contract Deployments

This file tracks all smart contract deployments across different networks.

## 🔄 Automatic Tracking

Every time you deploy a contract, the deployment information is automatically saved to `deployments.json`.

## 📋 Deployment Information

Each deployment includes:
- **Address**: The deployed contract address
- **Network**: The network where it was deployed (base-mainnet, base-sepolia, etc.)
- **Timestamp**: When the deployment occurred (UTC)
- **Deployer**: The wallet address that deployed the contract
- **Block Explorer**: Direct link to view the contract on the block explorer

## 📖 Current Deployments

See [`deployments.json`](./deployments.json) for the complete list of all deployments.

## 🚀 How It Works

The deployment tracking system automatically saves information when you run:

```bash
npm run deploy:base-sepolia
npm run deploy:base-mainnet
```

## 💡 Using Deployment Addresses in Your Frontend

Import the deployments in your frontend application:

```typescript
import deployments from './deployments.json';

// Get the PredictionMarketFactory contract address on Base Sepolia
const factoryAddress = deployments.PredictionMarketFactory['base-sepolia'].address;

// Use with your web3 library
const contract = useContract({
  address: factoryAddress,
  abi: PredictionMarketFactoryABI,
});
```

## 🔍 Verifying Deployments

Click the block explorer links in `deployments.json` to verify contracts on-chain.
