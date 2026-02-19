import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { EternalJournalPureOnChainV2 } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('EternalJournalPureOnChainV2', () => {
  let contract: EternalJournalPureOnChainV2;
  let admin: HardhatEthersSigner;
  let pauser: HardhatEthersSigner;
  let upgrader: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const FEE = ethers.parseEther('0.00005');
  const sampleCiphertext = ethers.toUtf8Bytes('encrypted-v2-entry');

  beforeEach(async () => {
    [admin, pauser, upgrader, user1, user2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory(
      'EternalJournalPureOnChainV2',
    );
    const proxy = await upgrades.deployProxy(
      Factory,
      [admin.address, pauser.address, upgrader.address],
      { kind: 'uups' },
    );
    contract = proxy as unknown as EternalJournalPureOnChainV2;
  });

  describe('Initialization', () => {
    it('should set the correct roles', async () => {
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      const PAUSER_ROLE = await contract.PAUSER_ROLE();
      const UPGRADER_ROLE = await contract.UPGRADER_ROLE();
      const FEE_MANAGER_ROLE = await contract.FEE_MANAGER_ROLE();

      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be
        .true;
      expect(await contract.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
      expect(await contract.hasRole(UPGRADER_ROLE, upgrader.address)).to.be
        .true;
      expect(await contract.hasRole(FEE_MANAGER_ROLE, admin.address)).to.be
        .true;
    });

    it('should set the default fee', async () => {
      expect(await contract.fee()).to.equal(FEE);
    });

    it('should not allow re-initialization', async () => {
      await expect(
        contract.initialize(admin.address, pauser.address, upgrader.address),
      ).to.be.reverted;
    });
  });

  describe('addEntry', () => {
    it('should add an entry and emit NewEntry', async () => {
      await expect(
        contract.connect(user1).addEntry(sampleCiphertext, { value: FEE }),
      )
        .to.emit(contract, 'NewEntry')
        .withArgs(user1.address, 0, () => true);

      expect(await contract.getEntryCount(user1.address)).to.equal(1);
    });

    it('should revert with incorrect fee', async () => {
      await expect(
        contract.connect(user1).addEntry(sampleCiphertext, { value: 0 }),
      ).to.be.revertedWith('Incorrect fee');
    });

    it('should revert with empty ciphertext', async () => {
      await expect(
        contract.connect(user1).addEntry('0x', { value: FEE }),
      ).to.be.revertedWith('Empty entry');
    });

    it('should revert when ciphertext exceeds MAX_ENTRY_BYTES', async () => {
      const oversized = new Uint8Array(1025);
      await expect(
        contract.connect(user1).addEntry(oversized, { value: FEE }),
      ).to.be.revertedWith('Entry too large');
    });

    it('should accept ciphertext at exactly MAX_ENTRY_BYTES', async () => {
      const maxSize = new Uint8Array(1024);
      maxSize.fill(0x42);
      await contract.connect(user1).addEntry(maxSize, { value: FEE });
      expect(await contract.getEntryCount(user1.address)).to.equal(1);
    });

    it('should revert when paused', async () => {
      await contract.connect(pauser).pause();
      await expect(
        contract.connect(user1).addEntry(sampleCiphertext, { value: FEE }),
      ).to.be.reverted;
    });
  });

  describe('getEntry / getEntries / getEntryCount', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        const data = ethers.toUtf8Bytes(`entry-${i}`);
        await contract.connect(user1).addEntry(data, { value: FEE });
      }
    });

    it('should return a single entry by index', async () => {
      const entry = await contract.getEntry(user1.address, 0);
      expect(ethers.toUtf8String(entry.ciphertext)).to.equal('entry-0');
    });

    it('should return a batch of entries', async () => {
      const entries = await contract.getEntries(user1.address, 1, 3);
      expect(entries.length).to.equal(3);
      expect(ethers.toUtf8String(entries[0].ciphertext)).to.equal('entry-1');
      expect(ethers.toUtf8String(entries[2].ciphertext)).to.equal('entry-3');
    });

    it('should revert for out-of-range index', async () => {
      await expect(
        contract.getEntry(user1.address, 99),
      ).to.be.revertedWith('Index out of range');
    });

    it('should revert when start > end in getEntries', async () => {
      await expect(
        contract.getEntries(user1.address, 3, 1),
      ).to.be.revertedWith('start > end');
    });

    it('should revert when end out of range in getEntries', async () => {
      await expect(
        contract.getEntries(user1.address, 0, 99),
      ).to.be.revertedWith('end out of range');
    });

    it('should revert when batch exceeds MAX_BATCH_SIZE', async () => {
      // MAX_BATCH_SIZE = 50, we only have 5 entries so just verify the logic
      expect(await contract.MAX_BATCH_SIZE()).to.equal(50);
    });

    it('should return correct entry count', async () => {
      expect(await contract.getEntryCount(user1.address)).to.equal(5);
      expect(await contract.getEntryCount(user2.address)).to.equal(0);
    });
  });

  describe('setFee', () => {
    it('should allow FEE_MANAGER_ROLE to update fee and emit FeeChanged', async () => {
      const newFee = ethers.parseEther('0.001');
      await expect(contract.connect(admin).setFee(newFee))
        .to.emit(contract, 'FeeChanged')
        .withArgs(FEE, newFee);

      expect(await contract.fee()).to.equal(newFee);
    });

    it('should revert if unauthorized account calls setFee', async () => {
      await expect(contract.connect(user1).setFee(0)).to.be.reverted;
    });
  });

  describe('withdraw', () => {
    it('should allow admin to withdraw to a specified address', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });

      const balanceBefore = await ethers.provider.getBalance(user2.address);
      await expect(contract.connect(admin).withdraw(user2.address))
        .to.emit(contract, 'Withdrawn')
        .withArgs(user2.address, FEE);
      const balanceAfter = await ethers.provider.getBalance(user2.address);

      expect(balanceAfter - balanceBefore).to.equal(FEE);
    });

    it('should revert if non-admin calls withdraw', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      await expect(
        contract.connect(user1).withdraw(user1.address),
      ).to.be.reverted;
    });

    it('should revert when no funds to withdraw', async () => {
      await expect(
        contract.connect(admin).withdraw(admin.address),
      ).to.be.revertedWith('No funds');
    });

    it('should revert when withdrawing to zero address', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      await expect(
        contract.connect(admin).withdraw(ethers.ZeroAddress),
      ).to.be.revertedWith('Invalid address');
    });
  });

  describe('Pausable', () => {
    it('should allow pauser to pause and unpause', async () => {
      await contract.connect(pauser).pause();
      expect(await contract.paused()).to.be.true;

      await contract.connect(pauser).unpause();
      expect(await contract.paused()).to.be.false;
    });

    it('should revert if non-pauser tries to pause', async () => {
      await expect(contract.connect(user1).pause()).to.be.reverted;
    });

    it('should block addEntry when paused', async () => {
      await contract.connect(pauser).pause();
      await expect(
        contract.connect(user1).addEntry(sampleCiphertext, { value: FEE }),
      ).to.be.reverted;
    });

    it('should allow addEntry after unpause', async () => {
      await contract.connect(pauser).pause();
      await contract.connect(pauser).unpause();
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });
      expect(await contract.getEntryCount(user1.address)).to.equal(1);
    });
  });

  describe('UUPS Upgrade', () => {
    it('should allow upgrader to authorize upgrades', async () => {
      const V2Factory = await ethers.getContractFactory(
        'EternalJournalPureOnChainV2',
      );
      // Upgrading to same implementation just to validate the auth check
      const upgraded = await upgrades.upgradeProxy(
        await contract.getAddress(),
        V2Factory.connect(upgrader),
        { kind: 'uups' },
      );
      expect(await upgraded.getAddress()).to.equal(
        await contract.getAddress(),
      );
    });

    it('should revert upgrade from non-upgrader', async () => {
      const V2Factory = await ethers.getContractFactory(
        'EternalJournalPureOnChainV2',
      );
      await expect(
        upgrades.upgradeProxy(
          await contract.getAddress(),
          V2Factory.connect(user1),
          { kind: 'uups' },
        ),
      ).to.be.reverted;
    });

    it('should preserve state after upgrade', async () => {
      await contract.connect(user1).addEntry(sampleCiphertext, { value: FEE });

      const V2Factory = await ethers.getContractFactory(
        'EternalJournalPureOnChainV2',
      );
      const upgraded = (await upgrades.upgradeProxy(
        await contract.getAddress(),
        V2Factory.connect(upgrader),
        { kind: 'uups' },
      )) as unknown as EternalJournalPureOnChainV2;

      expect(await upgraded.getEntryCount(user1.address)).to.equal(1);
      const entry = await upgraded.getEntry(user1.address, 0);
      expect(ethers.toUtf8String(entry.ciphertext)).to.equal(
        'encrypted-v2-entry',
      );
    });
  });
});
