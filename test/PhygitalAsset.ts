// Crypto
import { ethers } from "hardhat";

// Test
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";

// Merkle Tree
import {
  getVerificationDataForPhygital,
  phygitalCollectionJSONURL,
  phygitalAssetLSP4MetadataJSONURL,
} from "../test-data/merkle-tree";
import { merkleRoot } from "../test-data/merkle-tree";

// Universal Profile
import { getUniversalProfiles } from "../test-data/universal-profile";

// Constants
import {
  ERC725YDataKeys,
  LSP8_TOKEN_ID_TYPES,
} from "@lukso/lsp-smart-contracts";

// see schemas/PhygitalAsset.json
const PhygitalAssetCollectionURI =
  "0x4eff76d745d12fd5e5f7b38e8f396dd0d099124739e69a289ca1faa7ebc53768";

describe("PhygitalAsset", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const merkleRootOfCollection = merkleRoot;

    const phygitalAssetName = "Sneaker";
    const phygitalAssetSymbol = "SNKR";

    const PhygitalAsset = await ethers.getContractFactory("PhygitalAsset");
    const phygitalAsset = await PhygitalAsset.deploy(
      merkleRootOfCollection,
      phygitalCollectionJSONURL,
      phygitalAssetName,
      phygitalAssetSymbol,
      phygitalAssetLSP4MetadataJSONURL,
      owner.address
    );

    const [collectionOwner, phygitalOwner] = await getUniversalProfiles(
      phygitalAsset
    );

    return {
      phygitalAsset,
      phygitalAssetName,
      phygitalAssetSymbol,
      phygitalCollectionJSONURL,
      phygitalAssetLSP4MetadataJSONURL,
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
        ethers.toUtf8String(
          await phygitalAsset.getData(ERC725YDataKeys.LSP4.LSP4TokenName)
        )
      ).to.equal(phygitalAssetName);
    });

    it("Should set the right phygital asset symbol", async function () {
      const { phygitalAsset, phygitalAssetSymbol } = await loadFixture(
        deployFixture
      );

      expect(
        ethers.toUtf8String(
          await phygitalAsset.getData(ERC725YDataKeys.LSP4.LSP4TokenSymbol)
        )
      ).to.equal(phygitalAssetSymbol);
    });

    it("Should set the right phygital collection json url", async function () {
      const { phygitalAsset, phygitalCollectionJSONURL } = await loadFixture(
        deployFixture
      );

      expect(await phygitalAsset.getData(PhygitalAssetCollectionURI)).to.equal(
        phygitalCollectionJSONURL
      );
    });

    it("Should set the right lsp4 metadata json url", async function () {
      const { phygitalAsset, phygitalAssetLSP4MetadataJSONURL } =
        await loadFixture(deployFixture);

      expect(
        await phygitalAsset.getData(ERC725YDataKeys.LSP4.LSP4Metadata)
      ).to.equal(phygitalAssetLSP4MetadataJSONURL);
    });

    it("Should set the token id type to address", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(
        await phygitalAsset.getData(ERC725YDataKeys.LSP8.LSP8TokenIdType)
      ).to.equal(BigInt(LSP8_TOKEN_ID_TYPES.HASH));
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
        const { collectionOwner, phygitalOwner } = await loadFixture(
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
        const { collectionOwner, phygitalOwner } = await loadFixture(
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
          collectionOwner.transfer(
            phygitalOwner.universalProfileAddress,
            phygitalId,
            false
          )
        ).not.to.be.reverted;
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
        const { phygitalAsset, phygitalOwner, collectionOwner } =
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
        const { phygitalAsset, phygitalOwner, collectionOwner } =
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

      it("Should revert with the the custom error LSP8NotTokenOwner if the msg.sender is not the current phygital owner", async function () {
        const { phygitalAsset, phygitalOwner, collectionOwner } =
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
      const { phygitalAsset, phygitalOwner, collectionOwner } =
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
