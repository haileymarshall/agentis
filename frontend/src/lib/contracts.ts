import { agentisAbi } from "@agentis/shared";
import { useSelectedNetwork } from "./network";

export function useAgentisContract() {
  const { selectedChain } = useSelectedNetwork();
  return {
    abi: agentisAbi,
    address: selectedChain.contractAddress,
    chainId: selectedChain.id
  };
}
