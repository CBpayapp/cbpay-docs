---
title: "Servicios habilitados"
description: "Qué productos tiene habilitados tu cuenta y cómo reaccionar a service_disabled"
slug: es/conceptos/servicios
lang: es
source_url: https://docs.cbpayapp.com/es/conceptos/servicios
---
Cada cuenta tiene un **conjunto de servicios habilitados** según su acuerdo
comercial con CBPay. Antes de mostrar un producto en tu UI (o de intentar
usarlo), consulta el mapa efectivo:

```bash
curl https://api.qbank.cl/platform/v1/services \
  -H "Authorization: Bearer <token>"
```

```json
{
  "account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "services": {
    "payouts": true,
    "payins": true,
    "transfers": true,
    "crypto": true,
    "banking": false,
    "kyc": true,
    "cards": false
  }
}
```

## Catálogo de servicios

| Servicio | Qué habilita |
|---|---|
| `payouts` | Dispersiones fiat (`POST /v1/payouts`, QR scan/confirm) |
| `payins` | Cobros fiat (QR, transferencia, página de pago, collect, CLABE) |
| `transfers` | Transferencias internas entre cuentas CBPay |
| `crypto` | Wallets on-chain y retiros USDT |
| `banking` | Cuentas bancarias internacionales (perfil, cuentas, pagos) |
| `kyc` | Verificación de identidad KYC/KYB de terceros (links, submissions, documentos, liveness) |
| `aml` | AML screening contra listas, rescreening y monitoreo |
| `cards` | Emisión y operación de tarjetas |
| `swaps` | Conversión entre saldos (USDT/USDC/BTC/GOLD) |
| `wallets` | [Wallets segregadas](https://docs.cbpayapp.com/es/guias/wallets-segregadas) con saldo on-chain propio (solo empresas) |

## Qué pasa cuando un servicio está apagado

Las **acciones** del producto responden `403 service_disabled`:

```json
{
  "error": "service_disabled",
  "message": "this service is not enabled for your account"
}
```

Reglas importantes:

- **Las lecturas nunca se bloquean**: siempre puedes listar y consultar tus
  operaciones históricas, saldos y movimientos.
- **El dinero en tránsito termina su ciclo**: un payout `processing` se
  completa (o reembolsa) aunque el servicio se apague después.
- Con `cards` apagado, las compras con tarjeta dejan de autorizarse al
  instante y no se generan mensualidades.

## Patrón recomendado en tu integración

```mermaid
flowchart LR
    inicio["Al iniciar sesión /<br/>cargar el dashboard"] --> get["GET /v1/services"]
    get --> ui{"services.X"}
    ui -->|"true"| muestra["Muestra el producto"]
    ui -->|"false"| oculta["Oculta o deshabilita<br/>el producto"]
    muestra --> accion["El usuario opera"]
    accion --> err{"403 service_disabled?"}
    err -->|"sí"| refresca["Refresca GET /v1/services<br/>y actualiza la UI"]
```

1. Consulta `GET /v1/services` al cargar tu aplicación (y cachea unos minutos).
2. Muestra solo los productos en `true`.
3. Aun así, maneja `403 service_disabled` en cualquier acción: la
   configuración puede cambiar entre tu caché y la operación.

> **Nota**
Los servicios los habilita tu organización según el acuerdo comercial. Si
necesitas activar un producto (por ejemplo `banking` o `cards`), contacta a
tu administrador CBPay — el cambio es inmediato, sin redeploy.
## EUR banking service flags

The platform exposes `eur_funding` for EUR-to-USDT funding and
`virtual_iban` for optional EUR banking balances and SEPA Instant. Both are
separate from the general banking capability and must be enabled explicitly
when the organization uses them.
