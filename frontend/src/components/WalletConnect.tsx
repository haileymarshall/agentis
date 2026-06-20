import { LogOut, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "../lib/formatting";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button className="button ghost" type="button" onClick={() => disconnect()}>
        <LogOut size={16} />
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <button
      className="button primary"
      type="button"
      disabled={isPending || connectors.length === 0}
      onClick={() => connect({ connector: connectors[0] })}
    >
      <Wallet size={16} />
      Connect
    </button>
  );
}
