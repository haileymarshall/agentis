# Agentis

Agentis is an agentic-commerce job escrow and dispute settlement dapp.

Base holds escrow, agent bonds, fees, job state, appeal windows, and pull-payment claims. GenLayer StudioNet acts only as the judgment oracle for contested AI-agent work. The relayer listens for Base verdict requests, calls GenLayer, waits for a finalized verdict, validates the JSON, and writes the verdict back to the same Base chain.

## Architecture

- `contracts/solidity/Agentis.sol` - Base escrow, lifecycle, disputes, verdict recording, appeals, settlement, claims.
- `contracts/agentis_judge.py` - GenLayer Intelligent Contract for adjudication. `contracts/genlayer/agentis_judge.py` is the same judge kept under the spec folder.
- `backend/` - TypeScript relayer with Base Sepolia/Mainnet separation and idempotency state.
- `frontend/` - Vite React dapp that talks to Base only.
- `shared/` - Chain config, ABI, and shared TypeScript types.
- `deployments/` - Base and GenLayer deployment registries.

## Trust Assumptions

The current cross-network MVP uses a trusted relayer. The relayer is responsible for submitting the finalized GenLayer verdict faithfully to the same Base chain that emitted `VerdictRequested`. This is not a trustless bridge. Future production hardening should add proof verification, signed GenLayer attestations, or decentralized relayers.

GenLayer remains on StudioNet. Evidence URLs must be public. Fetched evidence is untrusted and may change over time. Agentis is not legal arbitration, and Base Mainnet funds are real funds.

## Install

```bash
npm install
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

## Environment Files

Create these local files from the examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Never commit real keys. `.env` files are gitignored.

Important variables:

- `DEPLOYER_PRIVATE_KEY`
- `BASE_SEPOLIA_RPC_URL=https://sepolia.base.org`
- `BASE_MAINNET_RPC_URL=https://mainnet.base.org`
- `BASE_SEPOLIA_RELAYER_PRIVATE_KEY`
- `BASE_MAINNET_RELAYER_PRIVATE_KEY`
- `GENLAYER_ACCOUNT_PRIVATE_KEY`
- `GENLAYER_NETWORK=studionet`
- `GENLAYER_CONTRACT_ADDRESS`
- `VITE_DEFAULT_CHAIN=baseSepolia`
- `VITE_BASE_SEPOLIA_AGENTIS_ADDRESS`
- `VITE_BASE_MAINNET_AGENTIS_ADDRESS`

## Test And Build

```bash
npm run compile
npm run test:solidity
npm run lint:genlayer
npm run test:genlayer
npm run test -w @agentis/backend
npm run build -w @agentis/shared
npm run build -w @agentis/backend
npm run build -w @agentis/frontend
```

`gltest.config.yaml` keeps GenLayer direct-test artifacts in `genlayer-artifacts/` so Hardhat artifacts are not cleared.

## Run The Frontend

Set `frontend/.env`, then:

```bash
npm run dev -w @agentis/frontend
```

The frontend supports Base Sepolia and Base Mainnet at runtime. It shows a Sepolia testnet badge, a Mainnet real-funds warning, the selected Agentis contract address, and `GenLayer: studionet`. Browser actions talk to Base only.

## Run The Relayer

Set `backend/.env`, then:

```bash
npm run dev -w @agentis/backend
```

The relayer:

- watches and scans `VerdictRequested(jobId, chainId)` on Base Sepolia and Base Mainnet,
- refuses mixed-chain events,
- calls `evaluate_job_dispute` on GenLayer StudioNet,
- waits for `FINALIZED`,
- validates verdict JSON,
- stores idempotency records in `RELAY_DB_PATH`,
- writes `recordVerdict` back to the same Base contract.

Health endpoint:

```text
http://localhost:8787/health
```

## GenLayer Deployment

Lint and test before deployment:

```bash
npm run lint:genlayer
npm run test:genlayer
```

Deploy to StudioNet only after your GenLayer account is configured:

```bash
genlayer network set studionet
genlayer deploy --contract contracts/agentis_judge.py
```

Update:

- `deployments/genlayer.json`
- `GENLAYER_CONTRACT_ADDRESS`
- `VITE_GENLAYER_NETWORK=studionet`

## Base Sepolia Deployment

Set root `.env` with:

- `DEPLOYER_PRIVATE_KEY`
- `PLATFORM_TREASURY`
- `VERDICT_RELAYER`
- `BASE_SEPOLIA_RPC_URL`

Then run:

```bash
npm run compile
npm run test:solidity
npm run deploy:base-sepolia
```

The deploy script updates `deployments/base.json`. Copy the Sepolia address into:

- `backend/.env` as `BASE_SEPOLIA_AGENTIS_ADDRESS`
- `frontend/.env` as `VITE_BASE_SEPOLIA_AGENTIS_ADDRESS`

## Base Mainnet Deployment

Do not deploy Base Mainnet without explicit confirmation.

Before a Mainnet deployment, the deploy script prints:

- deployer address,
- target chain,
- contract,
- constructor arguments,
- current balance,
- gas estimate,
- exact command,
- real ETH warning.

It refuses to deploy unless `CONFIRM_BASE_MAINNET_DEPLOY=yes` is set after explicit approval.

Command after approval only:

```bash
CONFIRM_BASE_MAINNET_DEPLOY=yes npm run deploy:base-mainnet
```

## User Flow

1. Client creates a job and escrows ETH on the selected Base chain.
2. Agent accepts and may post a bond.
3. Agent submits delivery evidence.
4. Client approves or either party opens a dispute.
5. Both parties can submit evidence.
6. Anyone requests a verdict.
7. Relayer calls GenLayer StudioNet.
8. Relayer records a structured verdict on the same Base chain.
9. Appeal window opens.
10. Anyone finalizes after the appeal window.
11. Client and/or agent claim pull-payment balances.

## Known Limitations

- The relayer is trusted in this build.
- GenLayer is on StudioNet.
- Evidence URLs must be public and accessible.
- Dynamic evidence pages can change after submission.
- Prompt-injection defenses reduce risk but do not make evidence pages safe by themselves.
- Private documents need separate safe storage/access controls.
- Regulations may apply depending on how Agentis is used.

## Next Command

For local verification from a fresh shell:

```bash
npm run compile && npm run test:solidity && npm run lint:genlayer && npm run test:genlayer
```
