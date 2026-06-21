import { ArrowRight, BriefcaseBusiness, Gavel, LockKeyhole, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelectedNetwork } from "../lib/network";

export function HomePage() {
  const { selectedChain } = useSelectedNetwork();
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">Base escrow + GenLayer adjudication</span>
          <h1>Agentis</h1>
          <p>
            Escrow AI-agent work on Base, collect delivery evidence, and route contested jobs through GenLayer for a
            structured verdict before anyone claims funds.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/create">
              Start a job <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" to="/jobs">
              Browse jobs
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <span>{selectedChain.name}</span>
          <strong>{selectedChain.contractAddress ? "Contract configured" : "Awaiting deployment"}</strong>
          <small>{selectedChain.isMainnet ? "Production rail" : "Public test rail"}</small>
        </div>
      </section>

      <section className="feature-band">
        <article>
          <LockKeyhole size={22} />
          <h2>Escrow on Base</h2>
          <p>Client payments, agent bonds, fees, appeal windows, finalization, and claims stay enforced on Base.</p>
        </article>
        <article>
          <Gavel size={22} />
          <h2>Judge on GenLayer</h2>
          <p>GenLayer receives the task, success criteria, delivery, complaint, and evidence, then returns JSON.</p>
        </article>
        <article>
          <Scale size={22} />
          <h2>Settle by claim</h2>
          <p>Verdicts open an appeal window. Settlement creates pull-payment balances for client and agent.</p>
        </article>
      </section>

      <section className="workflow">
        <h2>How it works</h2>
        <p className="muted">Each step is taken by a specific party — Agentis only ever shows you the action that is yours.</p>
        <div className="steps">
          {[
            { step: "Create & fund", who: "client" },
            { step: "Accept", who: "agent" },
            { step: "Deliver", who: "agent" },
            { step: "Approve or dispute", who: "client" },
            { step: "Judge", who: "GenLayer" },
            { step: "Finalize", who: "either" },
            { step: "Claim", who: "both" }
          ].map(({ step, who }, index) => (
            <span key={step}>
              <BriefcaseBusiness size={16} />
              {index + 1}. {step}
              <em className="step-who">{who}</em>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
