import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getVerificationDataForPhygital,
  merkleTreeLSP2JSONURL,
} from "../test-data/merkle-tree";

import { merkleTreeRoot } from "../test-data/merkle-tree";
import { getOwnerAndUniversalProfiles } from "../test-data/universal-profile";
import { keccak256 } from "../test-data/util";

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

  describe("function mint(address phygitalOwner, bytes32 phygitalId, uint phygitalIndex, bytes memory phygitalSignature, bytes32[] memory merkleProofOfCollection, bool force) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consequence: msg.sender (EOA) is not the phygital owner", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalAsset
            .connect(phygitalOwner.universalProfileOwner)
            .mint(
              phygitalId,
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

      it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consquence: msg.sender (universal profile) is not the phygital owner", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
          await loadFixture(deployFixture);

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          collectionOwner.mint(
            phygitalId,
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
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalId,
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

      it("Should revert with the the custom error LSP8NotifyTokenReceiverIsEOA if the phygital owner is not a universal profile and force is set to false", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileOwner.address
          );

        await expect(
          phygitalAsset
            .connect(phygitalOwner.universalProfileOwner)
            .mint(
              phygitalId,
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
      const { phygitalId, phygitalSignature, merkleProof } =
        getVerificationDataForPhygital(
          phygitalIndex,
          phygitalOwner.universalProfileOwner.address
        );

      await expect(
        phygitalAsset
          .connect(phygitalOwner.universalProfileOwner)
          .mint(phygitalId, phygitalIndex, phygitalSignature, merkleProof, true)
      ).not.to.be.reverted;
    });

    it("Should pass if the phygital owner is a universal profile and force is set to true", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

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
          true
        )
      ).not.to.be.reverted;
    });

    it("Should pass if the phygital owner is a universal profile and force is set to false", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

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
    });

    it("Should revert with the the custom error LSP8TokenIdAlreadyMinted if the phygital has already been minted", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

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
        phygitalOwner.mint(
          phygitalId,
          phygitalIndex,
          phygitalSignature,
          merkleProof,
          false
        )
      ).to.be.revertedWithCustomError(
        phygitalAsset,
        "LSP8TokenIdAlreadyMinted"
      );
    });

    describe("Events", function () {
      it("Should emit the Transfer event on mint", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
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
        )
          .to.emit(phygitalAsset, "Transfer")
          .withArgs(
            phygitalOwner.universalProfileAddress,
            ethers.ZeroAddress,
            phygitalOwner.universalProfileAddress,
            phygitalId,
            false,
            anyValue
          );
      });
    });
  });

  describe("function transfer(address from, address to, bytes32 tokenId, bool force, bytes memory data) public virtual override", function () {
    describe("Validations", function () {
      it("Should pass if it is the first transfer after mint", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
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

        expect(await phygitalAsset.verifiedOwnership(phygitalId)).to.equal(
          true
        );

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            phygitalId,
            false
          )
        ).not.to.be.reverted;
      });

      it("Should revert with the the custom error PhygitalAssetHasAnUnverifiedOwnership if the phygital ownership is unverified", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
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

        expect(await phygitalAsset.verifiedOwnership(phygitalId)).to.equal(
          false
        );

        await expect(
          collectionOwner.transfer(
            phygitalOwner.universalProfileAddress,
            phygitalId,
            false
          )
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "PhygitalAssetHasAnUnverifiedOwnership"
        );
      });

      it("Should pass if the ownership has been verified after a prior transfer", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
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

        expect(await phygitalAsset.verifiedOwnership(phygitalId)).to.equal(
          true
        );

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            phygitalId,
            false
          )
        ).not.to.be.reverted;

        expect(await phygitalAsset.verifiedOwnership(phygitalId)).to.equal(
          false
        );

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
          collectionOwner.transfer(
            phygitalOwner.universalProfileAddress,
            phygitalId,
            false
          )
        ).not.to.be.reverted;

        expect(await phygitalAsset.verifiedOwnership(phygitalId)).to.equal(
          false
        );
      });
    });
  });

  describe("function verifyOwnershipAfterTransfer(bytes32 phygitalId, bytes memory phygitalSignature) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetHasAlreadyAVerifiedOwnership if the phygital ownership is already verified (after mint)", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
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
          phygitalAsset,
          "PhygitalAssetHasAlreadyAVerifiedOwnership"
        );
      });

      it("Should revert with the the custom error PhygitalAssetHasAlreadyAVerifiedOwnership if the phygital ownership is already verified (after transfer)", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
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
          phygitalAsset,
          "PhygitalAssetHasAlreadyAVerifiedOwnership"
        );
      });

      it("Should pass after a prior transfer", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
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

        expect(await phygitalAsset.verifiedOwnership(phygitalId)).to.equal(
          false
        );

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

        expect(await phygitalAsset.verifiedOwnership(phygitalId)).to.equal(
          true
        );
      });

      it("Should revert with the the custom error LSP8NonExistentTokenId if the phygital id has not been minted yet", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
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
          phygitalAsset,
          "LSP8NonExistentTokenId"
        );
      });

      it("Should revert with the the custom error LSP8NonExistentTokenId if the phygital id does not exist", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
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
          phygitalAsset,
          "LSP8NonExistentTokenId"
        );
      });

      it("Should revert with the the custom error LSP8NotTokenOwner if the msg.sender is not the current phygital owner", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
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
        ).to.be.revertedWithCustomError(phygitalAsset, "LSP8NotTokenOwner");
      });
    });

    it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consquence: msg.sender is not the phygital owner", async function () {
      const { phygitalAsset, collectionOwner, phygitalOwner } =
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
        phygitalAsset,
        "PhygitalAssetOwnershipVerificationFailed"
      );
    });
  });
});
