import { AlertTriangle, FlaskConical, Gavel } from "lucide-react";
import { useSelectedNetwork } from "../lib/network";
import { genlayerLabel } from "../lib/chains";

export function NetworkNotice() {
  const { selectedChain } = useSelectedNetwork();
  return (
    <div className={`network-notice ${selectedChain.isMainnet ? "mainnet" : "testnet"}`}>
      <span>
        {selectedChain.isMainnet ? <AlertTriangle size={16} /> : <FlaskConical size={16} />}
        {selectedChain.isMainnet
          ? "You are using Base Mainnet. Real funds may be involved."
          : "Base Sepolia Testnet. Use this for testing."}
      </span>
      <span>
        <Gavel size={16} />
        GenLayer: {genlayerLabel}
      </span>
    </div>
  );
}
