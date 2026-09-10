---
title: "Fees"
description: "How each service is charged and where to check your terms"
slug: en/concepts/fees
lang: en
source_url: https://docs.cbpayapp.com/en/concepts/fees
---
Fees are configured by CBPay per **service, country and asset**. When
nothing is configured for a combination, the fee is **0**.

## How payouts and payins are charged

FX pricing lives in **your exchange rate**: the rates you see in
`GET /v1/rates` are your rates, and they are exactly the ones used at
execution — no separate percentages. Each country carries both sides:

- `rate` — the rate for your **payouts** (dispersals). If you disperse the
  equivalent of 100 USDT, you are debited **100 USDT plus the fixed fee**
  (when configured for your account).
- `payin_rate` — the rate for your **payins** (fiat collections/deposits).
  The credit is the local amount converted at that rate, **minus the fixed
  fee** (when configured for your account).

```
payout:  usdt_amount   = local_amount / rate
         total_debit   = usdt_amount + fixed_amount
payin:   usdt_gross    = local_amount / payin_rate
         usdt_credited = usdt_gross − fixed_amount
```

What the beneficiary receives (payout) or what you are credited (payin)
depends on your account's rates for that country. Quoted = charged, always.

## Services with fixed or percent fees

| Service | How it is charged | When |
|---|---|---|
| `payout` | Fixed per operation (FX pricing is already in your rate) | At payout creation (included in `total_debit`) |
| `payin` | Fixed per operation (FX pricing is already in your `payin_rate`) | On credit (you receive `usdt_gross − fee`) |
| `payin_card` | `%` over the collection + fixed, with its own `%` per processed currency (e.g. BOB vs USD). If your account has none configured, the generic `payin` fee applies. Can carry a settlement delay (see [Card payin settlement delay](#card-payin-settlement-delay)) | When a card-paid collection is credited (direct `method: "card"` payin, checkout link paid with card, or subscription charge); with a delay configured, when the scheduled time is reached |
| `funding` | `%` over the deposit + fixed | When the on-chain deposit is credited |
| `withdrawal` | `%` over the withdrawal + fixed | At creation (included in `total_debit`) |
| `wallet_creation` | Fixed per wallet | On every wallet creation (persons: 1 per network; companies: unlimited). Fetching existing wallets is always free |
| `wallet_import` | Fixed per import | When importing an external wallet into a [segregated wallet](https://docs.cbpayapp.com/en/guides/segregated-wallets) (`POST /v1/segregated-wallets/import`) |
| `wallet_export` | Fixed per export | When exporting a segregated wallet's private key (`POST /v1/segregated-wallets/{id}/export`) |
| `wallet_send` | Fixed per send | When sending on-chain from a segregated wallet (`POST /v1/segregated-wallets/{id}/sends`); network gas is on the client |
| `compliance_person` | Fixed per call | When AML-screening a person (`POST /v1/aml/screenings`) |
| `compliance_company` | Fixed per call | When AML-screening a company |
| `compliance_rescreen` | Fixed per call | When re-running an AML screening |
| `compliance_monitoring` | Fixed per activation | When enabling continuous AML monitoring (disabling is free) |
| `kyc_verification` | Fixed per verification | When creating a third-party KYC link or submission ([verification](https://docs.cbpayapp.com/en/guides/kyc)); your own onboarding is free |
| `kyb_verification` | Fixed per verification | When creating a third-party KYB link or submission |
| `address_screening` | Fixed per scan | When assessing a blockchain address' risk ([wallet screening](https://docs.cbpayapp.com/en/guides/screenings)); the automatic withdrawal/deposit protection is free |
| `banking_customer` | Fixed per profile | When creating your banking profile ([banking](https://docs.cbpayapp.com/en/guides/banking)) |
| `banking_account` | Fixed per account | When opening each bank account |
| `banking_deposit` | `%` over the deposit + fixed, in the operation currency, capped at the deposit amount | When an incoming bank deposit is credited (see [Banking rail fees](#banking-rail-fees)) |
| `banking_transfer_ach` | `%` + fixed over the amount, in the operation currency | When an ACH transfer is dispatched |
| `banking_transfer_swift` | `%` + fixed over the amount, in the operation currency | When a SWIFT transfer is dispatched |
| `banking_transfer_wire` | `%` + fixed over the amount, in the operation currency | When a wire (Fedwire) transfer is dispatched |
| `banking_transfer_sepa` | `%` + fixed over the amount, in the operation currency | When a SEPA transfer is dispatched |
| `banking_operation` | Fixed per payment — legacy fallback, charged only when the rail has no specific configuration | When sending each bank payment (quoting with `prepare` is free) |
| `card_creation_virtual` | Fixed per card | When issuing a virtual card ([cards](https://docs.cbpayapp.com/en/guides/cards)) |
| `card_creation_physical` | Fixed per card | When issuing a physical card |
| `card_monthly` | Fixed monthly | Monthly fee per active card (with no balance the card is frozen — no debt) |
| `card_cancellation` | Fixed per card | When cancelling a card |
| `card_purchase_virtual` | `%` + fixed over the USD purchase amount | Per purchase with a virtual card (estimated at authorization, final at settlement; reversals refund it proportionally) |
| `card_purchase_physical` | `%` + fixed over the USD purchase amount | Per purchase with a physical card (same cycle as virtual) |
| `risk_report_person` | Fixed per report | When buying a Qscore credit report on a person ([Qscore](https://docs.cbpayapp.com/en/guides/qscore)); refunded automatically if the report fails (`risk_report_refund`) |
| `risk_report_company` | Fixed per report | When buying a Qscore credit report on a company |

For `%`-based services the formula is
`fee = ceil(amount × percent / 100) + fixed_amount` (rounded up to the
micro-USDT).

> **Note**
Standalone fixed charges (compliance, KYC/KYB verification, wallet creation
and banking) are refunded automatically if the upstream operation fails
(`compliance_refund` / `verification_fee_refund` / `wallet_creation_refund`
/ `wallet_service_refund` / `banking_fee_refund`).
## Card payin settlement delay

Card collections can carry a **settlement delay** (`settlement_hours`, an
integer number of hours; `0` = no delay — the default). With a delay
configured, a confirmed card payment **confirms the payin right away**:
the status becomes `credited`, the `payin_credited` webhook fires
immediately, and a checkout link paid with card closes as paid. What waits
is the **balance**: it lands in your ledger when the settlement runs — at
`settle_at` (a worker settles due payins every minute) or earlier if your
org admin releases it manually from the panel.

The delay governs **every card-paid collection**: a direct
`method: "card"` payin, a [checkout link](https://docs.cbpayapp.com/en/guides/checkout) paid by card
and a [POS charge](https://docs.cbpayapp.com/en/guides/qr-pos) paid by card all share the same
`settle_at` rule (including accounts whose own fee override sets
`settlement_hours` to `0` — their card checkouts also credit immediately).
A checkout or POS charge paid over any other rail (QR, crypto, CBPay app,
fintoc) credits immediately, as always.

While the balance is pending, the payin response (create, get and list)
carries `settle_at` (RFC 3339) and `settlement_pending: true`; once the
balance lands it carries `settled_at` instead. At confirmation the
`payin_settlement_scheduled` webhook also fires exactly once (idempotent)
with `status: "credited"`, the scheduled amounts and `settle_at`, so your
integration can tell "paid, balance scheduled" apart from "paid, balance
already available".

```json
{
  "id": "pay_…",
  "status": "credited",
  "settle_at": "2026-08-10T15:04:05Z",
  "settlement_pending": true
}
```

`settle_at = created_at + settlement_hours` — the delay counts from the
payin creation (≈ when the charge is confirmed at the processor). A payin
whose deadline has already passed by the time it is approved or assigned
settles immediately (no `settlement_pending`). The automatic conversion
(when configured) runs when the balance settles, not before.

> **Important**
A payin whose settlement is still pending **cannot be refunded**: the
refund debits your balance and those funds are not released yet, so the
request is declined with `422 settlement_pending`. Wait for `settle_at`
or ask your org admin to release the settlement first — then the refund
works as usual.
> **Note**
The settlement delay is configured by CBPay on the `payin_card` fee of
your account. Your confirmation signals are unchanged —
`payin_settlement_scheduled` and `payin_credited` arrive at payment time;
only the balance availability waits for `settle_at`.
## Banking rail fees

Banking operations carry **transactional fees in the operation currency**
(the `BANK_USD` / `BANK_EUR` balance the operation moves):

- **Deposits** (`banking_deposit`): charged when the incoming deposit is
  credited, capped at the deposit amount (`min(fee, amount)`) — a small
  deposit never leaves a negative balance.
- **Transfers** (`banking_transfer_ach`, `banking_transfer_swift`,
  `banking_transfer_wire`, `banking_transfer_sepa`): charged **at
  dispatch**; your available balance must cover `amount + fee` in the
  operation currency or the request is declined with `402
  insufficient_funds`. If the transfer is definitively rejected
  afterwards, the fee is refunded.
- **Fallback**: a rail without its own configuration (neither on your
  account nor as a default) uses the legacy `banking_operation` fixed fee
  in USDT. A rail configured with `0%` + `0` fixed is **explicitly free**
  — it does not fall back.

When a rail fee applies, the dispatch response exposes `banking_fee` and
`banking_fee_asset` (the charged amount and its `BANK_*` currency), so each
charge is attributable to its rail.

## Internal transfers: always free

Transfers between CBPay accounts (`POST /v1/transfers`) carry **no fee**,
regardless of the combination: person↔person, person↔company or
company↔company. The money moves inside the ecosystem.

## Your exchange rate

`GET /v1/rates` returns **your account's own exchange rate** for each
country — the same rates your operations execute at, no surprises: `rate`
for payouts and `payin_rate` for payins (`local_amount / rate = USDT`).

## Check your terms

`GET /v1/rates` returns, along with your rates, the fee configuration
currently applied to your account:

```json
{
  "base": "USD",
  "rates": { "chile": { "currency": "CLP", "rate": "950.25", "payin_rate": "955.10" } },
  "asset_prices": {
    "USDT": { "currency": "USD", "unit": "usdt", "price": "1" },
    "USDC": { "currency": "USD", "unit": "usdc", "price": "1" },
    "BTC": { "currency": "USD", "unit": "btc", "price": "109853.24" },
    "GOLD": { "currency": "USD", "unit": "gram", "price": "107.5341" }
  },
  "fees": [
    {
      "service": "payout",
      "country": "CL",
      "asset": "USDT",
      "percent": "0",
      "fixed_amount": "0.30"
    }
  ]
}
```

`asset_prices` is the **reference** USD price of each virtual balance (to
value them on screen) — it implies no conversion and no spread. The
response also includes a `settlement` block with the **effective price**
per asset if you pay operations from a balance other than USDT
([money model](https://docs.cbpayapp.com/en/concepts/money-model#choose-which-balance-pays)): that
price already includes the conversion margin, so what you see is what
applies.

The charged fee is always explicit in each operation's response (`fee`
field) and in the ledger.

## Full example

A payout equivalent to 100 USDT with `fixed_amount: "0.30"`:

```
usdt_amount = 100 USDT           (local_amount / rate)
fee         = 0.30 USDT          (fixed)
total_debit = 100.30 USDT
```

The beneficiary receives the full local amount you specified; you are
debited the equivalent at your rate plus the fixed fee.

A payin equivalent to 100 USDT with `fixed_amount: "0.30"`:

```
usdt_gross    = 100 USDT         (local_amount / payin_rate)
fee           = 0.30 USDT        (fixed)
usdt_credited = 99.70 USDT
```

The payer pays the exact local amount you specified; you are credited the
equivalent at your `payin_rate` minus the fixed fee.

## Fraud and identity score

| `risk_fraud_score` | Fixed-only fee for each fraud and identity report; refunded if generation fails |

## EUR banking fee services

The following service identifiers are present in the product configuration:

| Service | Scope |
|---|---|
| `banking_funding` | Funding through an EUR virtual IBAN; charged only when configured |
| `banking_return` | A banking return or recall; charged only when configured |
| `banking_transfer_sepa_instant` | SEPA Instant transfer; charged only when configured |
| `banking_virtual_iban` | Virtual IBAN lifecycle service; charged only when configured |

Amounts, payer, settlement timing and provider onboarding terms remain
configuration-dependent. No fee is implied when the organization has no
matching configuration.
