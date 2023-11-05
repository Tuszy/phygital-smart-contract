import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getVerificationDataForPhygital,
  merkleTreeLSP2JSONURL,
} from "../test-data/merkle-tree";
import { abi as PhygitalAssetABI } from "../artifacts/contracts/PhygitalAsset.sol/PhygitalAsset.json";
import { merkleTreeRoot } from "../test-data/merkle-tree";
import { getUniversalProfiles } from "../test-data/universal-profile";

describe("PhygitalAsset", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const PhygitalAssetCollection = await ethers.getContractFactory(
      "PhygitalAssetCollection",
      owner
    );
    const phygitalAssetCollection = await PhygitalAssetCollection.deploy(
      merkleTreeRoot,
      merkleTreeLSP2JSONURL,
      "Sneaker",
      "SNKR",
      owner.address
    );

    const phygitalAssetCollectionContractAddress =
      await phygitalAssetCollection.getAddress();

    const [collectionOwner, phygitalOwner] = await getUniversalProfiles(
      phygitalAssetCollection
    );

    const phygitalIndex = 0;
    const { phygitalId, phygitalSignature, merkleProof } =
      getVerificationDataForPhygital(
        phygitalIndex,
        phygitalOwner.universalProfileAddress
      );

    await phygitalOwner.mint(
      phygitalId,
      phygitalIndex,
      phygitalSignature,
      merkleProof,
      false
    );

    const phygitalAssetContractAddress =
      await phygitalAssetCollection.phygitalIdToContractAddress(phygitalId);
    const tokenId = ethers.zeroPadValue(
      await phygitalAssetCollection.phygitalIdToContractAddress(phygitalId),
      32
    );

    const phygitalAsset = new ethers.Contract(
      phygitalAssetContractAddress,
      PhygitalAssetABI,
      phygitalOwner.universalProfileOwner
    );

    return {
      phygitalAssetCollectionContractAddress,
      phygitalAssetCollection,
      collectionOwner,
      phygitalAssetContractAddress,
      phygitalAsset,
      phygitalOwner,
      phygitalIndex,
      phygitalId,
      phygitalSignature,
      tokenId,
    };
  }

  describe("Deployment", function () {
    it("Should set the 'verifiedOwnership' to true", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(await phygitalAsset.verifiedOwnership()).to.equal(true);
    });

    it("Should set the 'collection' to the creating PhygitalAssetCollection contract instance", async function () {
      const { phygitalAssetCollectionContractAddress, phygitalAsset } =
        await loadFixture(deployFixture);

      expect(await phygitalAsset.collection()).to.equal(
        phygitalAssetCollectionContractAddress
      );
    });

    it("Should set the 'id' to the passed phygital id", async function () {
      const { phygitalAsset, phygitalId } = await loadFixture(deployFixture);

      expect(await phygitalAsset.id()).to.equal(phygitalId);
    });

    it("Should revert with the the custom error NotContainingPhygitalAssetCollection if the phygital was not created by an contract instance of type PhygitalAssetCollection", async function () {
      const { phygitalId, phygitalOwner } = await loadFixture(deployFixture);

      const PhygitalAsset = await ethers.getContractFactory("PhygitalAsset");

      await expect(
        PhygitalAsset.deploy(phygitalId, phygitalOwner.universalProfileAddress)
      ).to.be.reverted;
    });
  });

  /*describe("function verifyOwnershipAfterTransfer(bytes32 phygitalId, bytes memory phygitalSignature) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetHasAlreadyAVerifiedOwnership if the phygital ownership is already verified (after mint)", async function () {
        const { phygitalAssetCollection, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalId,
            phygitalIndex,
            phygitalSignature,
            merkleProof,
            false
          )
        ).not.to.be.reverted;

        await expect(
          phygitalOwner.verifyOwnershipAfterTransfer(
            phygitalId,
            phygitalSignature
          )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "PhygitalAssetHasAlreadyAVerifiedOwnership"
        );
      });

      it("Should revert with the the custom error PhygitalAssetHasAlreadyAVerifiedOwnership if the phygital ownership is already verified (after transfer)", async function () {
        const { phygitalAssetCollection, collectionOwner, phygitalOwner } =
          await loadFixture(deployFixture);

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalId,
            phygitalIndex,
            phygitalSignature,
            merkleProof,
            false
          )
        ).not.to.be.reverted;

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            phygitalId,
            false
          )
        ).not.to.be.reverted;

        const { phygitalSignature: phygitalSignature2 } =
          getVerificationDataForPhygital(
            phygitalIndex,
            collectionOwner.universalProfileAddress
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalId,
            phygitalSignature2
          )
        ).not.to.be.reverted;

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalId,
            phygitalSignature2
          )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "PhygitalAssetHasAlreadyAVerifiedOwnership"
        );
      });

      it("Should pass after a prior transfer", async function () {
        const { phygitalAssetCollection, collectionOwner, phygitalOwner } =
          await loadFixture(deployFixture);

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalId,
            phygitalIndex,
            phygitalSignature,
            merkleProof,
            false
          )
        ).not.to.be.reverted;

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            phygitalId,
            false
          )
        ).not.to.be.reverted;

        expect(
          await phygitalAssetCollection.verifiedOwnership(phygitalId)
        ).to.equal(false);

        const { phygitalSignature: phygitalSignature2 } =
          getVerificationDataForPhygital(
            phygitalIndex,
            collectionOwner.universalProfileAddress
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalId,
            phygitalSignature2
          )
        ).not.to.be.reverted;

        expect(
          await phygitalAssetCollection.verifiedOwnership(phygitalId)
        ).to.equal(true);
      });

      it("Should revert with the the custom error LSP8NonExistentTokenId if the phygital id has not been minted yet", async function () {
        const { phygitalAssetCollection, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.verifyOwnershipAfterTransfer(
            phygitalId,
            phygitalSignature
          )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "LSP8NonExistentTokenId"
        );
      });

      it("Should revert with the the custom error LSP8NonExistentTokenId if the phygital id does not exist", async function () {
        const { phygitalAssetCollection, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalSignature } = getVerificationDataForPhygital(
          phygitalIndex,
          phygitalOwner.universalProfileAddress
        );

        await expect(
          phygitalOwner.verifyOwnershipAfterTransfer(
            keccak256("string")("RANDOM DATA"),
            phygitalSignature
          )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "LSP8NonExistentTokenId"
        );
      });

      it("Should revert with the the custom error LSP8NotTokenOwner if the msg.sender is not the current phygital owner", async function () {
        const { phygitalAssetCollection, collectionOwner, phygitalOwner } =
          await loadFixture(deployFixture);

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalId,
            phygitalIndex,
            phygitalSignature,
            merkleProof,
            false
          )
        ).not.to.be.reverted;

        const { phygitalSignature: phygitalSignature2 } =
          getVerificationDataForPhygital(
            phygitalIndex,
            collectionOwner.universalProfileAddress
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalId,
            phygitalSignature2
          )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "LSP8NotTokenOwner"
        );
      });
    });

    it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consquence: msg.sender is not the phygital owner", async function () {
      const { phygitalAssetCollection, collectionOwner, phygitalOwner } =
        await loadFixture(deployFixture);

      const phygitalIndex = 0;
      const { phygitalId, phygitalSignature, merkleProof } =
        getVerificationDataForPhygital(
          phygitalIndex,
          phygitalOwner.universalProfileAddress
        );

      await expect(
        phygitalOwner.mint(
          phygitalId,
          phygitalIndex,
          phygitalSignature,
          merkleProof,
          false
        )
      ).not.to.be.reverted;

      await expect(
        phygitalOwner.transfer(
          collectionOwner.universalProfileAddress,
          phygitalId,
          false
        )
      ).not.to.be.reverted;

      await expect(
        collectionOwner.verifyOwnershipAfterTransfer(
          phygitalId,
          phygitalSignature // wrong signature
        )
      ).to.be.revertedWithCustomError(
        phygitalAssetCollection,
        "PhygitalAssetOwnershipVerificationFailed"
      );
    });
  });*/
});
