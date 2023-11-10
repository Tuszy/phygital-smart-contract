import { ethers } from "hardhat";
import {
  phygitalCollectionJSONURL,
  merkleRoot,
  phygitalAssetLSP4MetadataJSONURL,
} from "../test-util/phygital-collection";

// added manually
const deployedAddresses: Record<string, string | null> = {
  LuksoTestnet: "0xfBd8FBBf9DF2d6d4f0a4c9fd2D739dC418731821",
  LuksoMainnet: null,
};

async function main() {
  const [collectionOwner] = await ethers.getSigners();

  const deployedAddress =
    deployedAddresses[(await collectionOwner.provider.getNetwork()).name];
  if (!deployedAddress) {
    try {
      const phygitalAsset = await ethers.deployContract("PhygitalAsset", [
        merkleRoot,
        phygitalCollectionJSONURL,
        "Sneaker",
        "SNKR",
        phygitalAssetLSP4MetadataJSONURL,
        collectionOwner.address,
      ]);

      await phygitalAsset.waitForDeployment();
      console.log(`Phygital asset deployed to ${phygitalAsset.target}`);
    } catch (e) {
      console.log("Failed to deploy phygital asset", e);
    }
  } else {
    console.log(`Phygital asset deployed to ${deployedAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
