import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ipfsURL, publicKeyList } from "../test-data/public-key-list";

import merkleTree from "../test-data/merkle-tree";
import { getLSP2JSONURL } from "../test-data/util";

// see schemas/PhygitalAsset.json
const PhygitalAssetCollectionMerkleTreeURI =
  "0x931b4f026a670558cbd3aeba98023d97e4910a7f5be2441e3f9ec1c5c5a1001f";
const LSP4TokenName =
  "0xdeba1e292f8ba88238e10ab3c7f88bd4be4fac56cad5194b6ecceaf653468af1";
const LSP4TokenSymbol =
  "0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756";
const LSP8TokenIdTypeKey =
  "0x715f248956de7ce65e94d9d836bfead479f7e70d69b718d47bfe7b00e05b4fe4";
const LSP8TokenIdTypeHash = 3;

describe("PhygitalAsset", function () {
  async function deployFixture() {
    const [collectionOwner, phygitalOwner] = await ethers.getSigners();

    const merkleRootOfCollection = "0x" + merkleTree.getRoot().toString("hex");

    const phygitalAssetName = "Sneaker";
    const phygitalAssetSymbol = "SNKR";

    const phygitalCollectionMerkleTreeJSONURL = getLSP2JSONURL(
      publicKeyList,
      ipfsURL
    );

    const PhygitalAsset = await ethers.getContractFactory("PhygitalAsset");
    const phygitalAsset = await PhygitalAsset.deploy(
      merkleRootOfCollection,
      phygitalCollectionMerkleTreeJSONURL,
      phygitalAssetName,
      phygitalAssetSymbol,
      collectionOwner.address
    );

    return {
      phygitalAsset,
      phygitalAssetName,
      phygitalAssetSymbol,
      phygitalCollectionMerkleTreeJSONURL,
      merkleRootOfCollection,
      collectionOwner,
      phygitalOwner,
    };
  }

  describe("Deployment", function () {
    it("Should set the right merkleRootOfCollection", async function () {
      const { phygitalAsset, merkleRootOfCollection } = await loadFixture(
        deployFixture
      );

      expect(await phygitalAsset.merkleRootOfCollection()).to.equal(
        merkleRootOfCollection
      );
    });

    it("Should set the right phygital asset name", async function () {
      const { phygitalAsset, phygitalAssetName } = await loadFixture(
        deployFixture
      );

      expect(
        ethers.toUtf8String(await phygitalAsset.getData(LSP4TokenName))
      ).to.equal(phygitalAssetName);
    });

    it("Should set the right phygital asset symbol", async function () {
      const { phygitalAsset, phygitalAssetSymbol } = await loadFixture(
        deployFixture
      );

      expect(
        ethers.toUtf8String(await phygitalAsset.getData(LSP4TokenSymbol))
      ).to.equal(phygitalAssetSymbol);
    });

    it("Should set the right phygital collection merkle tree json url", async function () {
      const { phygitalAsset, phygitalCollectionMerkleTreeJSONURL } =
        await loadFixture(deployFixture);

      expect(
        await phygitalAsset.getData(PhygitalAssetCollectionMerkleTreeURI)
      ).to.equal(phygitalCollectionMerkleTreeJSONURL);
    });

    it("Should set the token id type to hash", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(await phygitalAsset.getData(LSP8TokenIdTypeKey)).to.equal(
        BigInt(LSP8TokenIdTypeHash)
      );
    });

    it("Should set the right owner", async function () {
      const { phygitalAsset, collectionOwner } = await loadFixture(
        deployFixture
      );

      expect(await phygitalAsset.owner()).to.equal(collectionOwner.address);
    });
  });

  /*describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.withdraw()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });
  });*/
});
