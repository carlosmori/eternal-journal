import { ethers, upgrades } from 'hardhat';

async function main() {
  // Owner address (Safe multisig in production, deployer in testnet)
  // Used as DEFAULT_ADMIN_ROLE, PAUSER_ROLE, UPGRADER_ROLE, and FEE_MANAGER_ROLE
  const OWNER_ADDRESS =
    process.env.OWNER_ADDRESS || (await ethers.provider.getSigner()).address;

  console.log('Deploying EternalJournalPureOnChainV2 (UUPS proxy)...');
  console.log('Admin / Pauser / Upgrader:', OWNER_ADDRESS);

  const EternalJournalV2 = await ethers.getContractFactory(
    'EternalJournalPureOnChainV2',
  );

  // Deploy as UUPS proxy. The initialize function is called automatically.
  const journal = await upgrades.deployProxy(
    EternalJournalV2,
    [OWNER_ADDRESS, OWNER_ADDRESS, OWNER_ADDRESS],
    { kind: 'uups' },
  );

  await journal.waitForDeployment();

  const proxyAddress = await journal.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress,
  );

  console.log('');
  console.log('Proxy deployed to:         ', proxyAddress);
  console.log('Implementation deployed to:', implementationAddress);
  console.log('');
  console.log(
    'Update ETERNAL_JOURNAL_ADDRESS in apps/web/src/lib/contract.ts with:',
  );
  console.log(`  "${proxyAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
