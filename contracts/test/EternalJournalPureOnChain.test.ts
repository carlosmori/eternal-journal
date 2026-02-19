import { expect } from 'chai';
import { ethers } from 'hardhat';
import { EternalJournalPureOnChain } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('EternalJournalPureOnChain', () => {
  let contract: EternalJournalPureOnChain;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const FEE = ethers.parseEther('0.00005');
  const sampleCiphertext = ethers.toUtf8Bytes('encrypted-journal-entry-data');

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('EternalJournalPureOnChain');
    contract = await Factory.deploy(owner.address);
  });

  describe('Deployment', () => {
    it('should set the correct owner', async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it('should set the default fee', async () => {
      expect(await contract.fee()).to.equal(FEE);
    });

    it('should have MAX_ENTRY_BYTES = 1024', async () => {
      expect(await contract.MAX_ENTRY_BYTES()).to.equal(1024);
    });
  });

  describe('addEntry', () => {
    it('should add an entry with correct fee', async () => {
      await expect(contract.connect(user1).addEntry(sampleCiphertext, { value: FEE }))
        .to.emit(contract, 'NewEntry')
        .withArgs(user1.address, 0, () => true);

      expect(await contract.getEntryCount(user1.address)).to.equal(1);
    });

    it('should revert with incorrect fee', async () => {
      await expect(
        contract.connect(user1).addEntry(sampleCiphertext, { value: 0 }),
      ).to.be.revertedWith('Incorrect fee');
    });

    it('should revert with overpayment', async () => {
      await expect(
        contract.connect(user1).addEntry(sampleCiphertext, { value: FEE + 1n }),
      ).to.be.revertedWith('Incorrect fee');
    });

    it('should revert when ciphertext exceeds MAX_ENTRY_BYTES', async () => {
      const oversized = new Uint8Array(1025);
      await expect(contract.connect(user1).addEntry(oversized, { value: FEE })).to.be.revertedWith(
        'Entry too large',
      );
    });

    it('should store multiple entries per user', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      expect(await contract.getEntryCount(user1.address)).to.equal(2);
    });

    it('should isolate entries between users', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      await contract.connect(user2).addEntry(sampleCiphertext, { value: FEE });
      expect(await contract.getEntryCount(user1.address)).to.equal(1);
      expect(await contract.getEntryCount(user2.address)).to.equal(1);
    });
  });

  describe('getEntry', () => {
    it('should return the stored entry data', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      const entry = await contract.getEntry(user1.address, 0);
      expect(ethers.toUtf8String(entry.ciphertext)).to.equal('encrypted-journal-entry-data');
      expect(entry.timestamp).to.be.greaterThan(0);
    });

    it('should revert for out-of-range index', async () => {
      await expect(contract.getEntry(user1.address, 0)).to.be.revertedWith('Index out of range');
    });
  });

  describe('getEntryCount', () => {
    it('should return 0 for a user with no entries', async () => {
      expect(await contract.getEntryCount(user1.address)).to.equal(0);
    });
  });

  describe('setFee', () => {
    it('should allow owner to update fee', async () => {
      const newFee = ethers.parseEther('0.0001');
      await contract.connect(owner).setFee(newFee);
      expect(await contract.fee()).to.equal(newFee);
    });

    it('should revert if non-owner calls setFee', async () => {
      await expect(contract.connect(user1).setFee(0)).to.be.revertedWithCustomError(
        contract,
        'OwnableUnauthorizedAccount',
      );
    });

    it('should enforce updated fee on addEntry', async () => {
      const newFee = ethers.parseEther('0.001');
      await contract.connect(owner).setFee(newFee);
      await expect(
        contract.connect(user1).addEntry(sampleCiphertext, { value: FEE }),
      ).to.be.revertedWith('Incorrect fee');
      await contract.connect(user1).addEntry(sampleCiphertext, { value: newFee });
      expect(await contract.getEntryCount(user1.address)).to.equal(1);
    });
  });

  describe('withdraw', () => {
    it('should allow owner to withdraw accumulated fees', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      await contract.connect(user2).addEntry(sampleCiphertext, { value: FEE });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await contract.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(FEE * 2n);
    });

    it('should revert if non-owner calls withdraw', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      await expect(contract.connect(user1).withdraw()).to.be.revertedWithCustomError(
        contract,
        'OwnableUnauthorizedAccount',
      );
    });

    it('should revert when no funds to withdraw', async () => {
      await expect(contract.connect(owner).withdraw()).to.be.revertedWith('No funds');
    });
  });
});
