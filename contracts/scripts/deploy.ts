import { ethers } from 'hardhat';

async function main() {
  // Owner address (Safe multisig in production, deployer in testnet)
  // Change to your Safe multisig address before deploying to mainnet
  const OWNER_ADDRESS =
    process.env.OWNER_ADDRESS || (await ethers.provider.getSigner()).address;

  console.log('Deploying EternalJournalPureOnChain...');
  console.log('Owner:', OWNER_ADDRESS);

  const EternalJournal = await ethers.getContractFactory(
    'EternalJournalPureOnChain',
  );
  const journal = await EternalJournal.deploy(OWNER_ADDRESS);

  await journal.waitForDeployment();

  const address = await journal.getAddress();
  console.log('EternalJournalPureOnChain deployed to:', address);
  console.log('');
  console.log(
    'Update ETERNAL_JOURNAL_ADDRESS in apps/web/src/lib/contract.ts with:',
  );
  console.log(`  "${address}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
