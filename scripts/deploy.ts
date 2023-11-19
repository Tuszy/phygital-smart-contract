import { ethers } from "hardhat";
import {
  phygitalCollectionJSONURL,
  merkleTree,
  phygitalAssetLSP4MetadataJSONURL,
  phygitalAssetLSP8BaseURI,
} from "../test-util/phygital-collection";

// added manually
const deployedAddresses: Record<string, string | null> = {
  LuksoTestnet: "0xE78e41D9e55b97bE634EF28eca4E7E19622c8181",
  LuksoMainnet: null,
};

async function main() {
  const [collectionOwner] = await ethers.getSigners();

  const deployedAddress =
    deployedAddresses[(await collectionOwner.provider.getNetwork()).name];
  if (!deployedAddress) {
    try {
      const phygitalAsset = await ethers.deployContract("PhygitalAsset", [
        merkleTree.root,
        phygitalCollectionJSONURL,
        "Sneaker",
        "SNKR",
        phygitalAssetLSP4MetadataJSONURL,
        phygitalAssetLSP8BaseURI,
        process.env.COLLECTION_OWNER || collectionOwner.address,
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
