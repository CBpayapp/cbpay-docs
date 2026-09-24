---
title: "Activos fiat del ledger"
description: "Cómo funcionan los saldos BOB, MXN y ARS en el ledger de CBPay y qué productos los soportan"
slug: es/guides/fiat-ledger-assets
lang: es
source_url: https://docs.cbpayapp.com/es/guides/fiat-ledger-assets
---
Las cuentas CBPay ahora exponen tres activos fiat del ledger: **BOB**, **MXN**
y **ARS**. Son saldos independientes, almacenados con dos decimales (unidades
menores), y aparecen junto a USDT, USDC, BTC, GOLD, SILVER y PLATINUM.

## Dónde aparecen

- `GET /v1/balances`: siempre devuelve los nueve activos del ledger, incluso
  filas en cero. Los fiat usan dos decimales, por ejemplo `"125.40"`.
- `GET /v1/balances/history`: incluye una serie diaria por cada activo fiat.
  La serie sigue `available`; los holds aparecen en el snapshot actual.
- `GET /v1/analytics/summary`: incluye saldos y volumen fiat cuando existen.
  La valorización USD usa el feed de tasas de la organización (`1 / tasa
  local-por-USD`). Sin una tasa válida, el activo queda como `unpriced` y se
  excluye de los totales USD.

```json
{
  "account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "balances": [
    { "asset": "BOB", "available": "15000.00", "held": "0.00" },
    { "asset": "MXN", "available": "0.00", "held": "0.00" },
    { "asset": "ARS", "available": "0.00", "held": "0.00" }
  ]
}
```

## Transferencias

`POST /v1/transfers` permite transferencias internas del mismo activo cuando
origen y destino usan el mismo asset. La transferencia fiat conserva sus dos
decimales; no convierte implícitamente a USDT ni a otra moneda.

## Gates de producto en v1

Registrar el fiat en el ledger no significa que todos los productos puedan
gastarlo:

| Producto | BOB/MXN/ARS en v1 |
|---|---|
| Saldos, history y analytics | Soportado |
| Transferencias internas del mismo asset | Soportado |
| Settlement de payouts y defaults de organización | Aceptado; la ejecución fiat responde `503 pricing_unavailable` hasta que exista pricing de settlement fiat |
| Swaps | Rechazado con `400 invalid_pair` |
| Checkout | Rechazado como settlement asset con `invalid_asset` |
| POS | Rechazado como settlement asset con `invalid_asset` |
| Tarjetas | Rechazado con `400 spending_asset_unavailable` |

La separación es intencional: un saldo puede existir en el ledger antes de
que exista el pricing o el camino de settlement externo.

## Errores y precisión

Los montos son strings decimales. `1.50` BOB equivale a 150 unidades menores;
`1.234` BOB, MXN o ARS se rechaza. Una solicitud de settlement fiat puede ser
válida en forma y aun así responder `503 pricing_unavailable` hasta que se
implemente el camino de payout fiat.

#### ¿Agregar fiat cambia mi settlement asset por defecto?
No. Las cuentas existentes conservan su default actual. El fiat se usa solo
cuando el activo está habilitado y el gate del producto lo acepta.
#### ¿Puedo usar un saldo fiat para pagar una compra con tarjeta?
No. Las tarjetas rechazan assets fiat en v1; el saldo sigue visible y usable
por los productos soportados arriba.
