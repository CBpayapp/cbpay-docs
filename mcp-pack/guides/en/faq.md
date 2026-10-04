---
title: "FAQ"
description: "The typical integration questions, answered upfront"
slug: en/faq
lang: en
source_url: https://docs.cbpayapp.com/en/faq
---
## Getting started

#### What is the API base URL?
There is one per environment: **live** uses
`https://api.qbank.cl/platform` and **test** uses
`https://cryptobank.qbank.cl/platform`. Every endpoint in this
documentation hangs from them (for example
`https://api.qbank.cl/platform/v1/balances`).
#### Is there a sandbox environment?
Yes. CBPay runs two fully isolated environments: **test**
(`https://cryptobank.qbank.cl/platform`, `pk_test_...` keys, simulated
money) and **live** (`https://api.qbank.cl/platform`, `pk_...` keys, real
money). Build against test first: every corridor is served by a
deterministic simulator with magic values to force every failure path,
and going live is just swapping the base URL and the key. Full guide in
[environments and testing](https://docs.cbpayapp.com/en/environment-testing).
#### How do I fund my account to get started?
Two ways: (1) **deposit USDT on-chain** — create a wallet with
`POST /v1/crypto/wallets` and send USDT to that address (TRON or
Ethereum); (2) **collect fiat** with a [payin](https://docs.cbpayapp.com/en/guides/payins) (QR,
announced transfer, etc.). Either way the balance is credited
automatically and a webhook notifies you.
#### Do I need to pass KYC/KYB before operating?
Yes: every account must approve its identity verification (person = KYC,
company = KYB) before moving money out. Meanwhile you can **fund** (payins,
crypto deposits, incoming transfers) and read; other actions answer
`403 verification_required`. Request your link with
`POST /v1/me/verification/link` and complete the wizard —
[full guide](https://docs.cbpayapp.com/en/guides/kyc). If anything returns `403 account_blocked`,
contact the CBPay team.
#### Why does an operation return 403 service_disabled?
That service is not enabled for your account (services are enabled per
account according to your commercial agreement). Check `GET /v1/services`
for the full map of what you can use — also handy to decide what to show in
your UI — and contact the CBPay team if you need something enabled. Reads
and money already in flight are never blocked.
#### Which credential should I use: JWT session or API key?
For server-to-server processes always use an **API key** (`pk_…`, never
expires). JWT sessions (24 h) are for front-ends with users who log in.
Both travel in `Authorization: Bearer <token>` (or `X-API-Key`).
#### What language will my account use after this deploy?
Existing accounts are pre-configured `locale=es` (one-shot at deploy, not an endpoint).
New accounts are born English unless register body, `Accept-Language`, or the org `default_locale` says otherwise.
Change yours with `PATCH /v1/me` `{ "locale": "en" }`. JSON API responses stay in English either way.
See [Locale and language](https://docs.cbpayapp.com/en/guides/locale).
## Money and rates

#### What currency is my balance in?
Your account holds **ten independent balances**: USD (the principal currency, 2 decimals), USDT, USDC, BTC, GOLD, SILVER,
PLATINUM, BOB, MXN and ARS. Fiat operations (payouts in
CLP, collections in BOB…) convert to/from your principal asset at your
account's rates at
execution time (`rate` for payouts, `payin_rate` for payins); you can
also settle payouts from another balance (`settlement_asset`) and keep
your payins in the asset you choose (`default_payin_asset`). Pricing is
still quoted in USDT behind the scenes. See the
[money model](https://docs.cbpayapp.com/en/concepts/money-model).
#### How do I know what a payout will cost before creating it?
Query `GET /v1/rates` (returns **your** rate per country) and compute:

```
usdt_amount ≈ local_amount / rate      (rounded up, 6 decimals)
total_debit = usdt_amount + fixed fee  (your fees come in the same response)
```

The payout object returns the exact server-computed values (`fx_rate`,
`usdt_amount`, `fee`, `total_debit`).
#### Is the rate I see in /v1/rates guaranteed?
It is not a frozen quote: the payout uses the rate in force **at creation
time** and the payin the one in force **at credit time**, which can drift
slightly from the one you fetched. The applied rate is recorded in each
operation's `fx_rate` field for audit.
#### Are there minimum or maximum amounts?
The API imposes no technical minimums; with very small amounts the fixed
fee can exceed the amount (you'll get `invalid_amount` or an uneconomic
debit). Maximums depend on your configuration with CBPay.
#### Which fees apply to me and where do I see them?
CBPay defines them for your account: per service (payout, payin, funding,
withdrawal, KYC, wallet creation), per country, with % and/or fixed
components. `GET /v1/rates` returns your effective list in the `fees`
field (FX percentages are already baked into the quoted rate). Details in
[fees](https://docs.cbpayapp.com/en/concepts/fees).
## Payouts

#### How long does a payout take to arrive?
It depends on the corridor: several are **synchronous or near-instant**
(Yape, Pago Móvil, Bolivia QR) and others process within minutes through
the local banking rail (SPEI, transfers). Design your integration around
the `payout_status_changed` webhook: don't assume fixed timings or poll.
#### What exactly happens if a payout fails?
The **full debit** (amount + fee) is refunded to your `available` balance
automatically, and the webhook arrives with `status: failed` and a
`status_code` explaining the cause. Fix the data and retry with a **new**
`idempotency_key`.
#### Can I retry without risking a double payment?
Yes — that is what the `idempotency_key` is for: repeating the same key
returns the original payout (`idempotency_hit: true`) without creating or
debiting anything new. Use a different key only when you truly want
another payment. See [idempotency](https://docs.cbpayapp.com/en/concepts/idempotency).
#### How do I know which beneficiary fields each country takes?
[Examples by country](https://docs.cbpayapp.com/en/guides/payouts#examples-by-country) has a field table and
a complete example per country and method, and
`GET /v1/payouts/banks?country=XX` returns the current bank codes where
they apply.
#### Can a scanned QR be paid twice?
No: each scan `provider_reference` admits a single confirm. Retries with
the same `idempotency_key` return the original payout.
#### Can I cancel or edit a payout in processing?
No. Once a payout is `processing` the banking rail already has it; there
is no API cancellation. Wait for the final state: if the rail rejects it,
the full refund is automatic. Verify the beneficiary data **before**
creating (the free `qr/scan` exists precisely to confirm the recipient
before paying a QR).
#### Are there minimum, maximum or daily limits?
The API imposes no technical minimums (with tiny amounts the fixed fee may
exceed the amount). Maximums and operational limits depend on your
commercial agreement and the corridor — to raise limits, contact your
CBPay administrator with the country, expected volume and average ticket.
## Payins and deposits

#### When is my balance credited after a collection?
When the provider confirms the payment: QRs and active collections usually
credit within seconds; bank transfers when the deposit arrives and is
matched. You always receive the `payin_credited` webhook with the net
credited amount.
#### My customer transferred without the reference — is the money lost?
No. The deposit lands as `unassigned` and the CBPay team routes it to your
account manually (once assigned it is credited with your normal rate and
fees). Meanwhile it does not show in your balance — if you are expecting a
deposit that never arrives, tell your administrator the amount, currency
and approximate time to speed up the assignment. To avoid it, use the
**dedicated CLABE account** in Mexico, the **payment page** in Chile, or
make sure the reference travels in the transfer description.
#### How long does a crypto deposit take to confirm?
Detection is near-instant and the credit lands when the network confirms:
**TRON ~1 minute** (19 confirmations), **Ethereum a few minutes** depending
on congestion. The `crypto_deposit_credited` webhook closes the cycle with
the `tx_id` so you can verify it on the explorer.
#### How do I get an account statement for my accountant?
With the [statement](https://docs.cbpayapp.com/en/guides/statement): one endpoint that consolidates
every movement of the period (payouts, payins, crypto, transfers and fees)
with an exact accounting reconciliation. Request `format=pdf` or
`format=xlsx` to download the CBPay-branded document, or `json` to render
it in your web.
#### Are the banking balance and my USDT balance the same thing?
No. [Banking](https://docs.cbpayapp.com/en/guides/banking) money lives in **your real bank
accounts** (USD or other enabled currencies) and is queried with
`GET /v1/banking/accounts/{id}/balance`. Your CBPay balance is USDT and is
only touched to charge the fixed banking fees (refunded if the operation
fails).
#### Are a crypto deposit and a payin the same thing?
No: a **payin** is a fiat collection (local currency → USDT); a **crypto
deposit** is on-chain USDT arriving at your wallet (`funding`). Both end
up in the same USDT balance, with different webhooks (`payin_credited` vs
`crypto_deposit_credited`).
## Webhooks and errors

#### Are webhooks mandatory?
No, but strongly recommended: final states arrive by webhook with no
polling. You can still fetch any object by API (`GET /v1/payouts/{id}`,
`GET /v1/payins/{id}`…) at any time.
#### How do I test webhooks from my machine (localhost)?
Local URLs are rejected for security. Use a free HTTPS tunnel (Cloudflare
Tunnel or ngrok) and subscribe that public URL — step-by-step recipe in
[environment and testing](https://docs.cbpayapp.com/en/environment-testing).
#### What is the difference between GET /v1/movements and the statement?
They read the same ledger: `movements` is the paginated programmatic view
(for automatic reconciliation and your UI); the statement is the period
snapshot with totals, breakdowns and a guaranteed balance (for accounting
closes). They never disagree. Details in
[movements and reconciliation](https://docs.cbpayapp.com/en/concepts/movements-reconciliation).
#### Why did I receive the same webhook twice?
Deliveries are **at-least-once**: timeouts trigger retries (up to 5).
Deduplicate with the `X-Webhook-Event-ID` header, unique per event.
#### What should I do with a 5xx or core_unavailable error?
It is transient: retry with backoff using the **same** `idempotency_key`
(so you never duplicate). If it persists, contact the CBPay team with the
`payout_id`/`payin_id` and the time.
