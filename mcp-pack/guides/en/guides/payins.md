---
title: "Payins"
description: "Collect in local currency and get credited in USDT"
slug: en/guides/payins
lang: en
source_url: https://docs.cbpayapp.com/en/guides/payins
---
> **Environments:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

A payin is a fiat collection: your customer pays in local currency and your
account gets credited in USDT automatically, converted at **your payin
rate** (`payin_rate` in `GET /v1/rates`) minus the fixed payin fee when
configured for your account.

Whatever the mode, every path ends the same way — automatic credit +
webhook:

```mermaid
flowchart LR
    qr["Collection QR<br/>(BO, BR·PIX)"] --> pay["Your customer pays<br/>in local currency"]
    hosted["Hosted payment page<br/>(CL: fintoc)"] --> pay
    card["3-D Secure card payment<br/>(BO: card)"] --> pay
    announced["Announced transfer<br/>(CL, PE, MX, PY, US)"] --> pay
    clabe["Dedicated receiving account<br/>(BO, MX, AR)"] --> pay
    pay --> conv["FX conversion at your<br/>payin_rate − fixed fee"]
    conv --> credit(("USDT credit<br/>to your balance"))
    credit --> wh["Webhook payin_credited"]
```

## 1. Discover the available corridors

The available countries, currencies and collection modes are defined by
CBPay. Always check the catalog:

```bash
curl https://api.qbank.cl/platform/v1/payins/methods \
  -H "Authorization: Bearer <token>"
```

```json
{
  "items": [
    { "country": "BO", "currency": "BOB", "method": "qr", "delivery": "push" },
    { "country": "CL", "currency": "CLP", "method": "fintoc", "delivery": "push" },
    { "country": "MX", "currency": "MXN", "method": "bank_transfer", "delivery": "push" }
  ],
  "meta": { "retrieved": 3 }
}
```

`delivery` describes how the payment is confirmed on CBPay's side (bank
notification, polling or both) — it changes nothing in your integration:
you always receive the `payin_credited` webhook.

Collection corridors and modes:

| Country | Currency | Modes |
|---|---|---|
| Chile | CLP | Hosted payment page (`fintoc`), announced bank transfer |
| Peru | PEN | Announced bank transfer |
| Mexico | MXN | Dedicated CLABE account, announced bank transfer |
| Bolivia | BOB / USD | Dedicated BOB account (`bank_transfer`), collection QR, card payment page (`card`) |
| Paraguay | PYG | Announced bank transfer |
| Brazil | BRL | Dynamic PIX QR |
| Argentina | ARS | Dedicated CVU account |
| United States | USD | International card payment page (`card`), announced bank transfer (two rails: domestic wire + international SWIFT) |

> **Note**
**Venezuela (VES)**: pull collection (`c2p` / `debito_inmediato`) is **no
longer available** — creating one responds that the corridor is not
supported. Outgoing payments to Venezuela (`pago_movil`, `bank_transfer`)
are unchanged: see [payouts](https://docs.cbpayapp.com/en/guides/payouts).
Availability may vary; the catalog (`GET /v1/payins/methods`) is always the
source of truth. In every case the credit works the same way: converted to
USDT at your current `payin_rate` and credited net of the fixed payin fee.
If you'd rather keep your collections in another balance (USDC, BTC or
GOLD), configure `default_payin_asset` — see
[the money model](https://docs.cbpayapp.com/en/concepts/money-model#choose-which-balance-receives-your-payins).

## 2. Pick the mode and create the charge

Each country has its own collection mode. The real request and response of
each one:

#### Chile

**Hosted payment page (`fintoc`)** — recommended: you get a `payment_url`;
the payer opens it and transfers from **any Chilean bank or wallet** (Banco
Estado, Santander, Mach, Tenpo, Mercado Pago…). The payment is
detected and validated automatically — no manual references.

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "fintoc",
    "amount": "150000",
    "description": "Top-up order 8841",
    "idempotency_key": "topup-8841"
  }'
```

Response `201`:

```json
{
  "payin_id": "7a2b…",
  "status": "pending",
  "reference": "7a2b…",
  "payment_url": "https://pay.fintoc.com/plink_K2zwNNSxPyx8w3GZ",
  "expires_at": "2026-07-08T18:48:25Z",
  "note": "share the payment_url with the payer; the deposit is credited automatically once the transfer is detected"
}
```

Share the `payment_url` with the payer (link, redirect or WebView). Once
the payment is confirmed your account is credited in USDT and you receive
the `payin_credited` webhook. The CLP amount must be an integer (the
Chilean peso has no decimals) and the payment session expires after 24
hours by default. A retry with the same `idempotency_key` returns the same
payin and the same URL — it never opens a second payment session.

**Announced bank transfer** (manual alternative): announce the incoming
deposit and share the reference with the sender.

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "bank_transfer",
    "amount": "500000"
  }'
```

Response `201`:

```json
{
  "payin_id": "4f81…",
  "status": "pending",
  "reference": "CBJ6T3W9M2K5",
  "note": "include the reference in the transfer description so the deposit is credited automatically"
}
```

When the transfer arrives it is matched by the reference in the transfer
description and your account is credited automatically. If the reference
does not travel, the payer's document backs it up — see
[matching an announced transfer](#matching-an-announced-transfer).

#### Peru

**Announced bank transfer**, same as Chile but in soles:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PE",
    "currency": "PEN",
    "method": "bank_transfer",
    "amount": "1800.00"
  }'
```

Response `201`:

```json
{
  "payin_id": "6d20…",
  "status": "pending",
  "reference": "CBK7M2Q9X4T3",
  "note": "include the reference in the transfer description so the deposit is credited automatically"
}
```

The `reference` is a **short 12-character alphanumeric code** (it fits any
bank concept field) and must travel in the transfer description for the
automatic match. Send `payer_document` as a backup —
[how matching works](#matching-an-announced-transfer).

#### Mexico

**Dedicated CLABE account** (recommended): create a fixed CLABE bound to
your account — every SPEI arriving to it is credited automatically, no
references needed:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins/deposit-accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "country": "MX", "currency": "MXN" }'
```

Response `201`:

```json
{
  "instrument_id": "a1d4…",
  "account_id": "…",
  "country": "MX",
  "currency": "MXN",
  "method": "bank_transfer",
  "instrument": "734180000151000006",
  "status": "active"
}
```

`instrument` is the CLABE you share with your payers. Creation is free;
each deposit pays the regular payin fee. List your accounts with
`GET /v1/payins/deposit-accounts`.

You can also use a one-off **announced bank transfer**
(`POST /v1/payins` with `method: "bank_transfer"`, `country: "MX"`).

#### Bolivia

**Dedicated BOB receiving account**: for the fixed-account flow, use the
[BOB virtual accounts guide](https://docs.cbpayapp.com/en/guides/bob-virtual-accounts). It returns one
stable `instrument` per account; the payer transfers BOB to that number and
the credit is detected by polling. No announcement or payer reference is
required.

**Collection QR** (the local interoperable standard): you generate the QR
and your customer scans it with their banking app.

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
    "expires_in": 3600
  }'
```

Response `201`:

```json
{
  "payin_id": "9c2a…",
  "status": "pending",
  "charge": {
    "charge_id": "…",
    "qr_image": "<base64>",
    "qr_image_url": "https://cdn.cbpayapp.com/public/payin-qr/<charge_id>.png",
    "qr_payload": "<QR content>",
    "our_reference": "482915073",
    "status": "pending"
  }
}
```

Display the QR to your customer — `qr_image_url` is a public CDN URL ready
for an `` tag (prefer it over the base64 `qr_image`); when they pay,
your account is credited automatically. It also works in USD
(`currency: "USD"`).

**Card payment page (`card`)**: you receive a `payment_url` for a hosted
3-D Secure checkout — the payer enters their card on a secure page branded
with your organization's identity and, when their bank requires it,
completes the authentication challenge right there. Card data never touches
your system or your integration.

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "BO",
    "currency": "BOB",
    "method": "card",
    "amount": "700.00",
    "description": "App top-up",
    "customer": { "email": "payer@example.com", "first_name": "Ana", "last_name": "Rojas" },
    "success_url": "https://your-app.com/payment/ok",
    "failure_url": "https://your-app.com/payment/error",
    "idempotency_key": "topup-7719"
  }'
```

Response `201`:

```json
{
  "payin_id": "b41c…",
  "status": "pending",
  "reference": "b41c…",
  "payment_url": "https://api.qbank.cl/pay/cards/9f3XkT…",
  "expires_at": "2026-07-16T18:30:00Z",
  "note": "share the payment_url with the payer; the balance is credited automatically once the card payment is approved"
}
```

Share the `payment_url` (link, redirect or WebView). Flow details:

- `customer` is an **optional** prefill of the billing details (`email`,
  `first_name`, `last_name`, `address`, `city`, `administrative_area`,
  `postal_code`, `country` — plain text, max 120 chars per field); the
  payer can complete/correct them on the page. `administrative_area` is
  the billing state/region: an ISO 3166-2 code (`US-CA`) or its suffix
  (`CA`).

**Billing address — state/region required by country**: the hosted page
collects the **full billing address** (name, email, street, country, city,
state/region and postal code). The **state/region** field is **mandatory
whenever the billing country has ISO 3166-2 subdivisions** (for example
the United States, Canada, Mexico, Brazil or Chile): the payer picks it
from a dropdown fed by the address catalog, and the page does not submit
the payment without it. If the country has no subdivisions in the
catalog, the field is hidden. The value travels as `administrative_area`
(ISO 3166-2). The billing address is validated **before** the charge is
sent for authorization: if it is incomplete, or the state/region is
missing for a country that requires it, the payment is rejected with
`invalid_payload` and **no authorization is created on the card**.

> **Note**
A card authorization created with an incomplete billing address can be
declined later at capture by the issuer. Always collect the full billing
address — including the state/region when the country has subdivisions —
so the payment can be captured.
- `success_url` / `failure_url` (optional, public https) redirect the payer
  when done; without them the page shows the final result.
- `expires_at` (optional, RFC3339, at least 15 minutes ahead) shortens the
  session lifetime; the default is 24 hours. If it expires unpaid, the
  payin moves to `expired` and you receive the `payin_expired` webhook.
- The payer has a limited number of attempts; an issuer decline lets them
  retry with another card within the same session.
- Approval is online: once the charge is approved your account is credited
  in USDT at your `payin_rate` and you receive `payin_credited` — same as
  every other mode.
- A retry with the same `idempotency_key` returns the same payin and the
  same `payment_url`; it never opens a second payment session.
- If the payer already saved cards with you, the page offers them on its
  own: they type their email (first field), verify it with a code and pay
  with one of them without re-typing it — with "Remember this device" they
  skip the code for 30 days. Details in
  [stored cards](https://docs.cbpayapp.com/en/guides/stored-cards-subscriptions#the-payer-discovers-their-cards-on-the-payment-page).
- It also works in USD (`currency: "USD"`).
- **Settlement delay**: when your `payin_card` fee is configured with
  `settlement_hours` above zero, an approved charge confirms the payin as
  `credited` immediately — the `payin_credited` webhook fires and the
  checkout closes as paid — but the **balance** only becomes available at
  `settle_at` (RFC 3339, in the create/GET/list responses together with
  `settlement_pending: true`), or earlier if your org admin releases it
  manually; once released, the payin carries `settled_at`. The
  `payin_settlement_scheduled` webhook fires exactly once at confirmation
  with `status: "credited"` and the scheduled amounts. The same delay
  applies when a [checkout link](https://docs.cbpayapp.com/en/guides/checkout) or a
  [POS charge](https://docs.cbpayapp.com/en/guides/qr-pos) is paid by card. Details in
  [fees — card payin settlement delay](https://docs.cbpayapp.com/en/concepts/fees#card-payin-settlement-delay).

#### Paraguay

**Announced bank transfer** in guaraníes: you announce the deposit, your
payer transfers (interbank SIPAP or an internal transfer at the receiving
bank) with the reference in the transfer concept, and the credit is
detected automatically.

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "PY",
    "currency": "PYG",
    "method": "bank_transfer",
    "amount": "596000"
  }'
```

Response `201`:

```json
{
  "payin_id": "8f41…",
  "status": "pending",
  "reference": "CBW4N8R2T6P9",
  "note": "include the reference in the transfer description so the deposit is credited automatically"
}
```

> **Note**
Guaraníes use no decimals: announce the **exact integer amount** your
payer will transfer (e.g. `"596000"`). The `reference` is a short
12-character alphanumeric code — designed for the SIPAP concept field,
which accepts **at most 20 characters and no special characters** — and
putting it in the concept ensures the automatic match. Send
`payer_document` as a backup — see
[matching an announced transfer](#matching-an-announced-transfer).
#### Brazil

**Dynamic PIX QR**: the same endpoint generates a PIX QR with the amount
embedded.

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
    "expires_in": 1800
  }'
```

In the response, `charge.qr_payload` is the PIX **"copia e cola"** code,
so the payer can paste it into their banking app instead of scanning the
image (`charge.qr_image` base64 or `charge.qr_image_url`, the public CDN
URL). The QR expires per `expires_in` (default 1
hour); the payment is credited automatically once confirmed on the rail
(continuous reconciliation — check on demand with
`GET /v1/payins/{charge_id}`).

> **Note**
In Brazil collections work exclusively through dynamic PIX QR (one QR = one
payment, exact amount embedded). Announced bank transfers will come later.
#### Argentina

**Dedicated CVU account**: create a fixed CVU bound to your account —
every ARS transfer arriving to it (from any CBU or CVU in the Argentine
system) is credited automatically, no references needed:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins/deposit-accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "country": "AR", "currency": "ARS" }'
```

Response `201`:

```json
{
  "instrument_id": "f2b8…",
  "account_id": "…",
  "country": "AR",
  "currency": "ARS",
  "method": "bank_transfer",
  "instrument": "0000079900000000132537",
  "status": "active"
}
```

`instrument` is the 22-digit CVU you share with your payers. Creation is
free; every deposit pays the regular payin fee. List your accounts with
`GET /v1/payins/deposit-accounts`.

> **Note**
The CVU works in **ARS only** and is deposit-only (receive-only): no
third party can debit it. Direct debit attempts (DEBIN) against a deposit
CVU are rejected automatically.
#### United States

**International card payment page (`card`)**: charge in US dollars with
Visa, Mastercard, American Express, Discover and Diners cards issued
anywhere. You get a `payment_url` for a hosted checkout with 3-D Secure
branded with your organization; card data is typed into the processor's
secure fields embedded in that page and **never touches your system or your
integration**.

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "card",
    "amount": "49.90",
    "description": "Pro plan",
    "customer": { "email": "payer@example.com", "first_name": "Ana", "last_name": "Rojas" },
    "success_url": "https://your-app.com/payment/ok",
    "failure_url": "https://your-app.com/payment/error",
    "save_card": true,
    "payer_reference": "customer-7719",
    "idempotency_key": "pro-plan-7719"
  }'
```

Response `201`:

```json
{
  "payin_id": "3ab7…",
  "status": "pending",
  "reference": "3ab7…",
  "payment_url": "https://api.qbank.cl/pay/cards/Kt9XmQ…",
  "expires_at": "2026-07-26T18:30:00Z",
  "note": "share the payment_url with the payer; the balance is credited automatically once the card payment is approved"
}
```

The contract is the **same** as the Bolivian card page (optional `customer`,
`success_url`/`failure_url`, `expires_at`, limited attempts, an idempotent
retry returns the same `payment_url`). What is specific to the international
corridor:

- 3-D Secure runs inside the page: if the issuer asks for a challenge, the
  payer completes it right there without leaving the checkout.
- Most charges are approved online; if the issuer leaves the charge under
  verification, the credit lands as soon as the rail confirms it — you still
  get `payin_credited`, just a few minutes later.
- `save_card: true` plus `payer_reference` store the card with the payer's
  consent for later charges (see
  [stored cards and subscriptions](https://docs.cbpayapp.com/en/guides/stored-cards-subscriptions)).
- If the payer already has saved cards, the page offers them after they
  verify their email with a code (once per device when they check
  "Remember this device", valid for 30 days) — they pay with 3-D Secure
  without re-typing the card.

> **Note**
The international card corridor is enabled per account. Check
`GET /v1/payins/methods` — it is the source of truth for what your account
can collect today.
**Announced bank transfer (`bank_transfer`) — two rails: domestic wire and international SWIFT**: collect dollars
from any US bank account, with the same announced-transfer contract as the
other countries. The US/USD corridor publishes **two deposit instructions**
on purpose — a domestic rail (ABA routing number) for senders banking inside
the US, and an international rail (SWIFT/BIC through a correspondent bank)
for senders wiring from abroad. Announce the deposit once and the response
carries both blocks — `deposit_instructions` (domestic) and
`deposit_instructions_swift` (international) — each with its own copy-paste
QR, so your payer picks the rail their bank supports:

```bash
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "USD",
    "method": "bank_transfer",
    "amount": "1250.00",
    "payer_name": "Acme Holdings LLC",
    "idempotency_key": "invoice-1042"
  }'
```

Response `201`:

#### Domestic wire (ABA)

```json
{
  "payin_id": "8f4e…",
  "status": "pending",
  "reference": "CBM4X8Q2T7K9",
  "note": "include the reference in the transfer description so the deposit is credited automatically",
  "payer_source": "declared",
  "payer_name": "Acme Holdings LLC",
  "deposit_instructions": {
    "bank_name": "Partner Bank, N.A.",
    "account_number": "000123456789",
    "account_type": "checking",
    "holder_name": "CBPay Operations LLC",
    "holder_tax_id": "88-1234567",
    "routing_number": "021000021",
    "holder_address": "25 SW 9th Street, Suite 406, Miami, FL 33130, US",
    "reference_required": true,
    "qr_payload": "Bank: Partner Bank, N.A.\nAccount type: checking\nAccount number: 000123456789\nRouting number (ABA): 021000021\nHolder: CBPay Operations LLC\nHolder address: 25 SW 9th Street, Suite 406, Miami, FL 33130, US\nTax ID: 88-1234567\nAmount: 1250.00 USD\nReference: CBM4X8Q2T7K9",
    "qr_png_base64": "iVBORw0KGgoAAAANSUhEUgAA…"
  }
}
```

For payers banking **inside the US**: a domestic wire (or ACH) with the
`routing_number` (ABA). This rail has no SWIFT code — domestic US transfers
do not need one.

#### International SWIFT (BIC)

```json
{
  "payin_id": "8f4e…",
  "status": "pending",
  "reference": "CBM4X8Q2T7K9",
  "note": "include the reference in the transfer description so the deposit is credited automatically",
  "payer_source": "declared",
  "payer_name": "Acme Holdings LLC",
  "deposit_instructions_swift": {
    "bank_name": "Partner Bank International",
    "account_number": "9870001234",
    "account_type": "checking",
    "holder_name": "CBPay Operations LLC",
    "holder_tax_id": "88-1234567",
    "swift": "PRTBPRI3",
    "bank_address": "200 Example Blvd, San Juan, PR 00901, PR",
    "intermediary_bank_name": "Intermediary Bank N.A.",
    "intermediary_bank_swift": "INTRUS33",
    "holder_address": "25 SW 9th Street, Suite 406, Miami, FL 33130, US",
    "notes": "Select Puerto Rico as the final beneficiary bank country",
    "reference_required": true,
    "qr_payload": "Bank: Partner Bank International\nAccount type: checking\nAccount number: 9870001234\nSWIFT: PRTBPRI3\nBank address: 200 Example Blvd, San Juan, PR 00901, PR\nIntermediary bank: Intermediary Bank N.A.\nIntermediary SWIFT: INTRUS33\nHolder: CBPay Operations LLC\nHolder address: 25 SW 9th Street, Suite 406, Miami, FL 33130, US\nTax ID: 88-1234567\nAmount: 1250.00 USD\nReference: CBM4X8Q2T7K9\nNote: Select Puerto Rico as the final beneficiary bank country",
    "qr_png_base64": "iVBORw0KGgoAAAANSUhEUgAA…"
  }
}
```

For payers wiring **from outside the US**: an international SWIFT transfer
with the `swift` (BIC) and the correspondent bank
(`intermediary_bank_name` / `intermediary_bank_swift`). The `notes` field
carries the operational hints the sending bank needs to fill its form
correctly (here: which country to select for the final beneficiary bank) —
show it to the payer verbatim.

The payer copies the `reference` (`CB…`) into the transfer **memo /
remittance** field of whichever rail they use: it is the signal that matches
the deposit to your announcement (see
[matching an announced transfer](#matching-an-announced-transfer)).
`holder_address` is the postal address of the account holder — US banks ask
for it in their wire form, and the QR of each rail includes it as a
"Holder address" line whenever it has a value (same for `notes` as a "Note"
line). `intermediary_bank_name` / `intermediary_bank_swift` appear only on
the rail that receives wires through a correspondent bank — show them to the
payer exactly as they come; a wire that needs them and travels without them
can bounce or arrive short.

US deposit instructions are **mandatory** on this corridor: if your
organization has not configured them yet, the announcement responds
`422 deposit_instructions_unavailable` and nothing is created (see
[common errors](#common-errors)). You can preview both destination accounts
without announcing with
`GET /v1/payins/deposit-instructions?country=US&currency=USD&method=bank_transfer`.

## Universal checkout link (`checkout`)

The universal payment link now lives in its own guide, covering the quote
engine, every rail and the public endpoints:

- **Checkout** - One link where the payer chooses how to pay - fiat in every live country, crypto, card or the CBPay app - settled in the balance you choose.

## Saved cards and recurring charges (card)

Stored credentials (COF) and scheduled subscriptions moved to their own
guide:

- **Stored cards & subscriptions** - Save cards with the payer's consent, charge them one-click or without the payer present, and schedule recurring subscriptions.

## Refunds (card)

A credited card payin can be refunded in full or in part from your balance,
with its own ledger entry, receipt and webhook:

- **Payin refunds** - Refund a card payin fully or partially, void a same-day charge, and understand how a chargeback is applied.

## Matching an announced transfer

An announced transfer (`method: "bank_transfer"`) has no payment session:
the payer moves the money from their own bank, so the deposit is recognized
when it lands. Matching runs in this order and stops at the first hit:

1. **`reference`** — the 12-character code in the transfer description.
2. **Payer document** — the announcement's `payer_document` against the
   payer the bank reports (dots, dashes and check digit are ignored).
3. **Single candidate** — exactly one pending announcement for that amount
   and currency.

> **Important**
If none of the three resolves to **one** announcement — two pending
announcements for the same amount, no reference, no payer document — the
deposit is **not** credited on a guess: it lands as `unassigned` and your
CBPay operator routes it. No money is lost; it is already in the collection
account.
### Identify the payer (optional, recommended)

`method: "bank_transfer"` accepts the payer's data. Every field is optional
and additive — existing integrations keep working unchanged:

| Field | Matched against |
|---|---|
| `payer_document` | Tax ID / national ID reported by the bank (dots, dashes and check digit ignored) |
| `payer_name` | Payer name, by tokens (`JUAN PEREZ` matches `PEREZ JUAN SOTO`) |
| `payer_account` | Payer account number, by its digits |

```bash Request
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "bank_transfer",
    "amount": "500000",
    "payer_document": "17438319-7"
  }'
```

```json Response 201
{
  "payin_id": "4f81…",
  "status": "pending",
  "reference": "CBJ6T3W9M2K5",
  "note": "include the reference in the transfer description so the deposit is credited automatically",
  "payer_source": "declared",
  "payer_document": "17438319-7"
}
```
`payer_source` always comes back so your checkout knows what to ask the
payer for:

| Value | Meaning |
|---|---|
| `declared` | You sent payer data — the document backs up the reference |
| `account_identity` | No payer sent: the verified tax ID of your account is used (the holder deposits to themselves) |
| `none` | No identity available — **insist on the reference**, it is the only strong signal left |

> **Note**
A document shorter than 5 characters or with no digits is dropped as a
signal (it cannot be told apart from an amount or a bank code). The
announcement is still created and `payer_source` reports the real coverage.
### Retries and idempotency

The announcement accepts `idempotency_key` (body) or the `Idempotency-Key`
header. A retry with the same key returns the **original** announcement —
same `reference` — with `idempotency_hit: true` and HTTP `200` instead of
creating a second one.

```bash Request (retry)
curl -X POST https://api.qbank.cl/platform/v1/payins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: topup-9912" \
  -d '{
    "country": "CL",
    "currency": "CLP",
    "method": "bank_transfer",
    "amount": "500000",
    "payer_document": "17438319-7"
  }'
```

```json Response 200
{
  "payin_id": "4f81…",
  "status": "pending",
  "reference": "CBJ6T3W9M2K5",
  "note": "include the reference in the transfer description so the deposit is credited automatically",
  "payer_source": "declared",
  "payer_document": "17438319-7",
  "idempotency_hit": true
}
```
> **Important**
Two live announcements that look identical (same account, currency, amount
and payer) are exactly the case matching refuses to resolve: the real
deposit matches both and lands `unassigned`. That is why a POST **without**
a key reuses a live identical announcement instead of duplicating it (also
`200` with `idempotency_hit: true`).

To collect **two real payments** of the same amount from the same payer,
send a different `idempotency_key` for each one — each key creates its own
announcement with its own `reference`.
> **Note**
Keys are **unique per account and per logical operation**: if you reuse an
`idempotency_key` that was already used with ANOTHER payin method (QR,
checkout, card), the API replies `409 idempotency_conflict` instead of
returning an object that does not match your request.
### Deposit instructions: where to send the money

On corridors where your organization registered a destination account for
announced transfers (today Chile, Paraguay and the United States), the
announcement response includes a `deposit_instructions` block — the exact
bank account the payer must transfer to, with the amount and `reference`
already baked into a copy-paste QR:

```json Response 201 (with deposit instructions)
{
  "payin_id": "4f81…",
  "status": "pending",
  "reference": "CBJ6T3W9M2K5",
  "note": "include the reference in the transfer description so the deposit is credited automatically",
  "payer_source": "declared",
  "payer_document": "17438319-7",
  "deposit_instructions": {
    "bank_name": "Banco Ejemplo",
    "account_number": "001122334455",
    "account_type": "checking",
    "holder_name": "CBPay Operations SpA",
    "holder_tax_id": "77123456-7",
    "reference_required": true,
    "qr_payload": "Bank: Banco Ejemplo\nAccount type: checking\nAccount number: 001122334455\nHolder: CBPay Operations SpA\nTax ID: 77123456-7\nAmount: 500000 CLP\nReference: CBJ6T3W9M2K5",
    "qr_png_base64": "iVBORw0KGgoAAAANSUhEUgAA…"
  }
}
```

You can also preview the destination account **before** creating a payin —
useful to show the payer where they will need to send money once they
confirm:

```bash
curl "https://api.qbank.cl/platform/v1/payins/deposit-instructions?country=CL&currency=CLP&method=bank_transfer" \
  -H "Authorization: Bearer <token>"
```

```json Response 200
{
  "deposit_instructions": {
    "bank_name": "Banco Ejemplo",
    "account_number": "001122334455",
    "account_type": "checking",
    "holder_name": "CBPay Operations SpA",
    "holder_tax_id": "77123456-7",
    "reference_required": true,
    "qr_payload": "Bank: Banco Ejemplo\nAccount type: checking\nAccount number: 001122334455\nHolder: CBPay Operations SpA\nTax ID: 77123456-7",
    "qr_png_base64": "iVBORw0KGgoAAAANSUhEUgAA…"
  }
}
```

On the **US/USD** corridor the preview returns **two blocks**: the domestic
rail under `deposit_instructions` and, when your organization has the
international variant configured, the SWIFT rail under
`deposit_instructions_swift` (same shape, its own QR). The rail fields are
absent (not empty) on corridors that do not use them:

| Field | What it is |
|---|---|
| `routing_number` | ABA routing number of the destination bank — domestic rail (`deposit_instructions`) |
| `swift` | SWIFT/BIC of the destination bank — international rail (`deposit_instructions_swift`) |
| `bank_address` | Registered address of the destination bank |
| `intermediary_bank_name` | Correspondent bank, when wires arrive through one |
| `intermediary_bank_swift` | SWIFT/BIC of the correspondent bank |
| `holder_address` | Postal address of the account holder (US wire forms ask for it) |
| `notes` | Free operational note for the sending bank (e.g. which country to select for the final beneficiary bank) |

```bash
curl "https://api.qbank.cl/platform/v1/payins/deposit-instructions?country=US&currency=USD&method=bank_transfer" \
  -H "Authorization: Bearer <token>"
```

```json Response 200 (US)
{
  "deposit_instructions": {
    "bank_name": "Partner Bank, N.A.",
    "account_number": "000123456789",
    "account_type": "checking",
    "holder_name": "CBPay Operations LLC",
    "holder_tax_id": "88-1234567",
    "routing_number": "021000021",
    "holder_address": "25 SW 9th Street, Suite 406, Miami, FL 33130, US",
    "reference_required": true,
    "qr_payload": "Bank: Partner Bank, N.A.\nAccount type: checking\nAccount number: 000123456789\nRouting number (ABA): 021000021\nHolder: CBPay Operations LLC\nHolder address: 25 SW 9th Street, Suite 406, Miami, FL 33130, US\nTax ID: 88-1234567",
    "qr_png_base64": "iVBORw0KGgoAAAANSUhEUgAA…"
  },
  "deposit_instructions_swift": {
    "bank_name": "Partner Bank International",
    "account_number": "9870001234",
    "account_type": "checking",
    "holder_name": "CBPay Operations LLC",
    "holder_tax_id": "88-1234567",
    "swift": "PRTBPRI3",
    "bank_address": "200 Example Blvd, San Juan, PR 00901, PR",
    "intermediary_bank_name": "Intermediary Bank N.A.",
    "intermediary_bank_swift": "INTRUS33",
    "holder_address": "25 SW 9th Street, Suite 406, Miami, FL 33130, US",
    "notes": "Select Puerto Rico as the final beneficiary bank country",
    "reference_required": true,
    "qr_payload": "Bank: Partner Bank International\nAccount type: checking\nAccount number: 9870001234\nSWIFT: PRTBPRI3\nBank address: 200 Example Blvd, San Juan, PR 00901, PR\nIntermediary bank: Intermediary Bank N.A.\nIntermediary SWIFT: INTRUS33\nHolder: CBPay Operations LLC\nHolder address: 25 SW 9th Street, Suite 406, Miami, FL 33130, US\nTax ID: 88-1234567\nNote: Select Puerto Rico as the final beneficiary bank country",
    "qr_png_base64": "iVBORw0KGgoAAAANSUhEUgAA…"
  }
}
```

> **Note**
The preview endpoint's `qr_payload` has no `Amount`/`Reference` lines (there
is no payin yet); the one embedded in an actual announcement always has
both, so the payer can pay without typing anything by hand. Both blocks on
the announcement are a **frozen snapshot**: if your CBPay operator later
updates a registered account, live announcements keep pointing at the
account they were created with — only new ones pick up the change.
The exact same `deposit_instructions` (and `deposit_instructions_swift`,
when present) blocks are echoed back on
`GET /v1/payins/{id}` and on the list (`GET /v1/payins`), so your front end
does not need to cache it from the creation response. On corridors without a
registered destination account, the field is simply absent — fall back to
showing the `reference` and asking the payer to use their usual bank details
for your organization.

## 3. Receiving the credit

When the payment arrives (through any of the modes), your account is
credited automatically and the `payin_credited` webhook fires:

```json
{
  "payin_id": "9c2a…",
  "account_id": "…",
  "country": "BO",
  "currency": "BOB",
  "local_amount": "700.00",
  "fx_rate": "6.91",
  "usdt_credited": "100.302460",
  "fee": "1.000000"
}
```

`fx_rate` is your `payin_rate` at credit time — the conversion happens at
exactly that rate: `usdt_gross = 700.00 / 6.91`.

The payin object keeps the full detail:

```bash
curl https://api.qbank.cl/platform/v1/payins/9c2a… \
  -H "Authorization: Bearer <token>"
```

```json
{
  "payin_id": "9c2a…",
  "kind": "qr",
  "status": "credited",
  "local_amount": "700.00",
  "fx_rate": "6.91",
  "usdt_gross": "101.302460",
  "fee": "1.000000",
  "usdt_credited": "100.302460"
}
```

## Statuses

| Status | Meaning |
|---|---|
| `pending` | Charge created, waiting for the payment |
| `credited` | Payment received and credited in USDT |
| `unassigned` | Deposit received without an automatic match (routed by the administrator) |
| `expired` | The charge expired unpaid |
| `failed` | The collection failed |

> **Note**
A deposit that cannot be resolved to a single announcement stays
`unassigned` until the CBPay team routes it to an account (see
[matching an announced transfer](#matching-an-announced-transfer)). Once
assigned, it is credited with the destination account's rate and fees, and
the announcement it belonged to is closed.
> **Note**
When an active charge (QR or checkout) dies unpaid, the payin moves from
`pending` to `expired` (or `failed`) automatically and you receive the
[`payin_expired`](https://docs.cbpayapp.com/en/webhooks) webhook. No funds move: to retry the
collection, create a new payin.
## Reads and history

```bash
# One payin
curl https://api.qbank.cl/platform/v1/payins/9c2a… \
  -H "Authorization: Bearer <token>"

# History with filters
curl "https://api.qbank.cl/platform/v1/payins?from=2026-07-01&to=2026-07-08&status=credited&country=BO&page_size=50" \
  -H "Authorization: Bearer <token>"
```

`from`/`to` use `YYYY-MM-DD` (organization timezone); an invalid date responds
`400 invalid_range`.

## Common errors

| HTTP | `error` | What to do |
|---|---|---|
| 400 | `invalid_request` | Check `method` (qr, bank_transfer, fintoc, card; collect has its own endpoint) |
| 400 | `idempotency_key_required` | Collect requires an idempotency key (real debit against the payer) |
| 403 | `service_disabled` | Payins is not enabled for your account — see [services](https://docs.cbpayapp.com/en/concepts/services) |
| 422 | `core_rejected` | The processor rejected the charge; check the message |
| 422 | `deposit_instructions_unavailable` | `bank_transfer` on a corridor that requires a registered destination account (today CL, PY, US) and your organization has not configured one yet — contact your CBPay operator |
| 502 | `core_unavailable` | The charge could not be created; retry the creation (nothing was charged) |

> **Note**
`GET /v1/payins/deposit-instructions` responds `404 not_found` when the
corridor has no active destination account configured — treat it the same
way as the `422` above: the payer cannot be shown an account yet.
## FAQ

#### How do I know a payin was credited?
Subscribe to `payin_credited`: it carries the FX rate applied, the fee and
the exact `usdt_credited`. You can also poll `GET /v1/payins/{id}`.
#### Which FX rate applies to my payin?
The `payin_rate` in force at credit time (see `GET /v1/rates`). Your
agreed spread is already inside the rate — it is never itemized.
#### Can payins land in a balance other than USDT?
Yes — set `default_payin_asset` with `PUT /v1/settlement`. The credit still
enters in USDT and is converted right after at the real price;
`conversion_status` reports `done` or `pending_retry` (auto-retried).
#### What happens when a charge (QR, checkout) expires unpaid?
You receive `payin_expired` and the payin closes without moving money.
Create a new charge — nothing was debited or credited.
#### The payer transferred a different amount than announced — what now?
The reference still matches the announcement, but the amount that arrived is
what gets credited. A transfer that resolves to no announcement stays
`unassigned` for reconciliation; your CBPay team can assign it to the right
payin manually.
#### Two clients announced the same amount and neither sent the reference — who gets the money?
Nobody by chance. If the payer document does not tell them apart, both
announcements stay `pending` and the deposit lands as `unassigned` for the
operator to route. Sending `payer_document` in the announcement is what
turns this case into an automatic credit.
#### Do I have to send payer_document now?
No — it is optional and nothing breaks without it. When you omit it, the
verified tax ID of the account is used (`payer_source: account_identity`),
which covers self-deposits. Send it whenever a third party pays for your
client, and always show the `reference` to the payer.
#### I retried the announcement POST — did I create two announcements?
No. With `idempotency_key` (body or `Idempotency-Key` header) the retry
returns the original announcement with `idempotency_hit: true`. Even without
a key, a POST that is identical to a live announcement (same account,
currency, amount and payer) reuses it — duplicating it would leave the real
deposit `unassigned` for ambiguity. Send different keys only when you really
want to collect twice.
#### How does my US client pay — domestic wire or international SWIFT?
The corridor publishes two destination accounts on purpose, and your payer
picks the rail their bank supports: senders banking **inside the US** use
the domestic rail (`deposit_instructions`) with the `routing_number` (ABA) —
a Fedwire or ACH; senders **outside the US** use the international rail
(`deposit_instructions_swift`) with the `swift` (BIC), the correspondent
bank (`intermediary_bank_name` / `intermediary_bank_swift`) and the `notes`
hints for the wire form. Whatever the rail, the `reference` (`CB…`) in the
memo / remittance field is what credits the deposit automatically. A wire is
usually reported the same business day; an ACH can take one to three
business days depending on the sending bank — the credit and the
`payin_credited` webhook happen the moment the bank reports the deposit.
#### Why is the bank QR just text to copy, not something my banking app scans?
Banks don't share a common QR standard for arbitrary destination accounts
(unlike a merchant QR at checkout) — every bank encodes account transfers
differently, and most banking apps can't auto-fill a transfer from a
third-party QR at all. `qr_png_base64` renders the account details as a QR
purely as a **copy shortcut on mobile**: the payer scans it, gets the
multi-line text (bank, account, holder, amount, reference), and pastes it
into their own bank's transfer form — they still confirm the transfer
themselves. Don't build a scan-and-pay flow around it; show it next to the
plain-text fields so the payer can always type them manually.
