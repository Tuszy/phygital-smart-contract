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
  phygitalAssetLSP8BaseURI,
  merkleTree,
  phygitalCollection,
} from "../test-util/phygital-collection";

// Universal Profile
import { getUniversalProfiles } from "../test-util/universal-profile";

// Constants
import {
  ERC725YDataKeys,
  LSP8_TOKEN_ID_TYPES,
  INTERFACE_IDS,
} from "@lukso/lsp-smart-contracts";

// Interface Id
import { interfaceIdOfPhygitalAsset } from "../test-util/validation";

// see schemas/PhygitalAsset.json
const PhygitalAssetCollectionURI =
  "0x4eff76d745d12fd5e5f7b38e8f396dd0d099124739e69a289ca1faa7ebc53768";
const LSP4TokenType =
  "0xe0261fa95db2eb3b5439bd033cda66d56b96f92f243a8228fd87550ed7bdfdb3";
const LSP4TokenTypeCollection = 2;

describe("PhygitalAsset", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const merkleRootOfCollection = merkleTree.root;

    const phygitalAssetName = "Sneaker";
    const phygitalAssetSymbol = "SNKR";

    const PhygitalAsset = await ethers.getContractFactory("PhygitalAsset");
    const phygitalAsset = await PhygitalAsset.deploy(
      merkleRootOfCollection,
      phygitalCollectionJSONURL,
      phygitalAssetName,
      phygitalAssetSymbol,
      phygitalAssetLSP4MetadataJSONURL,
      phygitalAssetLSP8BaseURI,
      owner.address
    );

    const [collectionOwner, phygitalOwner] = await getUniversalProfiles(
      phygitalAsset
    );

    return {
      PhygitalAsset,
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
      ).to.equal(BigInt(LSP8_TOKEN_ID_TYPES.UNIQUE_ID));
    });

    it("Should set the right metadata base uri", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(
        await phygitalAsset.getData(
          ERC725YDataKeys.LSP8.LSP8TokenMetadataBaseURI
        )
      ).to.equal(phygitalAssetLSP8BaseURI);
    });

    it("Should set the right token type", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(await phygitalAsset.getData(LSP4TokenType)).to.equal(
        BigInt(LSP4TokenTypeCollection)
      );
    });

    it("Should set the creators array length to 1", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(
        await phygitalAsset.getData(
          ERC725YDataKeys.LSP4["LSP4Creators[]"].length
        )
      ).to.equal(ethers.zeroPadValue(ethers.toBeHex(1), 16));
    });

    it("Should add the owner to the creators array", async function () {
      const { phygitalAsset, collectionOwner } = await loadFixture(
        deployFixture
      );

      expect(
        await phygitalAsset.getData(
          ethers.concat([
            ERC725YDataKeys.LSP4["LSP4Creators[]"].index,
            ethers.zeroPadValue(ethers.toBeHex(0), 16),
          ])
        )
      ).to.equal(collectionOwner.universalProfileOwner.address.toLowerCase());
    });

    it("Should add the owner to the creators map", async function () {
      const { phygitalAsset, collectionOwner } = await loadFixture(
        deployFixture
      );

      expect(
        await phygitalAsset.getData(
          ethers.concat([
            ERC725YDataKeys.LSP4.LSP4CreatorsMap,
            collectionOwner.universalProfileOwner.address,
          ])
        )
      ).to.equal(
        ethers.concat([
          INTERFACE_IDS.LSP0ERC725Account,
          ethers.zeroPadValue(ethers.toBeHex(0), 16),
        ])
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

    it("Should allow assigning a universal profile address as the owner", async function () {
      const {
        PhygitalAsset,
        merkleRootOfCollection,
        phygitalAssetName,
        phygitalAssetSymbol,
        collectionOwner,
      } = await loadFixture(deployFixture);

      let phygitalAssetPromise = PhygitalAsset.deploy(
        merkleRootOfCollection,
        phygitalCollectionJSONURL,
        phygitalAssetName,
        phygitalAssetSymbol,
        phygitalAssetLSP4MetadataJSONURL,
        phygitalAssetLSP8BaseURI,
        collectionOwner.universalProfileAddress
      );
      await expect(phygitalAssetPromise).not.to.be.reverted;
      const phygitalAsset = await phygitalAssetPromise;
      expect(await phygitalAsset.owner()).to.equal(
        collectionOwner.universalProfileAddress
      );
    });

    it("Should support PhygitalAsset interface id", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(
        await phygitalAsset.supportsInterface(interfaceIdOfPhygitalAsset)
      ).to.equal(true);
    });

    it("Should support ERC725Y interface id", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(
        await phygitalAsset.supportsInterface(INTERFACE_IDS.ERC725Y)
      ).to.equal(true);
    });

    it("Should support LSP8 interface id", async function () {
      const { phygitalAsset } = await loadFixture(deployFixture);

      expect(
        await phygitalAsset.supportsInterface(
          INTERFACE_IDS.LSP8IdentifiableDigitalAsset
        )
      ).to.equal(true);
    });
  });

  describe("function mint(address phygitalOwner, address phygitalAddress, bytes memory phygitalSignature, bytes32[] memory merkleProofOfCollection, bool force) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consequence: msg.sender (EOA) is not the phygital owner", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalAddress = phygitalCollection[0];
        const { phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalAsset
            .connect(phygitalOwner.universalProfileOwner)
            .mint(phygitalAddress, phygitalSignature, merkleProof, false)
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "PhygitalAssetOwnershipVerificationFailed"
        );
      });

      it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consquence: msg.sender (universal profile) is not the phygital owner", async function () {
        const { phygitalAsset, collectionOwner, phygitalOwner } =
          await loadFixture(deployFixture);

        const phygitalAddress = phygitalCollection[0];
        const { phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          collectionOwner.mint(
            phygitalAddress,
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
            phygitalSignature,
            merkleProof.slice(1),
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileOwner.address
          );

        await expect(
          phygitalAsset
            .connect(phygitalOwner.universalProfileOwner)
            .mint(phygitalAddress, phygitalSignature, merkleProof, false)
        ).to.be.revertedWithCustomError(
          phygitalAsset,
          "LSP8NotifyTokenReceiverIsEOA"
        );
      });
    });

    it("Should pass if the phygital owner is not a universal profile but force is set to true", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

      const phygitalAddress = phygitalCollection[0];
      const { phygitalSignature, merkleProof } = getVerificationDataForPhygital(
        phygitalAddress,
        phygitalOwner.universalProfileOwner.address
      );

      await expect(
        phygitalAsset
          .connect(phygitalOwner.universalProfileOwner)
          .mint(phygitalAddress, phygitalSignature, merkleProof, true)
      ).not.to.be.reverted;
    });

    it("Should pass if the phygital owner is a universal profile and force is set to true", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      const phygitalAddress = phygitalCollection[0];
      const { phygitalSignature, merkleProof } = getVerificationDataForPhygital(
        phygitalAddress,
        phygitalOwner.universalProfileAddress
      );

      await expect(
        phygitalOwner.mint(
          phygitalAddress,
          phygitalSignature,
          merkleProof,
          true
        )
      ).not.to.be.reverted;
    });

    it("Should pass if the phygital owner is a universal profile and force is set to false", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      const phygitalAddress = phygitalCollection[0];
      const { phygitalSignature, merkleProof } = getVerificationDataForPhygital(
        phygitalAddress,
        phygitalOwner.universalProfileAddress
      );

      await expect(
        phygitalOwner.mint(
          phygitalAddress,
          phygitalSignature,
          merkleProof,
          false
        )
      ).not.to.be.reverted;
    });

    it("Should revert with the the custom error LSP8TokenIdAlreadyMinted if the phygital has already been minted", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

      const phygitalAddress = phygitalCollection[0];
      const { phygitalId, phygitalSignature, merkleProof } =
        getVerificationDataForPhygital(
          phygitalAddress,
          phygitalOwner.universalProfileAddress
        );

      await expect(
        phygitalOwner.mint(
          phygitalAddress,
          phygitalSignature,
          merkleProof,
          false
        )
      ).not.to.be.reverted;

      const { phygitalSignature: phygitalSignature2 } =
        getVerificationDataForPhygital(
          phygitalAddress,
          phygitalOwner.universalProfileAddress,
          Number(await phygitalAsset.nonce(phygitalId))
        );

      await expect(
        phygitalOwner.mint(
          phygitalAddress,
          phygitalSignature2,
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
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
        const { phygitalAsset, collectionOwner, phygitalOwner } =
          await loadFixture(deployFixture);

        const phygitalAddress = phygitalCollection[0];
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
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
            phygitalAddress,
            collectionOwner.universalProfileAddress,
            Number(await phygitalAsset.nonce(phygitalId))
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAddress,
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

  describe("function verifyOwnershipAfterTransfer(address phygitalAddress, bytes memory phygitalSignature) public", function () {
    describe("Validations", function () {
      it("Should revert with the the custom error PhygitalAssetHasAlreadyAVerifiedOwnership if the phygital ownership is already verified (after mint)", async function () {
        const { phygitalAsset, phygitalOwner } = await loadFixture(
          deployFixture
        );

        const phygitalAddress = phygitalCollection[0];
        const { phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
            phygitalSignature,
            merkleProof,
            false
          )
        ).not.to.be.reverted;

        await expect(
          phygitalOwner.verifyOwnershipAfterTransfer(
            phygitalAddress,
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
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
            phygitalAddress,
            collectionOwner.universalProfileAddress,
            Number(await phygitalAsset.nonce(phygitalId))
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAddress,
            phygitalSignature2
          )
        ).not.to.be.reverted;

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAddress,
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
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
            phygitalAddress,
            collectionOwner.universalProfileAddress,
            Number(await phygitalAsset.nonce(phygitalId))
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAddress,
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

        const phygitalAddress = phygitalCollection[0];
        const { phygitalId, phygitalSignature, merkleProof } =
          getVerificationDataForPhygital(
            phygitalAddress,
            phygitalOwner.universalProfileAddress
          );

        await expect(
          phygitalOwner.mint(
            phygitalAddress,
            phygitalSignature,
            merkleProof,
            false
          )
        ).not.to.be.reverted;

        const { phygitalSignature: phygitalSignature2 } =
          getVerificationDataForPhygital(
            phygitalAddress,
            collectionOwner.universalProfileAddress,
            Number(await phygitalAsset.nonce(phygitalId))
          );

        await expect(
          collectionOwner.verifyOwnershipAfterTransfer(
            phygitalAddress,
            phygitalSignature2
          )
        ).to.be.revertedWithCustomError(phygitalAsset, "LSP8NotTokenOwner");
      });
    });

    it("Should revert with the the custom error PhygitalAssetOwnershipVerificationFailed if the phygital signature is wrong - consquence: msg.sender is not the phygital owner", async function () {
      const { phygitalAsset, phygitalOwner, collectionOwner } =
        await loadFixture(deployFixture);

      const phygitalAddress = phygitalCollection[0];
      const { phygitalId, phygitalSignature, merkleProof } =
        getVerificationDataForPhygital(
          phygitalAddress,
          phygitalOwner.universalProfileAddress
        );

      await expect(
        phygitalOwner.mint(
          phygitalAddress,
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
          phygitalAddress,
          phygitalSignature // wrong signature
        )
      ).to.be.revertedWithCustomError(
        phygitalAsset,
        "PhygitalAssetOwnershipVerificationFailed"
      );
    });
  });
});
