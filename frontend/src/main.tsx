import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { App } from "./App";
import { wagmiConfig } from "./lib/wagmi";
import { NetworkProvider } from "./lib/network";
import "./styles/globals.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </NetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
