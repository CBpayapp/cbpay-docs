---
title: "Wallets de empresa"
description: "Reserva y opera una wallet EUR dedicada para una cuenta empresa verificada"
slug: es/guias/company-wallets
lang: es
source_url: https://docs.cbpayapp.com/es/guias/company-wallets
---
> **Ambientes:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## Wallets EUR de empresa

Las cuentas empresa verificadas pueden reservar una wallet EUR dedicada cuando
el producto Banking está habilitado. La wallet es la cuenta bancaria operativa
de la empresa: sus IBAN virtuales enrutan los fondos hacia ella y las
operaciones EUR salientes usan el titular corporativo aceptado. La reserva es
durable e idempotente; no mueve dinero hasta una operación bancaria posterior.

### Reservar la wallet

La solicitud solo se acepta para una cuenta empresa verificada. Envía la clave
de idempotencia en el header o como `idempotency_key` en el JSON. Los overrides
opcionales completan datos que no estén en el perfil KYB aprobado:

```bash
curl -X POST https://api.qbank.cl/platform/v1/banking/company-wallets \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: company-wallet-eur-001" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "company-wallet-eur-001",
    "trading_website": "https://example.com",
    "business_activity": "International software services",
    "is_micro_enterprise": false,
    "incorporation_country": "CL",
    "incorporation_date": "2020-04-15",
    "expected_turnover": "250000.00"
  }'
```

La plataforma arma el titular corporativo completo desde el perfil KYB
verificado más estos overrides. Si aún faltan datos obligatorios, responde
`422 registrant_incomplete` e indica las rutas faltantes. El éxito es
`202 Accepted`:

```json
{
  "company_wallet": {
    "id": "7d2c1a8e-4d3e-4f7f-9a1c-000000000001",
    "account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "currency": "EUR",
    "status": "pending",
    "order_reference": "wallet-order-001",
    "created_at": "2026-09-17T15:00:00Z",
    "updated_at": "2026-09-17T15:00:00Z"
  }
}
```

Repetir la misma clave devuelve `200` con el objeto original y
`idempotency_hit: true`; nunca crees una segunda reserva con una clave nueva
después de una respuesta ambigua.

### Listar, consultar, saldo y operaciones

```bash
curl "https://api.qbank.cl/platform/v1/banking/company-wallets?page=1&page_size=50" \
  -H "Authorization: Bearer <token>"

curl https://api.qbank.cl/platform/v1/banking/company-wallets/7d2c1a8e-4d3e-4f7f-9a1c-000000000001 \
  -H "Authorization: Bearer <token>"

curl https://api.qbank.cl/platform/v1/banking/company-wallets/7d2c1a8e-4d3e-4f7f-9a1c-000000000001/balance \
  -H "Authorization: Bearer <token>"

curl "https://api.qbank.cl/platform/v1/banking/company-wallets/7d2c1a8e-4d3e-4f7f-9a1c-000000000001/operations?from=2026-09-01&to=2026-09-16" \
  -H "Authorization: Bearer <token>"
```

El detalle puede incluir `sync_error` si falló el polling de la reserva; el
estado durable sigue visible y la próxima lectura puede conciliarlo. El saldo
es en vivo y devuelve todos los montos de la wallet más el escalar EUR:

```json
{
  "wallet_id": "7d2c1a8e-4d3e-4f7f-9a1c-000000000001",
  "currency": "EUR",
  "available": "12500.00",
  "amounts": [
    { "currency": "EUR", "available": "12500.00" }
  ],
  "source": "banking_provider_live"
}
```

Las operaciones requieren `from` y `to` en formato `YYYY-MM-DD`. La ventana
del proveedor se recorta al último día completo; pedir hoy como fecha final
no presenta un estado incompleto como definitivo:

```json
{
  "wallet_id": "7d2c1a8e-4d3e-4f7f-9a1c-000000000001",
  "from": "2026-09-01",
  "to": "2026-09-16",
  "operations": [
    {
      "source_tx_id": "bank-order-8842",
      "occurred_at": "2026-09-15T10:30:00Z",
      "amount": "450.00",
      "currency": "EUR",
      "direction": "credit",
      "reference": "CB-EUR-001",
      "counterparty": "Example Client",
      "description": "Invoice 8842",
      "from_address": "DE00...",
      "to_address": "DE11..."
    }
  ]
}
```

Una wallet inactiva o sin UUID asignado responde `409 wallet_not_ready`.
`wallet_read_failed` y `wallet_statement_failed` son fallas de lectura del
upstream; conserva la reserva durable y reintenta la lectura, no la reserva.

### Saldo del IBAN virtual Banking EUR

`GET /v1/banking/virtual-ibans/{virtualIBANID}/balance` devuelve
`received_total`, el monto neto recibido por ese IBAN virtual en el espejo
de la plataforma. Intencionalmente no devuelve `available`: los pagos EUR
salientes descuentan el saldo `BANK_EUR` de la cuenta y todavía no se pueden
atribuir honestamente a un IBAN receptor.

```json
{
  "virtual_iban_id": "2f8c1d4e-1111-4b22-8a33-000000000001",
  "currency": "EUR",
  "asset": "BANK_EUR",
  "received_total": "1250.00",
  "purpose": "banking_eur",
  "source": "platform_ledger_reconciled_to_banking_provider"
}
```

El saldo de la cuenta es la fuente de fondos disponibles. La atribución de
egresos por IBAN es una fase futura; no restes un monto inventado de
`received_total`.

## Estados y errores

| Estado | Significado | Próxima acción |
|---|---|---|
| `pending` / `provisioning` | La reserva sigue en conciliación | Consulta el detalle con la misma credencial de cuenta |
| `active` | UUID y saldo EUR disponibles | Lee saldo u operaciones fechadas |
| `declined` / `failed` | La reserva terminó con error | Revisa el error durable y toma una nueva decisión de negocio |

Consulta [Errores de Banking EUR y wallets de empresa](https://docs.cbpayapp.com/es/errores#errores-de-banking-eur-y-wallets-de-empresa)
para códigos públicos y acciones de recuperación.

## FAQ

#### Can I reserve a second wallet with a new key?
No. Reuse the same idempotency key after an ambiguous response and reconcile
the durable reservation. A new key creates a new request.
#### Does a virtual IBAN have its own spendable balance?
No. `received_total` is the honest inbound mirror for a receiving IBAN.
Outgoing EUR payments debit the account-level `BANK_EUR` balance.
