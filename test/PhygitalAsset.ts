import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getMintDataForPhygital,
  merkleTreeLSP2JSONURL,
} from "../test-data/merkle-tree";

import { merkleTreeRoot } from "../test-data/merkle-tree";
import { getOwnerAndUniversalProfiles } from "../test-data/universal-profile";

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
    const [owner] = await ethers.getSigners();

    const merkleRootOfCollection = merkleTreeRoot;

    const phygitalAssetName = "Sneaker";
    const phygitalAssetSymbol = "SNKR";

    const phygitalCollectionMerkleTreeJSONURL = merkleTreeLSP2JSONURL;

    const PhygitalAsset = await ethers.getContractFactory("PhygitalAsset");
    const phygitalAsset = await PhygitalAsset.deploy(
      merkleRootOfCollection,
      phygitalCollectionMerkleTreeJSONURL,
      phygitalAssetName,
      phygitalAssetSymbol,
      owner.address
    );

    const [collectionOwner, phygitalOwner] = await getOwnerAndUniversalProfiles(
      phygitalAsset
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

      expect(await phygitalAsset.owner()).to.equal(
        collectionOwner.universalProfileOwner.address
      );
    });
  });

  describe("function mint(address phygitalOwner, address phygitalAddress, uint phygitalIndex, bytes memory phygitalSignature, bytes32[] memory merkleProofOfCollection, bool force) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital owner is invalid", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
          await loadFixture(deployFixture);

        const phygitalIndex = 0;
        const { phygitalAddress, phygitalSignature, merkleProof } =
          getMintDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileOwner.address
          );

        await expect(
          phygitalAsset.mint(
            collectionOwner.universalProfileOwner.address,
            phygitalAddress,
            phygitalIndex,
            phygitalSignature,
            merkleProof,
            false
          )
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "PhygitalAssetOwnershipVerificationFailed"
        );
      });

      it("Should revert with the the custom error PhygitalAssetIsNotPartOfCollection if the phygital is not part of the collection (invalid merkle proof)", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalAddress, phygitalSignature, merkleProof } =
          getMintDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileOwner.address
          );

        await expect(
          phygitalAsset.mint(
            phygitalOwner.universalProfileOwner.address,
            phygitalAddress,
            phygitalIndex + 1,
            phygitalSignature,
            merkleProof,
            false
          )
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "PhygitalAssetIsNotPartOfCollection"
        );
      });

      it("Should revert with the the custom error PhygitalAssetIsNotPartOfCollection if the phygital owner is not a universal profile and force is set to false", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalAddress, phygitalSignature, merkleProof } =
          getMintDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileOwner.address
          );

        await expect(
          phygitalAsset.mint(
            phygitalOwner.universalProfileOwner.address,
            phygitalAddress,
            phygitalIndex,
            phygitalSignature,
            merkleProof,
            false
          )
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "LSP8NotifyTokenReceiverIsEOA"
        );
      });
    });

    it("Should pass if the phygital owner is not a universal profile but force is set to true", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

      const phygitalIndex = 0;
      const { phygitalAddress, phygitalSignature, merkleProof } =
        getMintDataForPhygital(
          phygitalIndex,
          phygitalOwner.universalProfileOwner.address
        );

      await expect(
        phygitalAsset.mint(
          phygitalOwner.universalProfileOwner.address,
          phygitalAddress,
          phygitalIndex,
          phygitalSignature,
          merkleProof,
          true
        )
      ).not.to.be.reverted;
    });

    it("Should pass if the phygital owner is a universal profile and force is set to true", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

      const phygitalIndex = 0;
      const { phygitalAddress, phygitalSignature, merkleProof } =
        getMintDataForPhygital(
          phygitalIndex,
          phygitalOwner.universalProfileOwner.address
        );

      await expect(
        phygitalAsset.mint(
          phygitalOwner.universalProfileOwner.address,
          phygitalAddress,
          phygitalIndex,
          phygitalSignature,
          merkleProof,
          true
        )
      ).not.to.be.reverted;
    });

    it("Should pass if the phygital owner is a universal profile and force is set to false", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

      const phygitalIndex = 0;
      const { phygitalAddress, phygitalSignature, merkleProof } =
        getMintDataForPhygital(
          phygitalIndex,
          phygitalOwner.universalProfileAddress
        );

      await expect(
        phygitalAsset.mint(
          phygitalOwner.universalProfileAddress,
          phygitalAddress,
          phygitalIndex,
          phygitalSignature,
          merkleProof,
          false
        )
      ).not.to.be.reverted;
    });

    /*describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });*/
  });
});
