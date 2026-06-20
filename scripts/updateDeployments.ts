import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const networkKey = process.env.DEPLOYMENT_NETWORK;
const contractAddress = process.env.AGENTIS_ADDRESS;
const deploymentBlock = Number(process.env.DEPLOYMENT_BLOCK || "0");

if (networkKey !== "baseSepolia" && networkKey !== "baseMainnet") {
  throw new Error("DEPLOYMENT_NETWORK must be baseSepolia or baseMainnet.");
}

if (!contractAddress) {
  throw new Error("AGENTIS_ADDRESS is required.");
}

const path = resolve("deployments/base.json");
const current = JSON.parse(readFileSync(path, "utf8"));
current[networkKey].contractAddress = contractAddress;
current[networkKey].deploymentBlock = deploymentBlock;
writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`);

console.log(`Updated ${networkKey} deployment to ${contractAddress} at block ${deploymentBlock}.`);
