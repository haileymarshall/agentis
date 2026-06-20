import { AlertTriangle, ChevronDown, FlaskConical } from "lucide-react";
import { useChainId, useSwitchChain } from "wagmi";
import { baseMainnet, baseSepolia, type BaseChainId } from "@agentis/shared";
import { supportedChains } from "../lib/chains";
import { useSelectedNetwork } from "../lib/network";

export function NetworkSelector() {
  const walletChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { selectedChainId, selectedChain, setSelectedChainId } = useSelectedNetwork();

  const update = (chainId: BaseChainId) => {
    setSelectedChainId(chainId);
    switchChain?.({ chainId });
  };

  return (
    <label className={`network-selector ${selectedChain.isMainnet ? "mainnet" : "testnet"}`}>
      {selectedChain.isMainnet ? <AlertTriangle size={16} /> : <FlaskConical size={16} />}
      <select value={selectedChainId} onChange={(event) => update(Number(event.target.value) as BaseChainId)}>
        <option value={baseSepolia.id}>Base Sepolia</option>
        <option value={baseMainnet.id}>Base Mainnet</option>
      </select>
      <ChevronDown size={14} />
      {walletChainId !== selectedChainId && <span className="network-mismatch">Wallet mismatch</span>}
      <span className="sr-only">{supportedChains[selectedChainId].name}</span>
    </label>
  );
}
