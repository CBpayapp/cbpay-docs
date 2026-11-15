---
title: "Billing documents"
description: "Your Chilean tax documents (DTE) in the portal: list, detail and signed XML download"
slug: en/guides/billing
lang: en
source_url: https://docs.cbpayapp.com/en/guides/billing
---
> **Environments:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

Every commission CBPay bills you in Chile has its electronic tax document
(DTE), issued straight to the Chilean tax authority (SII). The **Billing**
section of the portal (Reports → Billing, both personal and company
accounts) lists your documents with folio, type, status, total and issue
date, and each detail lets you download the **signed DTE XML** for your
accounting. You only ever see your own account's documents.

```mermaid
sequenceDiagram
    participant Y as You (portal)
    participant API as CBPay API
    participant S as SII (Chile)
    Y->>API: GET /v1/me/billing/docs
    API-->>Y: Your DTEs (folio, type, status, total)
    Y->>API: GET /v1/me/billing/docs/{id}
    API-->>Y: Detail + signed dte_xml
    Note over S: The SII accepts or rejects each DTE;<br/>status and glosa update on the document
```

## Document types and statuses

| Type | Meaning |
|---|---|
| `33` | Electronic invoice (afecta, with VAT) |
| `34` | Exempt electronic invoice |
| `61` | Electronic credit note (voids an invoice) |

| Status | Meaning |
|---|---|
| `queued` / `processing` / `stamped` / `sent` / `verify` | In flight to the SII |
| `accepted` | Accepted by the SII (final) |
| `rejected` | Rejected by the SII (final, nothing was billed) |
| `failed` | Temporary error, retried automatically |
| `paused` | Held while billing is paused |
| `cancelled` | Invoice voided before stamping (no SII contact, no note needed) |

A voided invoice shows its original document plus the `61` note that voids
it; both count in the monthly sales book.

## Downloading the DTE XML

Open any document and use **Download XML**: you get the exact bytes that
were stamped and sent to the SII (ISO-8859-1), including the electronic
stamp (TED) and the SII authorization (CAF). Hand it to your accountant
as-is; do not re-encode it.

```bash
curl "https://api.qbank.cl/platform/v1/me/billing/docs?page=1&page_size=50&status=accepted&from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z" \
  -H "Authorization: Bearer $CBPAY_TOKEN"
```

```bash
curl "https://api.qbank.cl/platform/v1/me/billing/docs/dte-7c9e2f1a" \
  -H "Authorization: Bearer $CBPAY_TOKEN"
```

> **Note**
Only documents billed to your own account are visible: a foreign ID
returns `404 not_found`, identical to a nonexistent one. The internal
pricing breakdown is never exposed.
## Errors

| HTTP | Code | Cause and solution |
|---|---|---|
| 400 | `invalid_status` | Unknown status filter. Use one from the table above. |
| 400 | `invalid_range` | Bad date range. Send RFC3339 datetimes. |
| 403 | `account_required` | Call with an account credential (member session or account API key). |
| 404 | `not_found` | The ID does not exist or does not belong to your account. |

## FAQ

#### Where are my invoices from other countries?
    This section covers Chilean DTEs only. Invoices from other countries
    appear in your usual invoices listing.
#### Can I download the XML of a rejected document?
    Yes, when it exists: the detail includes whatever was stamped. A
    rejected document was never billed, so there is nothing to void.
#### Do I need to file anything with the SII?
    No. CBPay files the monthly sales book itself; the XML is for your own
    accounting records.
#### Why do I see a credit note (61)?
    An invoice of yours was voided after SII acceptance, so the platform
    issued a credit note referencing the original. Both documents stay
    visible for traceability.
