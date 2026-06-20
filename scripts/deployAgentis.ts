import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers, network } from "hardhat";

const BASE_NETWORKS: Record<string, { key: "baseSepolia" | "baseMainnet"; chainId: number; label: string }> = {
  baseSepolia: { key: "baseSepolia", chainId: 84532, label: "Base Sepolia" },
  baseMainnet: { key: "baseMainnet", chainId: 8453, label: "Base Mainnet" }
};

function requireAddress(name: string): string {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`${name} must be set to a valid address`);
  }
  return value;
}

async function main() {
  const target = BASE_NETWORKS[network.name];
  if (!target) {
    throw new Error(`Unsupported deployment network: ${network.name}`);
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer is configured. Set DEPLOYER_PRIVATE_KEY in .env.");
  }

  const verdictRelayer = requireAddress("VERDICT_RELAYER");
  const platformTreasury = requireAddress("PLATFORM_TREASURY");
  const platformFeeBps = BigInt(process.env.PLATFORM_FEE_BPS || "200");
  const appealWindowSeconds = BigInt(process.env.APPEAL_WINDOW_SECONDS || "3600");

  const Agentis = await ethers.getContractFactory("Agentis");
  const deployTx = await Agentis.getDeployTransaction(
    verdictRelayer,
    platformTreasury,
    platformFeeBps,
    appealWindowSeconds
  );
  const balance = await ethers.provider.getBalance(deployer.address);
  const gasEstimate = await ethers.provider.estimateGas({ ...deployTx, from: deployer.address });

  if (target.key === "baseMainnet") {
    console.log("Base Mainnet deployment safety checklist");
    console.log(`deployer address: ${deployer.address}`);
    console.log(`target chain: ${target.label} (${target.chainId})`);
    console.log("contract: Agentis");
    console.log(
      `constructor arguments: ${JSON.stringify([
        verdictRelayer,
        platformTreasury,
        platformFeeBps.toString(),
        appealWindowSeconds.toString()
      ])}`
    );
    console.log(`current account balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`gas estimate: ${gasEstimate.toString()}`);
    console.log("exact command: npm run deploy:base-mainnet");
    console.log("WARNING: Base Mainnet uses real ETH and can move real funds.");

    if (process.env.CONFIRM_BASE_MAINNET_DEPLOY !== "yes") {
      throw new Error("Set CONFIRM_BASE_MAINNET_DEPLOY=yes only after explicit user approval.");
    }
  }

  console.log(`Deploying Agentis to ${target.label} with deployer ${deployer.address}`);
  const agentis = await Agentis.deploy(verdictRelayer, platformTreasury, platformFeeBps, appealWindowSeconds);
  await agentis.waitForDeployment();
  const address = await agentis.getAddress();
  const receipt = await agentis.deploymentTransaction()?.wait();

  console.log(`Agentis deployed to ${address}`);
  console.log(`Deployment block: ${receipt?.blockNumber ?? 0}`);

  updateDeploymentRegistry(target.key, address, receipt?.blockNumber ?? 0);
}

function updateDeploymentRegistry(key: "baseSepolia" | "baseMainnet", address: string, deploymentBlock: number) {
  const path = resolve("deployments/base.json");
  const current = JSON.parse(readFileSync(path, "utf8"));
  current[key].contractAddress = address;
  current[key].deploymentBlock = deploymentBlock;
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
