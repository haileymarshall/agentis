import { Banknote } from "lucide-react";
import { formatEth } from "../lib/formatting";

export function PayoutPanel({ payouts }: { payouts: any }) {
  return (
    <section className="panel">
      <h2>
        <Banknote size={18} />
        Claimable Balances
      </h2>
      <div className="payout-grid">
        <span>Client</span>
        <strong>{formatEth(payouts?.clientAmount)}</strong>
        <span>Agent</span>
        <strong>{formatEth(payouts?.agentAmount)}</strong>
        <span>Protocol fee</span>
        <strong>{formatEth(payouts?.treasuryAmount)}</strong>
      </div>
    </section>
  );
}
