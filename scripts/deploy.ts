import { ethers } from "hardhat";
import {
  merkleTreeLSP2JSONURL,
  merkleTreeRoot,
  phygitalAssetCollectionLSP4MetadataJSONURL,
} from "../test-data/merkle-tree";

async function main() {
  const [collectionOwner] = await ethers.getSigners();

  const phygitalAssetCollection = await ethers.deployContract(
    "PhygitalAssetCollection",
    [
      merkleTreeRoot,
      merkleTreeLSP2JSONURL,
      "Sneaker",
      "SNKR",
      phygitalAssetCollectionLSP4MetadataJSONURL,
      collectionOwner.address,
    ]
  );

  await phygitalAssetCollection.waitForDeployment();

  console.log(`Phygital asset deployed to ${phygitalAssetCollection.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
