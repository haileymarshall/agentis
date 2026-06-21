import { useState } from "react";
import { useWriteContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { useSelectedNetwork } from "./network";

/**
 * Shared wrapper around wagmi's useWriteContract that injects the selected
 * chain's Agentis address + chainId, guards the "not configured" case, and
 * surfaces a single combined error. Removes the writeContract boilerplate that
 * was duplicated across every page.
 */
export function useAgentisWrite(onConfirmed?: () => void) {
  const { selectedChain } = useSelectedNetwork();
  const { writeContract, data, isPending, error } = useWriteContract();
  const [localError, setLocalError] = useState("");

  function submit(functionName: string, args: unknown[], value?: bigint) {
    setLocalError("");
    if (!selectedChain.contractAddress) {
      setLocalError(`Agentis is not configured on ${selectedChain.name}.`);
      return;
    }
    const request: any = {
      address: selectedChain.contractAddress,
      abi: agentisAbi,
      functionName,
      args,
      chainId: selectedChain.id
    };
    if (value !== undefined) request.value = value;
    writeContract(request, {
      onSuccess: () => {
        if (onConfirmed) setTimeout(onConfirmed, 1200);
      }
    });
  }

  return {
    submit,
    isPending,
    txHash: data,
    error: localError || error?.message || ""
  };
}
