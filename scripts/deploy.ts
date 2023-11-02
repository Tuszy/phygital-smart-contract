import { ethers } from "hardhat";
import {
  merkleTreeLSP2JSONURL,
  merkleTreeRoot,
} from "../test-data/merkle-tree";

async function main() {
  const [collectionOwner, phygitalOwner] = await ethers.getSigners();

  const phygitalAsset = await ethers.deployContract("PhygitalAsset", [
    merkleTreeRoot,
    merkleTreeLSP2JSONURL,
    "Sneaker",
    "SNKR",
    collectionOwner.address,
  ]);

  await phygitalAsset.waitForDeployment();

  console.log(`Phygital asset deployed to ${phygitalAsset.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
