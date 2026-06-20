import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { baseMainnet, baseSepolia } from "@agentis/shared";

export const wagmiConfig = createConfig({
  chains: [baseSepolia, baseMainnet],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
    [baseMainnet.id]: http(import.meta.env.VITE_BASE_MAINNET_RPC_URL || "https://mainnet.base.org")
  }
});
