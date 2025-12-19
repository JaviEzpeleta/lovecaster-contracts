# Contract ABIs

This directory contains the extracted ABIs (Application Binary Interfaces) for all compiled smart contracts.

## 🔄 Auto-generated

These files are automatically generated from the compiled contract artifacts.

## 📝 Usage

### Extract ABI for a specific contract:
```bash
npm run abi PredictionMarketFactory
```

### Extract ABIs for all contracts:
```bash
npm run allabis
```

## 💡 Frontend Integration

Import these ABIs in your frontend application:

```typescript
import PredictionMarketFactoryABI from './abis/PredictionMarketFactory.json';

// Use with wagmi, viem, ethers, or web3.js
const contract = useContract({
  address: '0x...',
  abi: PredictionMarketFactoryABI,
});
```

## 📦 Version Control

You can choose to:
- **Commit these files** - Share ABIs with frontend developers
- **Ignore them** - Add `/abis` to `.gitignore` and regenerate as needed
