---
title: "QR payins"
description: "Create QR payins and safely retry requests without duplicate charges."
slug: en/guides/payins-qr
lang: en
source_url: https://docs.cbpayapp.com/en/guides/payins-qr
---
> **Environments:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

QR payins let you create a charge that a customer completes with their banking
app. Use an idempotency key whenever a client may retry after a timeout or
ambiguous network response.

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> paid
    pending --> expired
    paid --> [*]
    expired --> [*]
```

## Create a QR payin

Send `method: "qr"` to `POST /v1/payins`. The key is optional and can be sent
in the JSON body or in the `Idempotency-Key` header.

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "qr",
    "amount": "700.00",
    "description": "App top-up",
    "idempotency_key": "qr-bo-700-20261002-001",
    "expires_in": 3600
  }'
```

### QR expiration limits

`expires_in` is an integer number of seconds for platform QR payins. The
server selects the configured rail; the integrator cannot select it. The
legacy QR contract has an effective maximum of `86399` seconds (23:59:59).
The 7-day QR rail has an effective maximum of `604800` seconds, with
`86400` seconds (24 hours) as its default when the value is missing or
non-positive. Values above the selected rail maximum are capped, not
rejected. For the 7-day rail, use at least `120` seconds as an operational minimum.

Response `201`:

```json
{
  "payin_id": "9c2a1b2c-3d4e-5f60-7a8b-9c0d1e2f3a4b",
  "status": "pending",
  "charge": {
    "charge_id": "c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4",
    "our_reference": "77849505",
    "qr_payload": "<QR content>",
    "status": "pending"
  }
}
```

Display the QR payload or the `qr_image_url` returned by the API. When the
customer pays, the account is credited automatically. Read the current status
with `GET /v1/payins/{payinID}`.

## Brazil: PIX QR in BOB

For `country: "BR"`, `currency: "BOB"` and `method: "qr"`, the charge is
denominated in BOB. The payer pays in BRL through the rail's conversion.
The payer's CPF is required; `payer_phone` and `payer_email` are optional and
are forwarded when provided:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BR",
    "currency": "BOB",
    "method": "qr",
    "amount": "1.00",
    "description": "Order 7719",
    "payer_document": "52998224725",
    "payer_phone": "+5511999990000",
    "payer_email": "payer@example.test",
    "idempotency_key": "qr-br-bob-20261022-001"
  }'
```

The response is `201` with `status: "pending"`, the QR image fields, the
conversion shown to the payer, and the rail expiration. Brazil's QR contract
provides a PNG image, not an EMV copy-and-paste payload:

```json
{
  "payin_id": "2f7b2a6e-6d1c-4c71-9d5e-4e0c2e7a1101",
  "status": "pending",
  "charge": {
    "charge_id": "8d4f1a90-0d7a-4fb1-8b51-8f3cc2b1e401",
    "our_reference": "77849505",
    "qr_image": "<base64 PNG>",
    "qr_image_url": "https://cdn.example.test/qr/77849505.png",
    "conversion": {
      "amount": "0.48",
      "currency": "BRL",
      "rate": "0.48"
    },
    "expires_at": "2026-10-22T12:57:14.937Z",
    "status": "pending"
  }
}
```

The checkout-link quote marks this `BR`/`BOB` corridor with
`payer_required: true`.
When a payer opens a hosted link, the server-driven page asks for the CPF
before materializing the charge. Do not bypass that form by creating a second
charge.

### Confirmation and reconciliation

The lifecycle is webhook-first. An authenticated inbound event (the rail
webhook uses its configured `x-api-key` header) can close the pending charge; a
late reconciliation read is allowed only after the configured
minimum age (15 minutes by default). Until the platform status is verified as
`credited`, the charge remains `pending` and must not be credited:

```mermaid
sequenceDiagram
    participant I as Integrator
    participant C as CBPay
    participant R as Payment rail
    I->>C: POST /platform/v1/payins (CPF)
    C->>R: Create QR charge
    R-->>C: pending + QR
    C-->>I: 201 pending
    R-->>C: authenticated payment event
    C-->>I: payin_credited webhook
    C->>R: Late status read after 15 minutes if needed
```

Subscribe to `payin_credited` and `payin_charge_status_changed`; use
`GET /v1/payins/{payinID}` as the source of truth before fulfilling an order.
Never retry a possibly submitted payment with a new idempotency key.

## Brazil-specific errors

| HTTP | Code | What to do |
| --- | --- | --- |
| 400 | `invalid_request` | Include `payer_document` for a BR/BOB QR payin. |
| 422 | `provider_rejected` | The payment rail rejected the charge, including a missing CPF at the adapter boundary; correct the payer data using the returned detail and do not blind-retry. |

## Idempotent retries

`idempotency_key` is optional for QR payins. Send it in the JSON body or as the
`Idempotency-Key` header. If both are present, the body value is used. The
platform namespaces the key by account internally; the integrator sends the
key exactly as provided.

The request identity includes country, currency, method and the numeric amount.
For example, `"100"` and `"100.00"` are equivalent. `description` is display
text and is not part of replay identity. The QR channel is not part of the
replay identity: the same key replays the same charge regardless of channel.

The first request creates one charge. A retry with the same key and equivalent
payload returns the original object with `idempotency_hit: true`; it does not
create another charge:

```json
{
  "payin_id": "9c2a1b2c-3d4e-5f60-7a8b-9c0d1e2f3a4b",
  "status": "pending",
  "charge": {
    "charge_id": "c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4",
    "status": "pending"
  },
  "idempotency_hit": true
}
```

The header form is equivalent:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: qr-bo-700-20261002-001" \
  -H "Content-Type: application/json" \
  -d '{"country":"BO","currency":"BOB","method":"qr","amount":"700.00","description":"App top-up"}'
```

If the same key is reused with a different country, currency, method or amount,
the API returns `409 idempotency_conflict`:

```json
{
  "error": "idempotency_conflict",
  "message": "this idempotency key was used with a different payload"
}
```

An expired or paid charge is replayed as-is. The replay response preserves the
original object; use `GET /v1/payins/{payinID}` to read its live status.

Both the core and the platform return `400 invalid_idempotency_key` when the
integrator key is longer than 256 characters or contains carriage-return/
line-feed characters. The platform also rejects the request with the same code
if its server-side account namespace would make the resulting core key exceed
256 characters. That namespace is invisible to the integrator: send the key
unchanged.

## Errors

| HTTP | Code | What to do |
| --- | --- | --- |
| 400 | `invalid_idempotency_key` | Trim the key to 256 characters or fewer and remove control characters. |
| 409 | `idempotency_conflict` | Reuse the original payload, or generate a new key for a new charge. |

## FAQ

#### Can I change the description when retrying?
Yes. The description is display text and is not part of the replay identity.
#### What if the customer paid while my request timed out?
Retry with the same idempotency key, then read the returned `payin_id` with
`GET /v1/payins/{payinID}`. Do not create a new key for the same operation.
#### Is a CPF required for every QR payin?
Only for Brazil (`BR`/`BOB`/`qr`). Other QR corridors keep their own payer
requirements.
#### How does the Brazil QR amount work?
The charge amount is in BOB. The response's `conversion` block shows the BRL
amount and rate the payer sees; for example, `1.00` BOB can convert to
`0.48` BRL at rate `0.48`.
#### When can I treat a Brazil QR payin as paid?
Only after the API status is `credited` or the corresponding verified webhook
is received. A QR being generated, scanned or locally expired is not proof of
settlement.
#### What is the maximum expires_in for a BO/BOB QR payin in production?
For the platform API, the maximum effective value is `604800` seconds (7
days) when the server selects the 7-day QR rail. The legacy QR rail
has an effective maximum of `86399` seconds (23:59:59). Values above the
selected maximum are capped, not rejected; the integrator does not choose the
rail. Use at least `120` seconds for the 7-day rail.
