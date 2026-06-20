import {
  baseMainnet,
  baseSepolia,
  getBaseChain,
  isSupportedBaseChainId,
  type BaseChainId
} from "@agentis/shared";
import type { RelayerConfig } from "./config.js";

export { baseMainnet, baseSepolia };

export function assertSupportedChainId(chainId: number): BaseChainId {
  if (!isSupportedBaseChainId(chainId)) {
    throw new Error(`Unsupported chain ID ${chainId}. Supported chain IDs are 84532 and 8453.`);
  }
  return chainId;
}

export function getNetworkConfig(config: RelayerConfig, chainId: number) {
  const supported = assertSupportedChainId(chainId);
  if (!config.supportedChainIds.includes(supported)) {
    throw new Error(`Chain ID ${chainId} is disabled by SUPPORTED_CHAIN_IDS.`);
  }
  return config.baseNetworks[supported];
}

export function getViemChain(chainId: BaseChainId) {
  return getBaseChain(chainId);
}
