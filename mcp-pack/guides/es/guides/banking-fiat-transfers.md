---
title: "Transferir fiat local desde un saldo Banking"
description: "Crear payouts fiat locales desde saldos Banking retenidos"
slug: es/guides/banking-fiat-transfers
lang: es
source_url: https://docs.cbpayapp.com/es/guides/banking-fiat-transfers
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

Usa `POST /v1/banking/fiat-transfers` para crear un payout fiat local desde
un saldo Banking retenido. El request y la respuesta usan la misma forma de
`beneficiary` y Payout que `POST /v1/payouts`. Consulta el recurso con
`GET /v1/payouts/{payoutID}`, lístalo con `GET /v1/payouts` y suscríbete a
`payout_status_changed`.

## Corredores admitidos

| País / moneda | Método | Settlement |
|---|---|---|
| `BO/BOB` | `bank_transfer` | `BOB` |
| `MX/MXN` | `bank_transfer` | `MXN` |
| `AR/ARS` | `bank_transfer` | `ARS` |
| `CL/CLP` | `fintoc` | `CLP` |

El settlement siempre es **identity**: el saldo local se debita en la moneda
del corredor. `settlement_asset` debe omitirse o ser igual a esa moneda; la
ruta nunca debita USDT. Envía una clave idempotente en el body o en
`Idempotency-Key`; un replay devuelve el payout original sin segundo débito.

```bash
curl -X POST https://api.qbank.cl/platform/v1/banking/fiat-transfers \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: banking-cl-0001" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "fintoc",
    "amount": "2000",
    "beneficiary": {
      "name": "Nicolas Merino",
      "tax_id": "17.629.916-9",
      "bank_code": "016",
      "account_type": "checking",
      "account_number": "72815742"
    },
    "settlement_asset": "CLP"
  }'
```

La respuesta es un `Payout` normal con `settlement_asset: "CLP"` y
`settlement_rate: "1"`. Un asset inválido devuelve
`400 invalid_settlement_asset`; un corredor no soportado devuelve
`422 banking_corridor_unsupported`. Compliance pendiente puede devolver
`202` con `funds_debited: false`; mantén la misma clave y espera la
conciliación.

## Estados y errores

| Estado | Significado |
|---|---|
| `pending` | Compliance o el riel siguen pendientes |
| `processing` | El payout fue aceptado y se está despachando |
| `completed` / `failed` | Resultado final; revisa el payout y el webhook |

Consulta [Errores](https://docs.cbpayapp.com/es/errors) para el catálogo completo.

#### ¿Esta ruta debita USDT?
No. Debita el saldo Banking local retenido y liquida identity en la moneda del
corredor.
