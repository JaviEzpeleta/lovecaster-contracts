/**
 * Token Addresses Configuration
 *
 * Central configuration file for ERC20 token addresses across different networks.
 * This file serves as the single source of truth for token addresses used in
 * scripts, tests, and deployment processes.
 *
 * Networks supported:
 * - Base Mainnet (Chain ID: 8453)
 * - Base Sepolia Testnet (Chain ID: 84532)
 *
 * @module config/addresses
 */

import type { Address } from "viem";

/**
 * Token addresses for a specific network
 */
export interface TokenAddresses {
  USDC: Address;
  DEGEN?: Address;
  WETH?: Address;
}

/**
 * Network-specific token addresses mapping
 */
export interface NetworkAddresses {
  [key: string]: TokenAddresses;
}

/**
 * Token addresses for all supported networks
 *
 * Usage in scripts:
 * ```typescript
 * import { TOKEN_ADDRESSES } from "../config/addresses";
 * const usdcAddress = TOKEN_ADDRESSES["base-sepolia"].USDC;
 * ```
 */
export const TOKEN_ADDRESSES: NetworkAddresses = {
  "base-mainnet": {
    // USDC on Base Mainnet (official Circle USDC)
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",

    // DEGEN token on Base Mainnet
    // TODO: Replace with actual DEGEN token address
    DEGEN: "0x0000000000000000000000000000000000000000",

    // Wrapped Ether on Base Mainnet
    // TODO: Replace with actual WETH token address
    WETH: "0x0000000000000000000000000000000000000000",
  },

  "base-sepolia": {
    // USDC on Base Sepolia Testnet
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",

    // DEGEN token on Base Sepolia
    // TODO: Replace with actual DEGEN token address
    DEGEN: "0x0000000000000000000000000000000000000000",

    // Wrapped Ether on Base Sepolia
    // TODO: Replace with actual WETH token address
    WETH: "0x0000000000000000000000000000000000000000",
  },
};

/**
 * Chain IDs for supported networks
 *
 * Usage:
 * ```typescript
 * import { CHAIN_IDS } from "../config/addresses";
 * if (chainId === CHAIN_IDS["base-mainnet"]) {
 *   // Handle mainnet logic
 * }
 * ```
 */
export const CHAIN_IDS = {
  "base-mainnet": 8453n,
  "base-sepolia": 84532n,
} as const;

/**
 * Network names mapped by chain ID for reverse lookup
 */
export const NETWORK_NAMES: Record<string, string> = {
  "8453": "base-mainnet",
  "84532": "base-sepolia",
};

/**
 * Helper function to get token address for a specific network
 *
 * @param network - Network name ("base-mainnet" or "base-sepolia")
 * @param token - Token symbol ("USDC", "DEGEN", "WETH")
 * @returns Token address for the specified network
 * @throws Error if network or token is not found
 *
 * @example
 * ```typescript
 * const usdcAddress = getTokenAddress("base-sepolia", "USDC");
 * console.log(usdcAddress); // "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
 * ```
 */
export function getTokenAddress(network: string, token: string): Address {
  const addresses = TOKEN_ADDRESSES[network];
  if (!addresses) {
    throw new Error(
      `Unsupported network: ${network}. Supported networks: ${Object.keys(TOKEN_ADDRESSES).join(", ")}`
    );
  }

  const address = addresses[token as keyof TokenAddresses];
  if (!address) {
    throw new Error(
      `Token ${token} not found for network ${network}. Available tokens: ${Object.keys(addresses).join(", ")}`
    );
  }

  return address;
}

/**
 * Helper function to get network name from chain ID
 *
 * @param chainId - Chain ID as bigint or number
 * @returns Network name
 * @throws Error if chain ID is not supported
 *
 * @example
 * ```typescript
 * const network = getNetworkName(84532n);
 * console.log(network); // "base-sepolia"
 * ```
 */
export function getNetworkName(chainId: bigint | number): string {
  const chainIdStr = chainId.toString();
  const network = NETWORK_NAMES[chainIdStr];
  if (!network) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. Supported chain IDs: ${Object.keys(NETWORK_NAMES).join(", ")}`
    );
  }
  return network;
}

/**
 * Helper function to get all token addresses for a network
 *
 * @param network - Network name
 * @returns Object with all token addresses for the network
 * @throws Error if network is not found
 *
 * @example
 * ```typescript
 * const addresses = getNetworkTokens("base-mainnet");
 * console.log(addresses.USDC); // "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
 * ```
 */
export function getNetworkTokens(network: string): TokenAddresses {
  const addresses = TOKEN_ADDRESSES[network];
  if (!addresses) {
    throw new Error(
      `Unsupported network: ${network}. Supported networks: ${Object.keys(TOKEN_ADDRESSES).join(", ")}`
    );
  }
  return addresses;
}
