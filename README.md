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
- 💵 Pueden cobrar una pequeña cantidad (ej: **$1 USD**) cada vez que alguien quiera tener una cita con su clon
- 🎁 Se llevan parte del pago por "prestar" su personalidad digital

### Para la Plataforma:
- 📊 La plataforma cobra un **fee** por cada transacción
- 🏦 Modelo sostenible para mantener el servicio

## 📜 Funciones del Smart Contract

### 1. 📝 `registerFID(uint256 fid, uint256 price)`
- **Propósito**: Registrar un nuevo FID que acepta participar en el juego
- **Quién puede llamarla**: Solo el deployer/backend (gasless para usuarios)
- **Parámetros**:
  - `fid`: El Farcaster ID del usuario
  - `price`: Precio mínimo para jugar con este perfil

### 2. 💸 `payToPlay(uint256 fid)`
- **Propósito**: Pagar para tener una cita con un perfil específico
- **Funcionamiento**:
  - Verifica que el FID esté registrado en el contrato ✅
  - Verifica que el pago sea >= al precio mínimo establecido ✅
  - Distribuye el pago entre creador y plataforma 💰
  - Emite evento confirmando la transacción 📢

### 3. 🔍 `isRegistered(uint256 fid)` (view)
- **Propósito**: Consultar si un FID está registrado
- **Returns**: `bool`

### 4. 💲 `getPrice(uint256 fid)` (view)
- **Propósito**: Consultar el precio para jugar con un FID
- **Returns**: `uint256`

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
   inicia cita             (solo owner)            consentimientos
                                                   y pagos
```

## 🛠️ Stack Tecnológico

- ⛓️ **Blockchain**: Base (L2 de Ethereum)
- 📝 **Lenguaje**: Solidity
- 🔧 **Framework**: Hardhat
- 🌐 **Red Social**: Farcaster

## 🚀 Próximos Pasos

- [ ] 📄 Escribir el smart contract
- [ ] 🧪 Escribir tests
- [ ] 🚀 Deploy en Base Sepolia (testnet)
- [ ] ✅ Verificar contrato
- [ ] 🎉 Deploy en Base mainnet

## 📞 Contacto

Hecho con 💜 para la comunidad de Farcaster

---

*"El amor en la era de la IA y Web3"* 💘🤖🔗
