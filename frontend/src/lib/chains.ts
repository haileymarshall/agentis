import {
  baseMainnet,
  baseSepolia,
  genlayerStudioNet,
  type BaseChainId,
  type BaseChainKey
} from "@agentis/shared";
import { isAddress } from "viem";

export interface RuntimeChain {
  id: BaseChainId;
  key: BaseChainKey;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  contractAddress?: `0x${string}`;
  isMainnet: boolean;
}

function optionalAddress(value: string | undefined): `0x${string}` | undefined {
  if (!value || value === "0x_REPLACE_ME" || !isAddress(value)) return undefined;
  return value as `0x${string}`;
}

export const supportedChains: Record<BaseChainId, RuntimeChain> = {
  [baseSepolia.id]: {
    id: baseSepolia.id,
    key: "baseSepolia",
    name: "Base Sepolia",
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    explorerUrl: import.meta.env.VITE_BASE_SEPOLIA_EXPLORER || "https://sepolia.basescan.org",
    contractAddress: optionalAddress(import.meta.env.VITE_BASE_SEPOLIA_AGENTIS_ADDRESS),
    isMainnet: false
  },
  [baseMainnet.id]: {
    id: baseMainnet.id,
    key: "baseMainnet",
    name: "Base Mainnet",
    rpcUrl: import.meta.env.VITE_BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
    explorerUrl: import.meta.env.VITE_BASE_MAINNET_EXPLORER || "https://basescan.org",
    contractAddress: optionalAddress(import.meta.env.VITE_BASE_MAINNET_AGENTIS_ADDRESS),
    isMainnet: true
  }
};

export const chainIdByKey: Record<BaseChainKey, BaseChainId> = {
  baseSepolia: baseSepolia.id,
  baseMainnet: baseMainnet.id
};

export function defaultChainId(): BaseChainId {
  const configured = import.meta.env.VITE_DEFAULT_CHAIN || "baseSepolia";
  return configured === "baseMainnet" ? baseMainnet.id : baseSepolia.id;
}

export function explorerAddress(chain: RuntimeChain, address: string) {
  return `${chain.explorerUrl}/address/${address}`;
}

export function explorerTx(chain: RuntimeChain, hash: string) {
  return `${chain.explorerUrl}/tx/${hash}`;
}

export const genlayerLabel = import.meta.env.VITE_GENLAYER_NETWORK || genlayerStudioNet.network;
