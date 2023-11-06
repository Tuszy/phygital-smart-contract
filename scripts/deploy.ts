import { ethers } from "hardhat";
import {
  merkleTreeLSP2JSONURL,
  merkleTreeRoot,
  phygitalAssetLSP4MetadataLSP2JSONURL,
} from "../test-data/merkle-tree";

async function main() {
  const [collectionOwner] = await ethers.getSigners();

  const phygitalAsset = await ethers.deployContract("PhygitalAsset", [
    merkleTreeRoot,
    merkleTreeLSP2JSONURL,
    "Sneaker",
    "SNKR",
    phygitalAssetLSP4MetadataLSP2JSONURL,
    collectionOwner.address,
  ]);

  await phygitalAsset.waitForDeployment();

  console.log(`Phygital asset deployed to ${phygitalAsset.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
