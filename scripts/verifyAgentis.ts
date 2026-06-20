import { run } from "hardhat";

async function main() {
  const contractAddress = process.env.AGENTIS_ADDRESS;
  if (!contractAddress) {
    throw new Error("Set AGENTIS_ADDRESS to the deployed Agentis contract address.");
  }

  const constructorArguments = [
    process.env.VERDICT_RELAYER,
    process.env.PLATFORM_TREASURY,
    process.env.PLATFORM_FEE_BPS || "200",
    process.env.APPEAL_WINDOW_SECONDS || "3600"
  ];

  await run("verify:verify", {
    address: contractAddress,
    constructorArguments
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
