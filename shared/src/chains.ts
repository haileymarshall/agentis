import { defineChain } from "viem";

export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
  blockExplorers: { default: { name: "BaseScan", url: "https://sepolia.basescan.org" } },
  testnet: true
});

export const baseMainnet = defineChain({
  id: 8453,
  name: "Base Mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.base.org"] } },
  blockExplorers: { default: { name: "BaseScan", url: "https://basescan.org" } }
});

export const baseChainIds = [baseSepolia.id, baseMainnet.id] as const;
export type BaseChainId = (typeof baseChainIds)[number];
export type BaseChainKey = "baseSepolia" | "baseMainnet";

export const baseChains = {
  [baseSepolia.id]: baseSepolia,
  [baseMainnet.id]: baseMainnet
} as const;

export const baseChainKeys: Record<BaseChainId, BaseChainKey> = {
  [baseSepolia.id]: "baseSepolia",
  [baseMainnet.id]: "baseMainnet"
};

export const baseChainNames: Record<BaseChainId, string> = {
  [baseSepolia.id]: "Base Sepolia",
  [baseMainnet.id]: "Base Mainnet"
};

export function isSupportedBaseChainId(chainId: number): chainId is BaseChainId {
  return baseChainIds.includes(chainId as BaseChainId);
}

export function getBaseChain(chainId: BaseChainId) {
  return baseChains[chainId];
}

export const genlayerStudioNet = {
  network: "studionet",
  name: "GenLayer StudioNet",
  rpcUrl: "https://studio.genlayer.com/api"
} as const;
