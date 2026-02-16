import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import type { Config } from 'wagmi';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

function createWagmiConfig(): Config {
  return getDefaultConfig({
    appName: 'Eternal Journal',
    projectId,
    chains: [baseSepolia],
    ssr: true,
  });
}

// Singleton: prevent WalletConnect "Init() was called N times" on hot reload / React Strict Mode
declare global {
  // eslint-disable-next-line no-var
  var __eternal_wagmi_config__: Config | undefined;
}

export const wagmiConfig: Config =
  typeof globalThis !== 'undefined' && globalThis.__eternal_wagmi_config__
    ? globalThis.__eternal_wagmi_config__
    : (globalThis.__eternal_wagmi_config__ = createWagmiConfig());
