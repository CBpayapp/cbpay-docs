---
title: "Payout errors and FAQ"
description: "Payout errors, rejection states and troubleshooting"
slug: en/guides/payout-errors
lang: en
source_url: https://docs.cbpayapp.com/en/guides/payout-errors
---
> **Environments:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

> **Important**
**Breaking change — 2026-11-13.** BOB, MXN, ARS and CLP ledger balances, plus `BANK_*` mirrors, are Banking-only. Platform payouts, swaps, internal transfers, cards, checkout, POS and fees reject fiat settlement with HTTP `400`. Existing fiat defaults migrate automatically to `USDT`; use Banking for fiat operations.
## Common errors

| HTTP | `error` | What to do |
|---|---|---|
| 400 | `idempotency_key_required` | Send the key in body or header |
| 400 | `beneficiary_required` | Include the `beneficiary` object |
| 400 | `supporting_document_required` | USD bank-rail transfer without the attached supporting document — upload it with `POST /v1/payouts/documents` and pass `options.supporting_document_key` (see [supporting document](https://docs.cbpayapp.com/en/guides/payout-special-cases#mandatory-supporting-document-on-usd-transfers)) |
| 400 | `invalid_document_key` | The `supporting_document_key` does not belong to your account — upload the document with your own credentials and use the returned key |
| 402 | `insufficient_funds` | Fund the account; the payout was not created |
| 403 | `account_blocked` | The account is not active; contact the CBPay team |
| 403 | `service_disabled` | Payouts is not enabled for your account — see [services](https://docs.cbpayapp.com/en/concepts/services) |
| 403 | `compliance_hold` | The payout was held for review and was NOT processed (no funds moved). The API message is `this operation was held for review and was not processed; no funds were moved; contact support with the request reference (X-Request-ID)`. Copy the portal reference line (UTC time, error code and short request ID) when contacting support; see [errors](https://docs.cbpayapp.com/en/errors) |
| 422 | `currency_not_supported` | No FX rate for that currency |
| 422 | (payout with `status: failed`) | The corridor rejected the data; the debit was already refunded — fix `beneficiary` and retry with a new key |
| 503 | `channel_unavailable` | The payout channel is temporarily unavailable; retry later with the SAME `idempotency_key` |
| 503 | `compliance_check_unavailable` | The compliance check could not be evaluated and the payout could not be placed in the technical screening queue; retry with the **same** idempotency key. When that queue is available, payout creation returns `202` with `status: pending` instead |

## Immediate rejection vs later failure

If the processor rejects the payout at creation, you receive `422` with the
object in `status: failed` and the refund already applied. If it fails later
(e.g. the destination account does not exist), the webhook arrives with
`status: failed` and the automatic refund happens at that moment.

### Reading `status_code` on a failed payout

| `status_code` | Meaning | Action |
|---|---|---|
| `core_rejected` | The processor rejected the operation at creation (invalid beneficiary data, corridor unavailable) | Read `status_message`, fix the data and create a new payout with a new key |
| `counterparty_rejected` | The banking rail rejected the beneficiary itself (US/USD corridor) | Check the beneficiary's identity and address data with the holder, then create a new payout with a new key |
| `channel_unavailable` | The payout channel became temporarily unavailable | Retry later; the refund (if a debit happened) is already applied |
| *another code* | Later rejection by the banking rail (e.g. destination account closed) | Same: fix the data and create a new operation |
| *(empty)* | Generic corridor failure | Check `status_message`; if unclear, contact support with the `payout_id` |

In every case the refund is already applied — verify it with the
`payout_refund` entry in
[movements](https://docs.cbpayapp.com/en/concepts/movements-reconciliation).

> **Note**
A payout in `processing` cannot be cancelled through the API: the rail
already has it. Wait for the final state via webhook or `GET` — it always
arrives, with an automatic refund on failure.
## FAQ

#### When is my balance debited?
At creation: the payout debits and holds the funds immediately. If the
payout fails, the exact debited amount (fee included) is refunded
automatically.
#### Can I cancel a payout in processing?
No — once dispatched to the rail it resolves to `completed` or `failed` on
its own. Subscribe to `payout_status_changed` for the final state.
#### Which FX rate does my payout use?
The rate quoted at creation (returned as `fx_rate`), frozen for that
operation. Your agreed spread is already inside the rate.
#### Can I pay from a balance other than USDT?
Yes — set a per-account default (`PUT /v1/settlement`) or override per
payout with `settlement_asset` (USDC, BTC, GOLD). Refunds return the exact
settled amount, never re-quoted.
#### What does `status: pending` with `compliance_pending: true` mean?
The beneficiary screening is temporarily unavailable, but CBPay persisted the
payout in its technical screening queue. No balance was debited, no hold or
ledger entry exists, the core was not called and there is no `receipt_url` yet.
Replay with the same idempotency key returns the same resource. Wait for the
`payout_status_changed` event or poll the payout; it will continue after
`process`, enter the firewall for a valid `hold`, or become `failed` without a
debit if the result is `rejected`.
#### What does compliance_hold (403) mean?
The payout was held for review and was **not** processed: no funds moved and your `idempotency_key` was not consumed. The portal shows a copyable reference
line with UTC time, error code and short request ID. Include it when you
contact support; the exact compliance reason is not disclosed.
#### How do I retry safely after a timeout or 5xx?
Retry with the **same** `idempotency_key`: you get the original payout
back (`idempotency_hit: true`) — never a duplicate. A new key is a new,
independent payout.
#### Why is my US ACH/wire/SWIFT payout still processing?
US bank-rail payouts are paid by the operator by hand. Create already
returns the CBF in `bank_reference` and stays `processing` until the bank
confirms. Estimates: ACH 24–48 business hours, wire/Fedwire same business day (up to 24 hours), SWIFT 24–48 business hours (potentially longer depending on the receiving bank). Listen to `payout_status_changed`; failures refund the debit.
For payout errors and the `422 destination_recently_rejected` retry sequence, see
[Errors](../errors) and [Destination rejection protection](payout-destination-retries).

## US/USD payment purpose and validation
For `US`/`USD` bank-rail payouts (`ach`, `wire` and `swift`), `options.purpose`
is mandatory. The API accepts either the visible label or its code,
case-insensitively. The accepted catalog is:

| Visible label | Accepted code |
|---|---|
| Asset Purchase | `Asset_Purchase` |
| Contract Payment | `Contract_Payment` |
| Dividends | `Dividends` |
| Education Payment | `Education_Payment` |
| Gift/Donation | `Gift_Donation` |
| Investment Purchase | `Investment_Purchase` |
| Invoice Payment | `Invoice_Payment` |
| Loan Payments | `Loan_Payments` |
| Materials Purchase | `Materials_Purchase` |
| Mortgage Payments | `Mortgage_Payments` |
| Payroll | `Payroll` |
| Personal/Family Payment | `Personal_Family_Payment` |
| Professional Service Payments | `Professional_Service_Payments` |
| Reimbursements | `Reimbursements` |
| Remittance | `Remittance` |
| Rent/Utility Payments | `Rent_Utility_Payments` |
| Savings | `Savings` |
| Settlement (Trade) | `Settlement_Trade` |
| Tax Payments | `Tax_Payments` |
| Treasury Movement | `Treasury_Movement` |
| Other (describe below) | `Other` |
`options.purpose_detail` is required only when `purpose` is `Other` and is
limited to 140 characters. It is rejected for every other purpose. A create
request without `purpose` now returns `400 purpose_required`; this is a
breaking change for clients that relied on the former `Invoice_Payment`
default.

`beneficiary.account_type` is required for both `ach` and `wire` and must be
`checking` or `savings` (case-insensitive). `swift` does not use this field.
For `wire` and `swift`, amounts below USD 25 return
`422 amount_below_minimum`. Annex-B beneficiary or bank countries (`CU`, `IR`,
`KP`, `SY`) return `422 prohibited_country`. These checks happen before any
debit.

The normalized validation errors are `invalid_beneficiary`,
`invalid_amount`, `amount_below_minimum`, `prohibited_country`,
`purpose_required`, `invalid_options` and
`supporting_document_required`. Read `message` for the exact field to fix.
Do not retry a rejected request unchanged; after a timeout or 5xx, reuse the
same idempotency key.
