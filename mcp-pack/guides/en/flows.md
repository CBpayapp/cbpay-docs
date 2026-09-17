---
title: "Integration flows"
description: "The end-to-end flows of a typical integration, with step-by-step sequence diagrams"
slug: en/flows
lang: en
source_url: https://docs.cbpayapp.com/en/flows
---
This page connects the products into **complete business flows**: what to
call, what to expect and which webhook closes each cycle. Every flow links
to its product's detailed guide.

## 1. Funding the account

Three paths for money to come in; all end with a USDT credit and a
webhook:

```mermaid
sequenceDiagram
    participant App as Your app
    participant CB as CBPay
    participant Pagador as Payer / Network
    App->>CB: POST /v1/payins (or crypto wallet)
    CB-->>App: pending + payment data (QR, URL, reference, address)
    App->>Pagador: share the payment method
    Pagador->>CB: pays (transfer, QR, on-chain USDT)
    CB->>CB: converts at your payin_rate − fee (fiat)
    CB-->>App: webhook payin_credited / crypto_deposit_credited
    App->>CB: GET /v1/balances (verify)
```

| Path | Endpoint | Closing webhook |
|---|---|---|
| Fiat collection (QR, transfer, payment page, pull) | `POST /v1/payins` / `/collect` | `payin_credited` |
| On-chain USDT deposit | `POST /v1/crypto/wallets` (fixed address) | `crypto_deposit_credited` |
| Internal transfer from another account | — (the sender initiates it) | `transfer_received` |

Details: [payins](https://docs.cbpayapp.com/en/guides/payins) · [crypto](https://docs.cbpayapp.com/en/guides/crypto) ·
[transfers](https://docs.cbpayapp.com/en/guides/transfers).

## 2. Dispersing (payout)

```mermaid
sequenceDiagram
    participant App as Your app
    participant CB as CBPay
    participant Banco as Local rail
    App->>CB: POST /v1/payouts (idempotency_key)
    CB-->>App: 202 processing (fx_rate, total_debit; debit sits in held)
    CB->>Banco: executes the dispersal
    alt paid
        Banco-->>CB: confirmation
        CB-->>App: webhook payout_status_changed (completed)
    else rejection
        Banco-->>CB: rejection
        CB->>CB: refunds the FULL debit to available
        CB-->>App: webhook payout_status_changed (failed + status_code)
    end
    App->>CB: GET /v1/payouts/{id} (verify final state)
```

**QR** variant (Bolivia, Brazil PIX): `POST /v1/payouts/qr/scan` (free,
decodes) → show the data → `POST /v1/payouts/qr/confirm` (charged like a
normal payout). Details: [payouts](https://docs.cbpayapp.com/en/guides/payouts) ·
[QR payout](https://docs.cbpayapp.com/en/guides/qr-payout).

## 3. Collecting from a customer

Pick the mode based on the country and the experience you want:

| Mode | Countries | Payer experience | Confirmation |
|---|---|---|---|
| Hosted payment page | CL | Opens a URL and pays from their bank | Automatic |
| QR | BO, BR (PIX) | Scans with their banking app | Automatic |
| Announced transfer | CL, PE, MX, BR | Transfers including the reference | Automatic by reference (or amount) |
| Dedicated CLABE / CVU | MX, AR | Transfers to a fixed account of yours | Automatic, no references |
| Card payment | BO (BOB/USD) | Enters their card on a secure hosted page (3DS) | Automatic |
| Universal checkout link | Every live country + crypto + cards | Opens one link and picks how to pay | Automatic |

All close with `payin_credited` and the net credit in your balance.
Details: [payins](https://docs.cbpayapp.com/en/guides/payins) · [checkout](https://docs.cbpayapp.com/en/guides/checkout).

## 4. Checkout end-to-end

One link, every rail, settled in the balance you choose:

```mermaid
sequenceDiagram
    participant App as Your app
    participant CB as CBPay
    participant Pagador as Payer
    App->>CB: POST /v1/payins (method: checkout, amount, settlement_asset)
    CB-->>App: checkout_url (branded public page)
    App->>Pagador: share the link
    Pagador->>CB: picks fiat / crypto / card / CBPay app and pays
    CB->>CB: credits and auto-converts to your settlement_asset
    CB-->>App: webhook payin_credited (settled_via, conversion_status)
```

Details: [checkout](https://docs.cbpayapp.com/en/guides/checkout).

## 5. Saved cards and subscriptions

Save the card once (with the payer's consent) and charge it later —
one-click, merchant-initiated (MIT) or on a recurring schedule:

```mermaid
sequenceDiagram
    participant App as Your app
    participant CB as CBPay
    participant Pagador as Payer
    App->>CB: POST /v1/payins (method: card, save_card: true)
    Pagador->>CB: pays with 3DS and ticks "save my card"
    CB-->>App: webhook card_stored (stored_card_id)
    App->>CB: POST /v1/stored-cards/{id}/charges (MIT, payer absent)
    CB-->>App: webhook payin_credited
    App->>CB: POST /v1/subscriptions (interval + amount)
    CB-->>App: payin_credited per period + subscription_status_changed
```

Details: [stored cards & subscriptions](https://docs.cbpayapp.com/en/guides/stored-cards-subscriptions).

## 6. QR POS charge (processors)

For companies operating physical points of sale:

```mermaid
sequenceDiagram
    participant POS as Your POS
    participant CB as CBPay
    participant Cliente as Customer
    POS->>CB: POST /v1/pos/merchants (verified merchant, once)
    POS->>CB: POST /v1/pos/charges (amount, idempotency_key)
    CB-->>POS: exclusive crypto address + QR + quoted due
    Cliente->>CB: pays in crypto (partial payments accumulate)
    CB-->>POS: webhook payin_credited (pos_merchant attribution)
```

Details: [QR POS](https://docs.cbpayapp.com/en/guides/qr-pos).

## 7. Converting balances (swaps)

```mermaid
flowchart LR
    Q["GET /v1/swaps/quote<br/>(indicative, free)"] --> S["POST /v1/swaps<br/>(idempotency_key)"]
    S --> B["Instant credit in the<br/>target balance"]
```

One call converts between USDT, USDC, BTC, GOLD, SILVER and PLATINUM at your account's
rate — no money leaves the account, so no OTP is required. Details:
[swaps](https://docs.cbpayapp.com/en/guides/swaps).

## 8. Reconciling

```mermaid
flowchart LR
    webhooks["Webhooks<br/>(push, per event)"] --> interno["Your internal records<br/>(by idempotency_key)"]
    movements["GET /v1/movements<br/>(immutable ledger)"] --> interno
    cartola["Period statement<br/>(JSON/PDF/Excel)"] --> cierre["Accounting close<br/>with balance check"]
    interno --> cierre
```

Full recipe in
[movements and reconciliation](https://docs.cbpayapp.com/en/concepts/movements-reconciliation) and
[statement](https://docs.cbpayapp.com/en/guides/statement).

## 9. End-to-end international banking

```mermaid
sequenceDiagram
    participant App as Your app
    participant CB as CBPay
    App->>CB: POST /v1/banking/customers (profile, once)
    CB-->>App: webhook banking_customer_status_changed (approved)
    App->>CB: POST /v1/banking/accounts (USD/EUR account)
    App->>CB: POST /v1/banking/operations/prepare (quote, free)
    App->>CB: POST /v1/banking/operations (idempotency_key)
    CB-->>App: webhook banking_operation_status_changed (completed/failed)
```

Banking balances live in your bank accounts (separate from USDT); CBPay
only charges the configured fixed fees. Details:
[banking](https://docs.cbpayapp.com/en/guides/banking).

> **Tip**
First integration? Follow the [quickstart](https://docs.cbpayapp.com/en/quickstart) (fund → payout
→ webhook) and come back here as you add products.
