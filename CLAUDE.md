# 🤖 CLAUDE.md - Guía para el Asistente

## 📋 Resumen del Proyecto

**Sitio Citas** es un juego de citas virtuales con clones de IA en Farcaster (Web3).

## 🎯 Objetivo Principal

Crear un **smart contract** que:

1. 📝 **Registre consentimientos** - Almacenar FIDs de personas que aceptan ser "clonadas"
2. 💰 **Gestione pagos** - Permitir pagar para jugar con un perfil específico
3. 📊 **Distribuya fees** - Repartir entre creador del perfil y plataforma

## 🔑 Decisiones de Diseño Clave

### Registro de FIDs (Gasless):
- ⛽ Solo el **owner/deployer** puede registrar FIDs
- 🎁 Los usuarios no pagan gas (lo hace el backend)
- 🔐 Patrón `Ownable` de OpenZeppelin

### Sistema de Pagos:
- 💵 Cada perfil define su **precio mínimo**
- 📈 La plataforma cobra un **fee porcentual**
- 🔄 Distribución automática al pagar

## 📁 Estructura Esperada

```
contracts/
├── SitioCitas.sol          # 📜 Contrato principal
├── interfaces/
│   └── ISitioCitas.sol     # 🔌 Interface
test/
├── SitioCitas.test.js      # 🧪 Tests
scripts/
├── deploy.js               # 🚀 Script de deploy
```

## 🛠️ Comandos Importantes

```bash
# 🧪 Correr tests
npm test

# 🏗️ Compilar contratos
npx hardhat compile

# 🚀 Deploy a testnet
npm run deploy:base-sepolia

# 📊 Coverage
npm run coverage
```

## ⚠️ Consideraciones Importantes

1. 🔒 **Seguridad**: Solo owner puede registrar (prevenir spam)
2. 💸 **Reentrancy**: Proteger función de pago con `ReentrancyGuard`
3. 📏 **Validaciones**: Verificar FID registrado y pago suficiente
4. 📢 **Eventos**: Emitir eventos para indexación off-chain

## 🌐 Red Objetivo

- **Testnet**: Base Sepolia
- **Mainnet**: Base

## 💡 Ideas Futuras (No implementar aún)

- 🎫 NFT como prueba de cita
- ⭐ Sistema de ratings
- 🏆 Achievements/badges
