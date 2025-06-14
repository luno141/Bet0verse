const hre = require("hardhat");

async function main() {
  const Betting = await hre.ethers.getContractFactory("Betting");
  const contract = await Betting.deploy();
  await contract.waitForDeployment();
  console.log(`✅ Contract deployed to: ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
