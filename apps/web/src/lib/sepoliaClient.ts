import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export const sepoliaPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});
