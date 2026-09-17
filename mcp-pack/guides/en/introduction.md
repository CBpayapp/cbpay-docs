---
title: "Introduction"
description: "What CBPay is and what you can build with the API"
slug: en/introduction
lang: en
source_url: https://docs.cbpayapp.com/en/introduction
---
CBPay is a multi-currency payment platform for Latin America. Every
account holds **six independent virtual balances** — `USDT` (the operating
currency), `USDC`, `BTC` and `GOLD` (grams of gold) — and operates against
them:

- **Fiat payouts** - Send money to local bank accounts in Chile, Peru, Mexico, Venezuela, Bolivia, Brazil, Paraguay, Ecuador and Argentina — including paying scanned PIX QRs.
- **Fiat payins** - Collect in local currency (QR, transfers, dedicated accounts, pull collections) and get credited automatically.
- **Checkout** - A universal payment link: your payer picks their country, method or crypto on a hosted page and you settle in the asset you choose.
- **Cards & subscriptions** - Issue cards that spend from any balance in real time, accept card payments, [save cards on file and schedule recurring charges](https://docs.cbpayapp.com/en/guides/stored-cards-subscriptions).
- **QR POS** - Register verified merchants and generate amount-bound crypto QR charges for physical points of sale.
- **On-chain crypto** - Fund and withdraw USDT/USDC over TRON and Ethereum, and native BTC over Bitcoin — every account is born with its deposit wallets.
- **Swaps** - Convert between your USDT, USDC, BTC, GOLD, SILVER and PLATINUM balances at your account's rate, instantly.
- **Internal transfers** - Move balance to any other CBPay account — by ID, alias, QR or verified phone — instantly and free of charge.
- **Banking** - Real bank accounts in your name: receive, hold and send money over international rails (SEPA, SWIFT, ACH), including third-party accounts.
- **Segregated wallets** - Dedicated on-chain wallets with their own balance, isolated from the ledger — create, import and export them.
- **KYC/KYB & compliance** - Person and company verification, plus standalone [AML screening](https://docs.cbpayapp.com/en/guides/aml) and [crypto address screening](https://docs.cbpayapp.com/en/guides/screenings).
- **Statement & analytics** - Full statement per period (JSON, PDF, Excel) with guaranteed accounting balance, [receipts](https://docs.cbpayapp.com/en/guides/receipts) per operation and an [analytics summary](https://docs.cbpayapp.com/en/guides/analytics) ready to chart.
Every event reaches your **signed webhooks** ([guide](https://docs.cbpayapp.com/en/webhooks)).

## How it works

Fiat operations revolve around the USDT balance — money comes in on one
side, converts, and goes out the other. The USDC, BTC and GOLD balances
move via [swaps](https://docs.cbpayapp.com/en/guides/swaps), on-chain deposits and withdrawals,
internal transfers, payout settlement (`settlement_asset`) and automatic
payin conversion (`default_payin_asset`):

```mermaid
flowchart LR
    subgraph moneyIn [Money in]
        payin["Fiat payin<br/>(QR, transfer, pull)"]
        deposit["On-chain USDT<br/>deposit"]
        transfIn["Internal transfer<br/>received"]
    end
    subgraph balance [Your CBPay account]
        usdt(("USDT balance<br/>available + held"))
    end
    subgraph moneyOut [Money out]
        payout["Fiat payout<br/>(bank, Yape, PIX, QR...)"]
        withdrawal["On-chain USDT<br/>withdrawal"]
        transfOut["Internal transfer<br/>sent"]
    end
    payin -->|"FX at your rate − fee"| usdt
    deposit -->|"− funding fee"| usdt
    transfIn -->|"free"| usdt
    usdt -->|"FX at your rate + fee"| payout
    usdt -->|"+ withdrawal fee"| withdrawal
    usdt -->|"free"| transfOut
    banking["Banking: real bank accounts<br/>(own balance, separate from USDT)"]
    usdt -.->|"fixed fees only"| banking
```

1. CBPay gives you access: email/password
   registration or a direct API key.
2. You fund your account: with a fiat payin or an on-chain USDT deposit.
3. You operate: payouts, transfers, withdrawals — everything debits and
   credits your USDT balance with FX conversion at execution time.
4. You stay informed: every movement lands in an immutable history
   (`GET /v1/movements`) and events reach your webhooks.

## Base URLs and environments

CBPay runs two fully isolated environments with the exact same API:

| Environment | Base URL | API keys | Money |
|---|---|---|---|
| **Test** | `https://cryptobank.qbank.cl/platform` | `pk_test_...` | Simulated — every rail served by a deterministic simulator |
| **Live** | `https://api.qbank.cl/platform` | `pk_...` | Real and irreversible |

All paths in this documentation are relative to those base URLs. Build
against **test** first and go live by swapping the URL and the key —
details, magic values and the go-live checklist in
[environments and testing](https://docs.cbpayapp.com/en/environment-testing).

> **Note**
Amounts are always **decimal strings** (e.g. `"10.500000"`), never floating
point numbers. Each currency uses its own precision: 6 decimals for
`USDT`/`USDC`/`GOLD` and 8 for `BTC`.
## Next steps

### Create your account and token

Follow the [quickstart](https://docs.cbpayapp.com/en/quickstart) to register and make your first
call.
### Understand the money model

Read [money model](https://docs.cbpayapp.com/en/concepts/money-model) and
[fees](https://docs.cbpayapp.com/en/concepts/fees).
### Integrate your first product

Start with [payouts](https://docs.cbpayapp.com/en/guides/payouts) or [payins](https://docs.cbpayapp.com/en/guides/payins).
