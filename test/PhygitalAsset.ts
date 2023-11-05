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
    it("Should set the 'owner' to the creating PhygitalAssetCollection contract instance", async function () {
      const { phygitalAsset, phygitalAssetCollectionContractAddress } =
        await loadFixture(deployFixture);

      expect(await phygitalAsset.owner()).to.equal(
        phygitalAssetCollectionContractAddress
      );
    });

    it("Should set the 'id' to the passed phygital id", async function () {
      const { phygitalAsset, phygitalId } = await loadFixture(deployFixture);

      expect(await phygitalAsset.id()).to.equal(phygitalId);
    });

    it("Should revert with the the custom error NotContainingPhygitalAssetCollection if the phygital was not created by an contract instance of type PhygitalAssetCollection", async function () {
      const { phygitalId } = await loadFixture(deployFixture);

      const PhygitalAsset = await ethers.getContractFactory("PhygitalAsset");

      await expect(PhygitalAsset.deploy(phygitalId)).to.be.reverted;
    });
  });

  describe("bool public verifiedOwnership", function () {
    it("Should be true after mint", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(await phygitalAsset.verifiedOwnership()).to.equal(true);
    });

    it("Should be false after transfer", async function () {
      const { phygitalOwner, collectionOwner, tokenId, phygitalAsset } =
        await loadFixture(deployFixture);

      await expect(
        phygitalOwner.transfer(
          collectionOwner.universalProfileAddress,
          tokenId,
          false
        )
      ).not.to.be.reverted;

      expect(await phygitalAsset.verifiedOwnership()).to.equal(false);
    });

    it("Should be true after verifying post transfer", async function () {
      const {
        phygitalOwner,
        collectionOwner,
        tokenId,
        phygitalAsset,
        phygitalIndex,
        phygitalAssetContractAddress,
      } = await loadFixture(deployFixture);

      await expect(
        phygitalOwner.transfer(
          collectionOwner.universalProfileAddress,
          tokenId,
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
          phygitalAssetContractAddress,
          phygitalSignature2
        )
      ).not.to.be.reverted;

      expect(await phygitalAsset.verifiedOwnership()).to.equal(true);
    });
  });

  describe("function phygitalOwner() public view returns (address)", function () {
    it("Should be the initial 'phygital owner' after mint", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

      expect(await phygitalAsset.phygitalOwner()).to.equal(
        phygitalOwner.universalProfileAddress
      );
    });

    it("Should be the new 'phygital owner' after transfer", async function () {
      const { phygitalOwner, collectionOwner, tokenId, phygitalAsset } =
        await loadFixture(deployFixture);

      await expect(
        phygitalOwner.transfer(
          collectionOwner.universalProfileAddress,
          tokenId,
          false
        )
      ).not.to.be.reverted;

      expect(await phygitalAsset.phygitalOwner()).to.equal(
        collectionOwner.universalProfileAddress
      );
    });
  });

  describe("function resetOwnershipVerificationAfterTransfer() external onlyContainingCollection", function () {
    it("Should revert with the the custom error NotContainingPhygitalAssetCollection if the function is not called by the containing PhygitalAssetCollection contract instance", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      await expect(
        phygitalAsset.resetOwnershipVerificationAfterTransfer()
      ).to.be.revertedWithCustomError(
        phygitalAsset,
        "NotContainingPhygitalAssetCollection"
      );
    });
  });

  describe("function verifyOwnershipAfterTransfer(bytes memory phygitalSignature) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetHasAlreadyAVerifiedOwnership if the phygital ownership is already verified (after mint)", async function () {
        const {
          phygitalAssetContractAddress,
          phygitalAsset,
          phygitalOwner,
          phygitalSignature,
        } = await loadFixture(deployFixture);

        await expect(
          phygitalOwner.verifyOwnershipAfterTransfer(
            phygitalAssetContractAddress,
            phygitalSignature
          )
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "PhygitalAssetHasAlreadyAVerifiedOwnership"
        );
      });

      it("Should revert with the the custom error PhygitalAssetHasAlreadyAVerifiedOwnership if the phygital ownership is already verified (after transfer)", async function () {
        const {
          phygitalOwner,
          phygitalAsset,
          collectionOwner,
          phygitalIndex,
          phygitalAssetContractAddress,
          tokenId,
        } = await loadFixture(deployFixture);

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            tokenId,
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
            phygitalAssetContractAddress,
            phygitalSignature2
          )
        ).not.to.be.reverted;

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAssetContractAddress,
            phygitalSignature2
          )
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "PhygitalAssetHasAlreadyAVerifiedOwnership"
        );
      });

      it("Should pass after a prior transfer", async function () {
        const {
          phygitalAsset,
          phygitalIndex,
          collectionOwner,
          phygitalOwner,
          tokenId,
          phygitalAssetContractAddress,
        } = await loadFixture(deployFixture);

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            tokenId,
            false
          )
        ).not.to.be.reverted;

        expect(await phygitalAsset.verifiedOwnership()).to.equal(false);

        const { phygitalSignature: phygitalSignature2 } =
          getVerificationDataForPhygital(
            phygitalIndex,
            collectionOwner.universalProfileAddress
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAssetContractAddress,
            phygitalSignature2
          )
        ).not.to.be.reverted;

        expect(await phygitalAsset.verifiedOwnership()).to.equal(true);
      });

      it("Should revert with the the custom error LSP8NotTokenOwner if the msg.sender is not the current phygital owner", async function () {
        const {
          phygitalAsset,
          collectionOwner,
          phygitalIndex,
          phygitalAssetContractAddress,
        } = await loadFixture(deployFixture);

        const { phygitalSignature: phygitalSignature2 } =
          getVerificationDataForPhygital(
            phygitalIndex,
            collectionOwner.universalProfileAddress
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAssetContractAddress,
            phygitalSignature2
          )
        ).to.be.revertedWithCustomError(phygitalAsset, "LSP8NotTokenOwner");
      });
    });

    it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consquence: msg.sender is not the phygital owner", async function () {
      const {
        phygitalAsset,
        collectionOwner,
        phygitalOwner,
        tokenId,
        phygitalAssetContractAddress,
        phygitalSignature,
      } = await loadFixture(deployFixture);

      await expect(
        phygitalOwner.transfer(
          collectionOwner.universalProfileAddress,
          tokenId,
          false
        )
      ).not.to.be.reverted;

      await expect(
        collectionOwner.verifyOwnershipAfterTransfer(
          phygitalAssetContractAddress,
          phygitalSignature // wrong signature
        )
      ).to.be.revertedWithCustomError(
        phygitalAsset,
        "PhygitalAssetOwnershipVerificationFailed"
      );
    });
  });
});
