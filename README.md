# Eternal Journal

Diario en la blockchain. MVP con Next.js, NestJS y TypeScript.

## Estructura

```
├── apps/
│   ├── web/     # Next.js 15 + React + Tailwind
│   └── api/     # NestJS 11 + TypeScript
```

## Ejecutar

```bash
npm install
npm run dev
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001

## Flujo

1. **Home** (`/`): Pantalla de bienvenida con botón "Entrar"
2. **Journal** (`/journal`): Lista de citas (blureadas por defecto, clic para revelar) + botón "Agregar cita" (arriba a la derecha) que abre el popup

## Tecnologías

- **Frontend**: Next.js 15, React 19, Tailwind CSS, liquid glass style, paleta violeta, dark/light mode
- **Backend**: NestJS 11, TypeScript
- **Blockchain**: wagmi, viem, RainbowKit, Base Sepolia (https://sepolia.base.org)

## Blockchain

Conecta tu wallet en Sepolia. Ver [docs/README-BLOCKCHAIN.md](docs/README-BLOCKCHAIN.md) para configuración y uso.
