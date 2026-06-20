import "./env.js";
import { baseMainnet, baseSepolia, type BaseChainId, type BaseChainKey } from "@agentis/shared";
import { isAddress } from "viem";

export interface BaseNetworkConfig {
  key: BaseChainKey;
  chainId: BaseChainId;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  agentisAddress?: `0x${string}`;
  startBlock: bigint;
  relayerPrivateKey?: `0x${string}`;
}

export interface RelayerConfig {
  port: number;
  baseNetworks: Record<BaseChainId, BaseNetworkConfig>;
  genlayerNetwork: "studionet";
  genlayerRpcUrl: string;
  genlayerContractAddress?: `0x${string}`;
  genlayerPrivateKey?: `0x${string}`;
  dbPath: string;
  supportedChainIds: BaseChainId[];
}

function optionalAddress(name: string): `0x${string}` | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  if (!isAddress(value)) {
    throw new Error(`${name} must be a valid EVM address`);
  }
  return value as `0x${string}`;
}

function optionalPrivateKey(name: string): `0x${string}` | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} must be a 32-byte 0x-prefixed private key`);
  }
  return value as `0x${string}`;
}

function blockEnv(name: string) {
  return BigInt(process.env[name] || "0");
}

export function loadConfig(): RelayerConfig {
  const supported = (process.env.SUPPORTED_CHAIN_IDS || "84532,8453")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value): value is BaseChainId => value === 84532 || value === 8453);

  const port = Number(process.env.PORT || process.env.RELAYER_PORT || "8787");

  return {
    port,
    supportedChainIds: supported.length > 0 ? supported : [84532, 8453],
    dbPath: process.env.RELAY_DB_PATH || "./relay-state.json",
    genlayerNetwork: "studionet",
    genlayerRpcUrl: process.env.GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
    genlayerContractAddress: optionalAddress("GENLAYER_CONTRACT_ADDRESS"),
    genlayerPrivateKey: optionalPrivateKey("GENLAYER_ACCOUNT_PRIVATE_KEY"),
    baseNetworks: {
      [baseSepolia.id]: {
        key: "baseSepolia",
        chainId: baseSepolia.id,
        name: "Base Sepolia",
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        agentisAddress: optionalAddress("BASE_SEPOLIA_AGENTIS_ADDRESS"),
        startBlock: blockEnv("BASE_SEPOLIA_START_BLOCK"),
        relayerPrivateKey: optionalPrivateKey("BASE_SEPOLIA_RELAYER_PRIVATE_KEY")
      },
      [baseMainnet.id]: {
        key: "baseMainnet",
        chainId: baseMainnet.id,
        name: "Base Mainnet",
        rpcUrl: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
        explorerUrl: "https://basescan.org",
        agentisAddress: optionalAddress("BASE_MAINNET_AGENTIS_ADDRESS"),
        startBlock: blockEnv("BASE_MAINNET_START_BLOCK"),
        relayerPrivateKey: optionalPrivateKey("BASE_MAINNET_RELAYER_PRIVATE_KEY")
      }
    }
  };
}
