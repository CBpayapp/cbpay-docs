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
The response preserves the requested value as `charge.requested_expires_in`.
If the selected rail returns a shorter lifetime, the response also includes
`ttl_notice` with `requested_expires_in`, `actual_expires_in`, and a note. This
is informational: use `charge.expires_at` as the deadline.

Response `201`:

```json
{
  "payin_id": "9c2a1b2c-3d4e-5f60-7a8b-9c0d1e2f3a4b",
  "status": "pending",
  "reference": "77849505",
  "charge": {
    "charge_id": "c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4",
    "our_reference": "77849505",
    "qr_image": "<base64 PNG>",
    "qr_image_url": "https://cdn.example.test/qr/77849505.png",
    "qr_payload": "<QR content when this rail emits one>",
    "expires_at": "2026-10-29T19:00:00Z",
    "requested_expires_in": 3600,
    "status": "pending"
  }
}
```

Display `qr_image` or `qr_image_url`; use `qr_payload` only when it is present.
Brazil returns the PNG image only, without a copy-and-paste payload. The
numeric `reference` is the citable reference for support and sharing. When the
customer pays, the account is credited automatically. Read the current status
with `GET /v1/payins/{payinID}`.

## Brazil: PIX QR in BRL or BOB

For Brazil, `method: "qr"` accepts either `currency: "BRL"` (recommended)
or `currency: "BOB"` (direct advanced mode). With BRL, the platform quotes
the BOB charge using the current mid rates, without spread in the quote, and
passes the converted BOB amount to the core. The credit and fees are based on
the BOB amount actually received. The quote is snapshotted and preserved on
idempotent replay.

### Recommended: enter the payer amount in BRL

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BR",
    "currency": "BRL",
    "method": "qr",
    "amount": "120.00",
    "description": "Order 7719",
    "payer_document": "52998224725",
    "payer_phone": "+5511999990000",
    "payer_email": "payer@example.test",
    "expires_in": 1800,
    "idempotency_key": "qr-brl-20261022-001"
  }'
```

The response includes the QR image, the amount the payer must actually pay in
BRL, the BOB amount charged, and the auditable platform quote:

```json
{
  "payin_id": "2f7b2a6e-6d1c-4c71-9d5e-4e0c2e7a1101",
  "status": "pending",
  "charge": {
    "charge_id": "8d4f1a90-0d7a-4fb1-8b51-8f3cc2b1e401",
    "our_reference": "77849505",
    "qr_image": "<base64 PNG>",
    "qr_image_url": "https://cdn.example.test/qr/77849505.png",
    "conversion": {"amount": "120.00", "currency": "BRL", "rate": "0.50"},
    "expires_at": "2026-10-22T12:57:14.937Z",
    "requested_expires_in": 1800,
    "bob_charged": "240.00",
    "platform_quote": {
      "quoted_currency": "BRL",
      "quoted_amount": "120.00",
      "charged_currency": "BOB",
      "charged_amount": "240.00",
      "rate_brl_per_usd": "5.0000000000",
      "rate_bob_per_usd": "10.0000000000",
      "rates_updated_at": "2026-10-22T20:00:00Z"
    },
    "status": "pending"
  }
}
```

`conversion.amount` is the source of truth for the amount shown to the payer.
It is the exact amount the payer must transfer, and can differ materially from
the typed amount because the rail applies its own rate. For example, an
integrator may type `5.41` BRL while the generated QR requires `5.84` BRL.
Never display the request amount instead of `conversion.amount`.

When a rail returns a shorter lifetime than requested, the response is still
successful and includes an additive notice:

```json
{
  "reference": "77849505",
  "ttl_notice": {
    "requested_expires_in": 1800,
    "actual_expires_in": 300,
    "note": "the rail returned a shorter lifetime than requested; the payer must pay within the actual window"
  },
  "charge": {
    "expires_at": "2026-10-29T18:05:00Z",
    "requested_expires_in": 1800
  }
}
```

For Brazil, request `expires_in: 300` and show the fixed five-minute notice in
your portal. The rail may return approximately five minutes even when a
longer value was requested.

### Advanced: enter the charge directly in BOB

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
      "amount": "5.84",
      "currency": "BRL",
      "rate": "0.48"
    },
    "expires_at": "2026-10-22T12:57:14.937Z",
    "requested_expires_in": 300,
    "status": "pending"
  }
}
```

The checkout-link quote marks the `BR`/`BOB` and `BR`/`BRL` corridors with
`payer_required: true`.
When a payer opens a hosted link, the server-driven page asks for the CPF
before materializing the charge. Do not bypass that form by creating a second
charge. Checkout links quote both: `BRL` for payers (converted to BOB at
materialization with the same mid rate and `platform_quote` snapshot as the
direct payin) and direct `BOB`; with two currencies the materialize call
sends `?currency=BRL` (or `BOB`).

### Read a QR payin

The detail endpoint returns the same sanitized charge needed to render the QR
after a page reload. It includes the image, payer-facing conversion, expiry,
status timestamps, and the optional `ttl_notice`; provider identity and
internal fields are never exposed:

```http
GET /v1/payins/2f7b2a6e-6d1c-4c71-9d5e-4e0c2e7a1101
```

```json
{
  "payin_id": "2f7b2a6e-6d1c-4c71-9d5e-4e0c2e7a1101",
  "kind": "qr",
  "status": "pending",
  "reference": "77849505",
  "charge": {
    "charge_id": "8d4f1a90-0d7a-4fb1-8b51-8f3cc2b1e401",
    "our_reference": "77849505",
    "qr_image": "<base64 PNG>",
    "qr_image_url": "https://cdn.example.test/qr/77849505.png",
    "conversion": {"amount": "5.84", "currency": "BRL", "rate": "0.48"},
    "status": "pending",
    "expires_at": "2026-10-29T18:05:00Z",
    "requested_expires_in": 300,
    "created_at": "2026-10-29T18:00:00Z",
    "updated_at": "2026-10-29T18:00:01Z"
  },
  "ttl_notice": {
    "requested_expires_in": 1800,
    "actual_expires_in": 300,
    "note": "the rail returned a shorter lifetime than requested; the payer must pay within the actual window"
  }
}
```

The list endpoint returns only `charge.conversion` and `charge.expires_at` for
QR rows, never the image. Request it with explicit date filters:

```bash
curl "https://api.qbank.cl/platform/v1/payins?from=2026-10-01&to=2026-10-31&kind=qr&page=1&page_size=50" \
  -H "Authorization: Bearer <token>"
```

> **Note**
When an internal QR in a checkout link has expired but still has an image, the
checkout automatically re-materializes a fresh QR before serving it. The
expired image is never presented as payable.
## Share a payment link

Use the public tracker as a payer-facing payment page for a pending QR payin.
The flow is:

```mermaid
sequenceDiagram
    participant I as Integrator
    participant C as CBPay
    participant P as Payer
    I->>C: GET /v1/track-link?kind=payin&id={payin_id}
    C-->>I: {track_url, code}
    I-->>P: "Pay here: {track_url}"
    P->>C: Open the public link
    C-->>P: QR image, amount, conversion and expiry
    P->>C: Scan and pay
    C-->>I: payin_credited webhook
```

1. Issue the link with the payin ID:

```bash
curl -G "https://api.qbank.cl/platform/v1/track-link" \
  -H "Authorization: Bearer <token>" \
  --data-urlencode "kind=payin" \
  --data-urlencode "id=2f7b2a6e-6d1c-4c71-9d5e-4e0c2e7a1101"
```

```json
{
  "track_url": "https://business.cbpayapp.com/t/P9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
  "code": "P9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6"
}
```

2. Share the exact text `Pay here: {track_url}`. If your own portal renders
   a fallback, use `pay.qr_image_url` first, then `pay.qr_payload` as text.
   `pay.qr_image` is the inline base64 PNG option.
3. The payer sees the public page with the QR, `conversion.amount` and
   `conversion.currency` when present, the optional rate, and `expires_at`.
   After payment, the page reflects the public status and timeline.

> **Note**
The link is a signed, no-login capability and is intentionally not listable.
Do not put tracking codes in search indexes or expose them in a directory.
Only a pending QR payin includes `pay`; other operations and terminal payins
omit it. The link does not create another charge.
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
| 400 | `invalid_request` | Include `payer_document` for a BR QR payin and use `BRL` or `BOB` as the currency. |
| 422 | `amount_too_small` | Increase the BRL amount: after conversion and half-up rounding, it must produce at least `0.01 BOB`. |
| 422 | `provider_rejected` | The payment rail rejected the charge, including a missing CPF at the adapter boundary; correct the payer data using the returned detail and do not blind-retry. |
| 503 | `rates_unavailable` | Retry the same request with the same idempotency key after rate service recovery. No charge is created while rates are unavailable. |

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
Only for Brazil (`BR`/`BRL` or `BOB`/`qr`). The rail validates that the CPF
exists; a synthetic or unknown CPF can be rejected with `CPF no encontrado`.
Other QR corridors keep their own payer requirements.
#### How does the Brazil QR amount work?
Use BRL when the amount your payer should pay is the product price. The
platform converts it to BOB at the mid rate and snapshots the quote. Use BOB
only when you need to specify the core charge directly.
#### Why can the payer amount differ by a few centavos?
`conversion.amount` is the exact payer-facing amount returned by the rail. The
rail's rate and rounding can make it differ from the amount typed in the
request — an incident showed `5.41` BRL entered versus `5.84` BRL in the QR.
Always display `conversion.amount` and never recalculate it in the client.
#### Why does a Brazil QR expire after five minutes?
Some Brazil QR rails enforce an approximately five-minute lifetime and ignore
longer requested durations. The API records your
`charge.requested_expires_in`, returns the actual `charge.expires_at`, and adds
`ttl_notice` when the difference is material. Request `expires_in: 300` and
start a new QR after expiry; do not reuse a dead QR.
#### What does the QR listing include?
`GET /v1/payins` includes a lightweight QR `charge` with only
`conversion` and `expires_at`. Use `GET /v1/payins/{id}` when you need the
image or the complete sanitized charge.
#### What if FX rates are unavailable?
The API returns `503 rates_unavailable` before creating a charge. Retry later
with the same idempotency key; do not create a new payment attempt.
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
#### Does the link expire with the QR?
The public link can remain reachable, but the QR is payable only until
`pay.expires_at`. When it expires, do not reuse that QR: create or serve a new
payment attempt according to your product flow.
#### What does the payer see?
The payer sees the QR image or its fallback payload, the exact
`conversion.amount` and `conversion.currency` when returned, the optional rate,
the expiry and the public status timeline. Provider identity and payer PII are
not exposed.
