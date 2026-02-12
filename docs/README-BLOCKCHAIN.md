# Eternal Journal - Blockchain

Documentación de la integración blockchain de Eternal Journal.

## Stack

- **wagmi** – React Hooks para Ethereum
- **viem** – Cliente TypeScript para Ethereum
- **RainbowKit** – UI de conexión de wallets
- **Sepolia** – Testnet de Ethereum

## Red

La app usa **Base Sepolia** (testnet de Base, L2 sobre Ethereum) para desarrollo y pruebas.

| Propiedad | Valor |
|-----------|-------|
| Chain ID | 84532 |
| RPC | https://sepolia.base.org |
| Explorer | https://sepolia.basescan.org |

### Obtener ETH de prueba (Base Sepolia)

1. [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
2. [Alchemy Base Sepolia](https://sepoliafaucet.com/) (seleccionar Base Sepolia)

## Configuración

### 1. WalletConnect Project ID

RainbowKit requiere un Project ID de WalletConnect Cloud para MetaMask Mobile, WalletConnect, etc.

1. Crear cuenta en [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Crear un proyecto y copiar el Project ID
3. Crear `.env.local` en `apps/web/`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=tu_project_id
```

### 2. Archivo de configuración

La configuración está en `apps/web/src/app/wagmi.config.ts`:

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'Eternal Journal',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [baseSepolia],
  ssr: true,
});
```

### 3. Cliente viem para leer datos

Para consultar la blockchain sin wallet (ej. último bloque):

```typescript
// apps/web/src/lib/sepoliaClient.ts
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export const sepoliaPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// Uso: const block = await sepoliaPublicClient.getBlock();
```

## Uso

### ConnectButton

Botón de conexión en Home y Journal:

```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

<ConnectButton />
```

### Hooks de wagmi

```tsx
import { useAccount, useAccountStatus } from 'wagmi';

function MyComponent() {
  const { address, isConnected } = useAccount();
  const status = useAccountStatus();

  if (!isConnected) return <p>Conecta tu wallet</p>;
  return <p>Conectado: {address}</p>;
}
```

### Cambiar a otra red

Para usar otra red (ej. Ethereum Sepolia o mainnet):

```typescript
import { baseSepolia, sepolia, mainnet } from 'wagmi/chains';

const config = getDefaultConfig({
  chains: [baseSepolia, sepolia, mainnet],
  // ...
});
```

## RPC y providers

Por defecto se usa el RPC público de Sepolia. Para producción puedes usar:

- [Alchemy](https://www.alchemy.com/)
- [Infura](https://infura.io/)
- [QuickNode](https://www.quicknode.com/)

```typescript
import { http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

const config = getDefaultConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http('https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY'),
  },
});
```

## Referencias

- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)
- [wagmi Docs](https://wagmi.sh)
- [viem Docs](https://viem.sh)
- [Base Sepolia Basescan](https://sepolia.basescan.org)
