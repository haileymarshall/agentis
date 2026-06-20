# Networks

Source: https://docs.genlayer.com/developers/networks

GenLayer operates as two layers: the **GenLayer RPC** handles intelligent contract operations (`gen_*` methods), while the **GenLayer Chain** is the underlying L2 (zkSync Elastic Chain) that handles standard Ethereum operations (`eth_*` methods). The GenLayer RPC also passes through all `eth_*` and `zks_*` calls to the underlying chain, so you can use either endpoint for standard wallet operations.

For the full RPC reference, see [GenLayer Node API](/api-references/genlayer-node).

Your wallet connects to the **GenLayer RPC** — it handles both intelligent contract calls and standard Ethereum methods.

---

## Testnet Bradbury

Production-like testnet with real AI/LLM workloads.

| Setting | Value |
|:--|:--|
| **GenLayer RPC** | `https://rpc-bradbury.genlayer.com` |
| **GenLayer Chain RPC** | `https://rpc.testnet-chain.genlayer.com` |
| **Chain ID** | 4221 |
| **Currency** | GEN |
| **Explorer** | [explorer-bradbury.genlayer.com](https://explorer-bradbury.genlayer.com) |
| **Chain Explorer** | [explorer.testnet-chain.genlayer.com](https://explorer.testnet-chain.genlayer.com/) |
| **Faucet** | [testnet-faucet.genlayer.foundation](https://testnet-faucet.genlayer.foundation) |

---

## Testnet Asimov

Infrastructure and stress testing.

| Setting | Value |
|:--|:--|
| **GenLayer RPC** | `https://rpc-asimov.genlayer.com` |
| **GenLayer Chain RPC** | `https://rpc.testnet-chain.genlayer.com` |
| **Chain ID** | 4221 |
| **Currency** | GEN |
| **Explorer** | [explorer-asimov.genlayer.com](https://explorer-asimov.genlayer.com) |
| **Chain Explorer** | [explorer.testnet-chain.genlayer.com](https://explorer.testnet-chain.genlayer.com/) |
| **Faucet** | [testnet-faucet.genlayer.foundation](https://testnet-faucet.genlayer.foundation) |

---

## Studionet

Hosted development environment — no local setup required.

| Setting | Value |
|:--|:--|
| **GenLayer RPC** | `https://studio.genlayer.com/api` |
| **Chain ID** | 61999 |
| **Currency** | GEN |
| **Explorer** | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com) |
| **Faucet** | Built-in — use the 💧 button in the account selector |

---

## Localnet

Local development with full control. Requires [GenLayer Studio](/developers/intelligent-contracts/tools/genlayer-studio) or [GLSim](/api-references/genlayer-test/glsim).

| Setting | Value |
|:--|:--|
| **GenLayer RPC** | `http://localhost:4000/api` |
| **Chain ID** | 61127 |
| **Currency** | GEN |
| **Explorer** | Bundled with Studio at `http://localhost:8080` |
| **Faucet** | Built-in — use the 💧 button in the account selector |

---

## GenLayer Chain (L2)

The underlying zkSync Elastic Chain that GenLayer runs on. You typically don't need to interact with this directly — the GenLayer RPC passes through all `eth_*` calls. But if you need direct L2 access (e.g., token transfers, contract debugging at the EVM level), you can add this chain to your wallet.

| Setting | Value |
|:--|:--|
| **RPC** | `https://rpc.testnet-chain.genlayer.com` |
| **Chain ID** | 4221 |
| **Currency** | GEN |
| **Explorer** | [explorer.testnet-chain.genlayer.com](https://explorer.testnet-chain.genlayer.com/) |

---

## Network Comparison

| | Bradbury | Asimov | Studionet | Localnet |
|---|---|---|---|---|
| **Purpose** | Production-like testing | Infrastructure testing | Hosted dev | Local dev |
| **Setup** | None — connect and go | None — connect and go | None — browser only | Docker or GLSim |
| **Persistence** | Persistent | Persistent | Temporary | Local only |
| **LLM execution** | Real models | Real models | Real models | Configurable |
| **Faucet** | [Available](https://testnet-faucet.genlayer.foundation) | [Available](https://testnet-faucet.genlayer.foundation) | Built-in (💧 button) | Built-in (💧 button) |

## Recommended Flow

1. **Start on Studionet** — zero setup, open [studio.genlayer.com](https://studio.genlayer.com)
2. **Move to Localnet** — when you need full control and fast iteration
3. **Deploy to Bradbury** — when ready for production-like testing with real AI workloads
