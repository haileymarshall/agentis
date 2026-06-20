import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { BaseChainId } from "@agentis/shared";
import { defaultChainId, supportedChains } from "./chains";

interface NetworkContextValue {
  selectedChainId: BaseChainId;
  selectedChain: (typeof supportedChains)[BaseChainId];
  setSelectedChainId(chainId: BaseChainId): void;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [selectedChainId, setSelectedChainIdState] = useState<BaseChainId>(() => {
    const stored = Number(localStorage.getItem("agentis:selectedChainId"));
    return stored === 8453 || stored === 84532 ? (stored as BaseChainId) : defaultChainId();
  });

  const setSelectedChainId = (chainId: BaseChainId) => {
    localStorage.setItem("agentis:selectedChainId", String(chainId));
    setSelectedChainIdState(chainId);
  };

  useEffect(() => {
    localStorage.setItem("agentis:selectedChainId", String(selectedChainId));
  }, [selectedChainId]);

  const value = useMemo(
    () => ({ selectedChainId, selectedChain: supportedChains[selectedChainId], setSelectedChainId }),
    [selectedChainId]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useSelectedNetwork() {
  const context = useContext(NetworkContext);
  if (!context) throw new Error("useSelectedNetwork must be used inside NetworkProvider");
  return context;
}
