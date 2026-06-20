import { AlertTriangle, Copy, FlaskConical } from "lucide-react";
import { explorerAddress, genlayerLabel, supportedChains } from "../lib/chains";
import { useSelectedNetwork } from "../lib/network";

export function NetworkSettingsPage() {
  const { selectedChain, selectedChainId, setSelectedChainId } = useSelectedNetwork();
  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Network</span>
          <h1>Runtime chain settings</h1>
        </div>
      </div>
      <div className="segmented">
        {Object.values(supportedChains).map((chain) => (
          <button
            key={chain.id}
            className={chain.id === selectedChainId ? "active" : ""}
            type="button"
            onClick={() => setSelectedChainId(chain.id)}
          >
            {chain.isMainnet ? <AlertTriangle size={16} /> : <FlaskConical size={16} />}
            {chain.name}
          </button>
        ))}
      </div>
      <section className="panel">
        <h2>{selectedChain.name}</h2>
        <dl className="detail-list">
          <div>
            <dt>Chain ID</dt>
            <dd>{selectedChain.id}</dd>
          </div>
          <div>
            <dt>Contract</dt>
            <dd>{selectedChain.contractAddress || "Not configured"}</dd>
          </div>
          <div>
            <dt>Explorer</dt>
            <dd>{selectedChain.explorerUrl}</dd>
          </div>
          <div>
            <dt>Adjudication</dt>
            <dd>GenLayer {genlayerLabel}</dd>
          </div>
        </dl>
        {selectedChain.contractAddress && (
          <a className="button ghost" href={explorerAddress(selectedChain, selectedChain.contractAddress)} target="_blank" rel="noreferrer">
            <Copy size={16} />
            View contract
          </a>
        )}
      </section>
    </section>
  );
}
