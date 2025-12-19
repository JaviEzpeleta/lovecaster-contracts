# 💘 Sitio Citas - Smart Contracts

## 🎮 ¿Qué es esto?

**Sitio Citas** es un juego de citas virtuales en **Farcaster** (red social Web3) donde puedes tener citas con **clones de IA** de otras personas. 🤖💕

## 🌟 Concepto Principal

1. 👤 Te logueas con tu usuario de Farcaster
2. 💑 Eliges a una persona para tener una cita virtual
3. 🤖 Un clon de IA simula a esa persona usando su perfil y sus casts
4. 💬 ¡Tienes tu cita virtual con el clon!

## ✅ Consentimiento On-Chain

Para que alguien pueda ser "clonable" en el juego:

- ✍️ La persona debe **confirmar explícitamente** que permite usar su perfil y casts
- 🔗 Este consentimiento queda **registrado en blockchain**
- 🆔 Se almacena su **FID** (Farcaster ID) en el smart contract

## 💰 Sistema de Monetización

### Para los Creadores de Perfil:
- 💵 Pueden establecer un precio mínimo en **ETH** por cada cita con su clon
- 🎁 Reciben la mayor parte del pago (después del fee de plataforma)

### Para la Plataforma:
- 📊 Cobra un fee configurable (máximo 20%) por cada transacción
- 🏦 Modelo sostenible para mantener el servicio

## 📜 Smart Contract: SitioDates

### 🔐 Funciones del Owner (Gasless para usuarios)

#### `registerPlayer(uint256 fid, address wallet, uint256 minPrice)`
- **Propósito**: Registrar un nuevo jugador que acepta participar
- **Parámetros**:
  - `fid`: Farcaster ID del usuario
  - `wallet`: Dirección para recibir pagos
  - `minPrice`: Precio mínimo en wei para una cita

#### `updatePlayer(uint256 fid, address wallet, uint256 minPrice, bool active)`
- **Propósito**: Actualizar configuración de un jugador
- **Cooldowns**:
  - 🕐 Cambio de precio: 1 hora de espera
  - 🕐 Cambio de wallet: 24 horas de espera
  - ✅ Activar/desactivar: sin cooldown

#### `deregisterPlayer(uint256 fid)`
- **Propósito**: Eliminar completamente a un jugador del registro

#### `activatePlayer(uint256 fid)` / `deactivatePlayer(uint256 fid)`
- **Propósito**: Atajos rápidos para activar/desactivar jugadores

#### `setPlatformWallet(address newWallet)`
- **Propósito**: Cambiar la wallet que recibe los fees de plataforma

#### `setPlatformFee(uint256 newFee)`
- **Propósito**: Ajustar el fee de plataforma (0-2000 basis points, donde 100 = 1%)

#### `pause()` / `unpause()`
- **Propósito**: Pausar/reanudar el contrato en caso de emergencia

### 💸 Funciones Públicas

#### `payForDate(uint256 fid)` (payable)
- **Propósito**: Pagar para tener una cita con un perfil específico
- **Funcionamiento**:
  - ✅ Verifica que el jugador esté registrado y activo
  - ✅ Verifica que el pago sea >= al precio mínimo
  - 💰 Distribuye el pago entre jugador y plataforma
  - 📢 Emite evento `DatePaid`

### 🔍 Funciones de Consulta (View)

| Función | Descripción |
|---------|-------------|
| `getPlayer(fid)` | Obtiene toda la info de un jugador |
| `isPlayerActive(fid)` | ¿Está registrado Y activo? |
| `isPlayerRegistered(fid)` | ¿Está registrado? |
| `getMinPrice(fid)` | Precio mínimo en wei |
| `getPriceCooldownRemaining(fid)` | Segundos hasta poder cambiar precio |
| `getWalletCooldownRemaining(fid)` | Segundos hasta poder cambiar wallet |
| `getRegisteredFids(offset, limit)` | Lista paginada de FIDs |
| `getTotalPlayersCount()` | Total de jugadores registrados |
| `getStats()` | Estadísticas del contrato |
| `calculatePaymentSplit(amount)` | Calcula distribución de un pago |

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend        │────▶│ Smart Contract  │
│   (Farcaster)   │     │   (Gasless)      │     │   (Base)        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                       │
        │                        │                       │
        ▼                        ▼                       ▼
   👤 Usuario              ✍️ Registra FIDs        💾 Almacena
   paga con ETH            (solo owner)            consentimientos
                                                   y pagos
```

## 🛡️ Seguridad

- 🔒 **ReentrancyGuard**: Protección contra ataques de reentrancia
- ⏸️ **Pausable**: El owner puede pausar en emergencias
- ⏰ **Cooldowns**: Evita cambios frecuentes de precio/wallet
- 📊 **Basis Points**: Precisión en cálculos de fees (10000 = 100%)

## 🛠️ Stack Tecnológico

- ⛓️ **Blockchain**: Base (L2 de Ethereum)
- 📝 **Lenguaje**: Solidity ^0.8.28
- 🔧 **Framework**: Hardhat
- 📦 **Librerías**: OpenZeppelin Contracts
- 🌐 **Red Social**: Farcaster

## 🚀 Estado del Proyecto

- [x] 📄 Smart contract escrito
- [x] 🧪 Tests escritos
- [ ] 🚀 Deploy en Base Sepolia (testnet)
- [ ] ✅ Verificar contrato
- [ ] 🎉 Deploy en Base mainnet

## 📞 Contacto

Hecho con 💜 para la comunidad de Farcaster

---

*"El amor en la era de la IA y Web3"* 💘🤖🔗
