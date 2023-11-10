import { ethers } from "hardhat";
import {
  phygitalCollectionJSONURL,
  merkleRoot,
  phygitalAssetLSP4MetadataJSONURL,
} from "../test-util/phygital-collection";

async function main() {
  const [collectionOwner] = await ethers.getSigners();

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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
