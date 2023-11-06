//Crypto
import { ethers } from "hardhat";

// Test
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";

// Merkle Tree
import {
  phygitalCollectionJSONURL,
  merkleRoot,
  phygitalAssetLSP4MetadataJSONURL,
} from "../test-data/merkle-tree";

// Universal Profile
import { getUniversalProfiles } from "../test-data/universal-profile";
import {
  throwIfAddressIsNotAERC725Account,
  throwIfAddressIsNotALSP6KeyManager,
  throwIfAddressIsNotAPhygitalAsset,
} from "../test-data/validation";

describe("Validation", function () {
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

  describe("throwIfAddressIsNotAERC725Account(controllerWallet: Signer, address: string)", function () {
    it("Should pass if the address is of type LSP0ERC725Account", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      await expect(
        throwIfAddressIsNotAERC725Account(
          phygitalOwner.universalProfileOwner,
          phygitalOwner.universalProfileAddress
        )
      ).not.to.be.rejected;
    });

    it("Should throw if the address is invalid", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      const invalidAddress = "ThisIsAInvalidTestAddress";
      await expect(
        throwIfAddressIsNotAERC725Account(
          phygitalOwner.universalProfileOwner,
          invalidAddress
        )
      ).to.be.rejectedWith(`${invalidAddress} is an invalid address`);
    });

    it("Should throw if the address is an EOA", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      await expect(
        throwIfAddressIsNotAERC725Account(
          phygitalOwner.universalProfileOwner,
          phygitalOwner.universalProfileOwner.address
        )
      ).to.be.rejectedWith(
        `${phygitalOwner.universalProfileOwner.address} is not an instance of type LSP0ERC725Account`
      );
    });

    it("Should throw if the address is a contract but not of type LSP0ERC725Account", async function () {
      const { phygitalOwner, phygitalAsset } = await loadFixture(deployFixture);

      const phygitalAssetContractAddress = await phygitalAsset.getAddress();
      await expect(
        throwIfAddressIsNotAERC725Account(
          phygitalOwner.universalProfileOwner,
          phygitalAssetContractAddress
        )
      ).to.be.rejectedWith(
        `${phygitalAssetContractAddress} is not an instance of type LSP0ERC725Account`
      );
    });
  });

  describe("throwIfAddressIsNotALSP6KeyManager(controllerWallet: Signer, address: string)", function () {
    it("Should pass if the address is of type LSP6KeyManager", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      await expect(
        throwIfAddressIsNotALSP6KeyManager(
          phygitalOwner.universalProfileOwner,
          phygitalOwner.universalProfile.LSP6KeyManager.address
        )
      ).not.to.be.rejected;
    });

    it("Should throw if the address is invalid", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      const invalidAddress = "ThisIsAInvalidTestAddress";
      await expect(
        throwIfAddressIsNotALSP6KeyManager(
          phygitalOwner.universalProfileOwner,
          invalidAddress
        )
      ).to.be.rejectedWith(`${invalidAddress} is an invalid address`);
    });

    it("Should throw if the address is an EOA", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      await expect(
        throwIfAddressIsNotALSP6KeyManager(
          phygitalOwner.universalProfileOwner,
          phygitalOwner.universalProfileOwner.address
        )
      ).to.be.rejectedWith(
        `${phygitalOwner.universalProfileOwner.address} is not an instance of type LSP6KeyManager`
      );
    });

    it("Should throw if the address is a contract but not of type LSP6KeyManager", async function () {
      const { phygitalOwner, phygitalAsset } = await loadFixture(deployFixture);

      const phygitalAssetContractAddress = await phygitalAsset.getAddress();
      await expect(
        throwIfAddressIsNotALSP6KeyManager(
          phygitalOwner.universalProfileOwner,
          phygitalAssetContractAddress
        )
      ).to.be.rejectedWith(
        `${phygitalAssetContractAddress} is not an instance of type LSP6KeyManager`
      );
    });
  });

  describe("throwIfAddressIsNotAPhygitalAsset(controllerWallet: Signer, address: string)", function () {
    it("Should pass if the address is of type PhygitalAsset", async function () {
      const { phygitalAsset, phygitalOwner } = await loadFixture(deployFixture);

      const phygitalAssetContractAddress = await phygitalAsset.getAddress();
      await expect(
        throwIfAddressIsNotAPhygitalAsset(
          phygitalOwner.universalProfileOwner,
          phygitalAssetContractAddress
        )
      ).not.to.be.rejected;
    });

    it("Should throw if the address is invalid", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      const invalidAddress = "ThisIsAInvalidTestAddress";
      await expect(
        throwIfAddressIsNotAPhygitalAsset(
          phygitalOwner.universalProfileOwner,
          invalidAddress
        )
      ).to.be.rejectedWith(`${invalidAddress} is an invalid address`);
    });

    it("Should throw if the address is an EOA", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      await expect(
        throwIfAddressIsNotAPhygitalAsset(
          phygitalOwner.universalProfileOwner,
          phygitalOwner.universalProfileOwner.address
        )
      ).to.be.rejectedWith(
        `${phygitalOwner.universalProfileOwner.address} is not an instance of type PhygitalAsset`
      );
    });

    it("Should throw if the address is a contract but not of type PhygitalAsset", async function () {
      const { phygitalOwner } = await loadFixture(deployFixture);

      await expect(
        throwIfAddressIsNotAPhygitalAsset(
          phygitalOwner.universalProfileOwner,
          phygitalOwner.universalProfile.LSP6KeyManager.address
        )
      ).to.be.rejectedWith(
        `${phygitalOwner.universalProfile.LSP6KeyManager.address} is not an instance of type PhygitalAsset`
      );
    });
  });
});
