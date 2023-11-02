import { ethers } from "hardhat";

async function main() {
  const phygitalAsset = await ethers.deployContract("PhygitalAsset", [
    /*constructor args*/
  ]);

  await phygitalAsset.waitForDeployment();

  console.log(`Phygital asset deployed to ${phygitalAsset.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
