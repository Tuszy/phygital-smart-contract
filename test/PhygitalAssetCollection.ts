import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getVerificationDataForPhygital,
  merkleTreeLSP2JSONURL,
  phygitalAssetCollectionLSP4MetadataJSONURL,
} from "../test-data/merkle-tree";

import { merkleTreeRoot } from "../test-data/merkle-tree";
import { getUniversalProfiles } from "../test-data/universal-profile";

// see schemas/PhygitalAssetCollection.json
const PhygitalAssetCollectionMerkleTreeURI =
  "0x931b4f026a670558cbd3aeba98023d97e4910a7f5be2441e3f9ec1c5c5a1001f";
const LSP4TokenName =
  "0xdeba1e292f8ba88238e10ab3c7f88bd4be4fac56cad5194b6ecceaf653468af1";
const LSP4TokenSymbol =
  "0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756";
const LSP4Metadata =
  "0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e";
const LSP8TokenIdTypeKey =
  "0x715f248956de7ce65e94d9d836bfead479f7e70d69b718d47bfe7b00e05b4fe4";
const LSP8TokenIdTypeAddress = 4;

describe("PhygitalAssetCollection", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const merkleRootOfCollection = merkleTreeRoot;

    const phygitalAssetCollectionName = "Sneaker";
    const phygitalAssetCollectionSymbol = "SNKR";

    const phygitalCollectionMerkleTreeJSONURL = merkleTreeLSP2JSONURL;

    const PhygitalAssetCollection = await ethers.getContractFactory(
      "PhygitalAssetCollection"
    );
    const phygitalAssetCollection = await PhygitalAssetCollection.deploy(
      merkleRootOfCollection,
      phygitalCollectionMerkleTreeJSONURL,
      phygitalAssetCollectionName,
      phygitalAssetCollectionSymbol,
      phygitalAssetCollectionLSP4MetadataJSONURL,
      owner.address
    );

    const [collectionOwner, phygitalOwner] = await getUniversalProfiles(
      phygitalAssetCollection
    );

    return {
      phygitalAssetCollection,
      phygitalAssetCollectionName,
      phygitalAssetCollectionSymbol,
      phygitalCollectionMerkleTreeJSONURL,
      phygitalAssetCollectionLSP4MetadataJSONURL,
      merkleRootOfCollection,
      collectionOwner,
      phygitalOwner,
    };
  }

  describe("Deployment", function () {
    it("Should set the right merkleRootOfCollection", async function () {
      const { phygitalAssetCollection, merkleRootOfCollection } =
        await loadFixture(deployFixture);

      expect(await phygitalAssetCollection.merkleRootOfCollection()).to.equal(
        merkleRootOfCollection
      );
    });

    it("Should set the right phygital asset name", async function () {
      const { phygitalAssetCollection, phygitalAssetCollectionName } =
        await loadFixture(deployFixture);

      expect(
        ethers.toUtf8String(
          await phygitalAssetCollection.getData(LSP4TokenName)
        )
      ).to.equal(phygitalAssetCollectionName);
    });

    it("Should set the right phygital asset symbol", async function () {
      const { phygitalAssetCollection, phygitalAssetCollectionSymbol } =
        await loadFixture(deployFixture);

      expect(
        ethers.toUtf8String(
          await phygitalAssetCollection.getData(LSP4TokenSymbol)
        )
      ).to.equal(phygitalAssetCollectionSymbol);
    });

    it("Should set the right phygital collection merkle tree json url", async function () {
      const { phygitalAssetCollection, phygitalCollectionMerkleTreeJSONURL } =
        await loadFixture(deployFixture);

      expect(
        await phygitalAssetCollection.getData(
          PhygitalAssetCollectionMerkleTreeURI
        )
      ).to.equal(phygitalCollectionMerkleTreeJSONURL);
    });

    it("Should set the right lsp4 metadata json url", async function () {
      const {
        phygitalAssetCollection,
        phygitalAssetCollectionLSP4MetadataJSONURL,
      } = await loadFixture(deployFixture);

      expect(await phygitalAssetCollection.getData(LSP4Metadata)).to.equal(
        phygitalAssetCollectionLSP4MetadataJSONURL
      );
    });

    it("Should set the token id type to address", async function () {
      const { phygitalAssetCollection } = await loadFixture(deployFixture);

      expect(
        await phygitalAssetCollection.getData(LSP8TokenIdTypeKey)
      ).to.equal(BigInt(LSP8TokenIdTypeAddress));
    });

    it("Should set the right owner", async function () {
      const { phygitalAssetCollection, collectionOwner } = await loadFixture(
        deployFixture
      );

      expect(await phygitalAssetCollection.owner()).to.equal(
        collectionOwner.universalProfileOwner.address
      );
    });
  });

  describe("function mint(address phygitalOwner, bytes32 phygitalId, uint phygitalIndex, bytes memory phygitalSignature, bytes32[] memory merkleProofOfCollection, bool force) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consequence: msg.sender (EOA) is not the phygital owner", async function () {
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
          phygitalAssetCollection
            .connect(phygitalOwner.universalProfileOwner)
            .mint(
              phygitalId,
              phygitalIndex,
              phygitalSignature,
              merkleProof,
              false
            )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "PhygitalAssetOwnershipVerificationFailed"
        );
      });

      it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consquence: msg.sender (universal profile) is not the phygital owner", async function () {
        const { phygitalAssetCollection, collectionOwner, phygitalOwner } =
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
          phygitalAssetCollection,
          "PhygitalAssetOwnershipVerificationFailed"
        );
      });

      it("Should revert with the the custom error PhygitalAssetIsNotPartOfCollection if the phygital is not part of the collection (invalid merkle proof)", async function () {
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
            phygitalIndex + 1,
            phygitalSignature,
            merkleProof,
            false
          )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "PhygitalAssetIsNotPartOfCollection"
        );
      });

      it("Should revert with the the custom error LSP8NotifyTokenReceiverIsEOA if the phygital owner is not a universal profile and force is set to false", async function () {
        const { phygitalAssetCollection, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalIndex = 0;
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalIndex,
            phygitalOwner.universalProfileOwner.address
          );

        await expect(
          phygitalAssetCollection
            .connect(phygitalOwner.universalProfileOwner)
            .mint(
              phygitalId,
              phygitalIndex,
              phygitalSignature,
              merkleProof,
              false
            )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "LSP8NotifyTokenReceiverIsEOA"
        );
      });
    });

    it("Should pass if the phygital owner is not a universal profile but force is set to true", async function () {
      const { phygitalAssetCollection, phygitalOwner } = await loadFixture(
        deployFixture
      );

      const phygitalIndex = 0;
      const { phygitalId, phygitalSignature, merkleProof } =
        getVerificationDataForPhygital(
          phygitalIndex,
          phygitalOwner.universalProfileOwner.address
        );

      await expect(
        phygitalAssetCollection
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
        phygitalOwner.mint(
          phygitalId,
          phygitalIndex,
          phygitalSignature,
          merkleProof,
          false
        )
      ).to.be.revertedWithCustomError(
        phygitalAssetCollection,
        "LSP8TokenIdAlreadyMinted"
      );
    });

    describe("Events", function () {
      it("Should emit the Transfer event on mint", async function () {
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
        )
          .to.emit(phygitalAssetCollection, "Transfer")
          .withArgs(
            phygitalOwner.universalProfileAddress,
            ethers.ZeroAddress,
            phygitalOwner.universalProfileAddress,
            anyValue,
            false,
            anyValue
          );
      });
    });
  });

  describe("function transfer(address from, address to, bytes32 tokenId, bool force, bytes memory data) public virtual override", function () {
    describe("Validations", function () {
      it("Should pass if it is the first transfer after mint", async function () {
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

        const tokenId = ethers.zeroPadValue(
          await phygitalAssetCollection.phygitalIdToContractAddress(phygitalId),
          32
        );

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            tokenId,
            false
          )
        ).not.to.be.reverted;
      });

      it("Should revert with the the custom error PhygitalAssetHasAnUnverifiedOwnership if the phygital ownership is unverified", async function () {
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

        const tokenId = ethers.zeroPadValue(
          await phygitalAssetCollection.phygitalIdToContractAddress(phygitalId),
          32
        );

        await expect(
          phygitalOwner.transfer(
            collectionOwner.universalProfileAddress,
            tokenId,
            false
          )
        ).not.to.be.reverted;

        await expect(
          collectionOwner.transfer(
            phygitalOwner.universalProfileAddress,
            tokenId,
            false
          )
        ).to.be.revertedWithCustomError(
          phygitalAssetCollection,
          "PhygitalAssetHasAnUnverifiedOwnership"
        );
      });

      it("Should pass if the ownership has been verified after a prior transfer", async function () {
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

        const phygitalContractAddress =
          await phygitalAssetCollection.phygitalIdToContractAddress(phygitalId);
        const tokenId = ethers.zeroPadValue(
          await phygitalAssetCollection.phygitalIdToContractAddress(phygitalId),
          32
        );

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
            phygitalContractAddress,
            phygitalSignature2
          )
        ).not.to.be.reverted;

        await expect(
          collectionOwner.transfer(
            phygitalOwner.universalProfileAddress,
            tokenId,
            false
          )
        ).not.to.be.reverted;
      });
    });
  });
});
