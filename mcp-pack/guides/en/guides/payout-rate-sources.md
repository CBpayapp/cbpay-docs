---
title: "Payout rate sources and indicative FIFO quotes"
description: "Understand lot, blend and spot pricing and preview an indicative FIFO quote"
slug: en/guides/payout-rate-sources
lang: en
source_url: https://docs.cbpayapp.com/en/guides/payout-rate-sources
---
> **Environments:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## Rate source and indicative FIFO quote

Payout responses may include `rate_source` so you can understand where the
execution market rate came from:

| Value | Meaning |
|---|---|
| `lot` | The local amount was fully covered by the organization's FIFO fiat inventory. |
| `blend` | FIFO inventory covered part of the amount and the remainder used spot. |
| `spot` | No eligible FIFO inventory was used. |

The field is available on payout creation and payout detail when attribution is
loaded. It may be absent on historical or list rows. It does not change the
debit, fee or webhook contract.

To preview an indicative inventory-aware quote, add `currency` and `amount` to
`GET /v1/rates`:

```bash
curl "https://api.qbank.cl/platform/v1/rates?currency=CLP&amount=100000.00"   -H "Authorization: Bearer <token>"
```

The normal rates response can then contain:

```json
{
  "lot_quote": {
    "currency": "CLP",
    "amount": "100000.00000000",
    "market_rate": "13.42150000",
    "rate_source": "blend",
    "marked_rate": "13.28728500",
    "indicative": true
  }
}
```

`lot_quote` is read-only and indicative. Execution locks inventory inside the
debit transaction, so a concurrent payout can change the result. `marked_rate`
is optional. Quote validation errors are values inside the normal `200` rates
response: `invalid_amount`, `currency_not_supported` or `quote_unavailable`.

The quote does not guarantee a future payout price. The payout response and
the final `payout_status_changed` event remain the authoritative records.

### Quote statuses

| Status | Meaning | Next action |
|---|---|---|
| `indicative` | The quote was calculated without execution locks. | Create the payout with the same idempotency key and read its executed `rate_source`. |
| `executed` | The payout response contains the authoritative attribution. | Persist the response and final webhook for reconciliation. |
| `error` | The response contains `invalid_amount`, `currency_not_supported` or `quote_unavailable`. | Correct the inputs or retry the read-only quote; do not create a payout from the error. |

#### Does this quote reserve inventory?
  No. It is read-only and indicative. The payout debit transaction locks and
  consumes inventory atomically.
#### What should I store for reconciliation?
  Store the payout response and its final `payout_status_changed` event. Use
  `rate_source` as the execution provenance; do not treat `lot_quote` as a
  guarantee.
