import { ethers } from "hardhat";
import {
  phygitalCollectionJSONURL,
  merkleRoot,
  phygitalAssetLSP4MetadataJSONURL,
} from "../test-util/phygital-collection";

// added manually
const deployedAddresses: Record<string, string | null> = {
  LuksoTestnet: "0xf66ee509115caBEa889F01182887FDd6b89DC73D",
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
