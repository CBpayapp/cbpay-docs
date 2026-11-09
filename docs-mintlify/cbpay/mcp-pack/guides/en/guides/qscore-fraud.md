---
title: "Qscore fraud and identity reports"
description: "Generate a paid, explainable fraud and identity assessment with idempotency, a PDF, a webhook and public authenticity verification."
slug: en/guides/qscore-fraud
lang: en
source_url: https://docs.cbpayapp.com/en/guides/qscore-fraud
---
> **Environments:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

Qscore fraud and identity is a product separate from the credit report. It
returns a **fraud-risk** score: a higher value means higher fraud risk. The
report combines the subject's recent query velocity, verified-platform
signals, contact consistency, shared device/IP evidence and available bureau
coverage. It is designed for fraud prevention, identity verification and
onboarding decisions; it is not a credit score.

> **Note**
This product is gated by the account's `risk` service flag and charged with
the fixed-only `risk_fraud_score` service. A failed generation is refunded
automatically. The PDF and detailed signals are never sent by email.
## Flow

```mermaid
sequenceDiagram
    participant C as Your system
    participant P as CBPay platform
    participant Q as Bureau capability
    C->>P: POST /v1/qscore/fraud/reports
    P->>P: Validate purpose, idempotency and ownership
    P->>Q: Read normalized subject records
    alt Personal source available
        Q-->>P: Fresh records (or zero records)
        P->>P: Mark source live; add THIN_FILE if zero records
    else No personal source configured
        Q-->>P: 503 bureau_unavailable
        P->>P: Continue with THIN_FILE and internal signals
    else Fetch or contract failure
        Q-->>P: sources_failed / transport / contract error
        P->>P: Fail closed; recovery/refund path
    end
    P->>P: Compute qscore-fraud-v1 and render PDF
    P-->>C: 200 report (ready or failed)
    P-->>C: risk_fraud_score_ready webhook
    C->>P: Authenticated GET /pdf
```

## Bureau coverage and `THIN_FILE`

The report can be `ready` with `THIN_FILE` when it has no personal bureau
evidence for that assessment. This can happen after a successful fetch that
returns zero records, including an HTTP `200` with `sources_queried: 0`.
That response means that no consultable personal source was available (the
response contained only bulk or unsupported sources), so it is treated as
`unavailable` and may produce `THIN_FILE`. The same applies when the core
explicitly returns `503 bureau_unavailable` because no personal bureau source
is configured. In that case, the PDF declares the personal bureau source as
`unavailable` with zero records; platform signals may still contribute to the
fraud score.

When `sources_queried > 0`, the personal source answered the query but returned
no evidence for the subject. This is still a valid fetch and may produce
`THIN_FILE`.

`THIN_FILE` is an evidence-coverage signal, not a clean, approved or
low-risk decision. It describes the absence of personal bureau evidence, not
the absence of internal platform history: internal signals may exist and
still contribute to the score. The PDF's `sources` table declares each
functional source, its record count and `freshness` (`live` or `unavailable`).
Persisted bureau records are never presented as fresh identity evidence when
the on-demand fetch was unavailable.

Earlier `Source: open_finance` records derived from consent links may not carry
an `ingest_run_id`. They are not fresh personal bureau evidence, must not mark
`FetchedThisRun`, and do not represent a personal fraud source.

Failures are fail-closed: a non-empty `sources_failed`, transport or
authentication failure, storage failure or invalid response contract does not
produce a thin-file success. The existing generation recovery/refund path
handles the charged report.

## Create a report

`POST /v1/qscore/fraud/reports` is authenticated and requires a verified
account. The idempotency key can be in the JSON body or in the
`Idempotency-Key` header.

| Field | Required | Description |
|---|---:|---|
| `country` | yes | ISO 3166-1 alpha-2 country of the document. |
| `doc_id` | yes | Subject document. Chilean IDs are normalized and validated. |
| `subject_type` | no | `person` or `company`; omitted values are inferred when possible. |
| `purpose` | yes | `fraud_prevention`, `identity_verification`, `onboarding` or `other`. |
| `lang` | no | `en`, `es` or `zh`; defaults to `en`. |
| `idempotency_key` | yes | Unique key for this purchase. |

```bash Create a fraud report
curl -X POST "https://api.qbank.cl/platform/v1/qscore/fraud/reports" \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fraud-check-2026-09-06-001" \
  -d '{
    "country": "CL",
    "doc_id": "76.123.456-0",
    "subject_type": "company",
    "purpose": "identity_verification",
    "lang": "en"
  }'
```

```json 200 OK
{
  "report_id": "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
  "kind": "qscore_fraud",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "country": "CL",
  "doc_id": "76123456-0",
  "subject_type": "company",
  "purpose": "identity_verification",
  "status": "ready",
  "model_version": "qscore-fraud-v1",
  "lang": "en",
  "score": 280,
  "band": "B",
  "reason_codes": [
    {"code": "NEW_SUBJECT", "direction": "negative", "weight": "high"}
  ],
  "verify_code": "F9f1c2d3e4a5b6c7d8e9f00112233445566778899aabbccddeeff0011223344",
  "verify_url": "https://business.cbpayapp.com/verify/qscore-fraud/F9f1c2d3e4a5b6c7d8e9f00112233445566778899aabbccddeeff0011223344",
  "pdf_url": "/v1/qscore/fraud/reports/9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f/pdf",
  "created_at": "2026-09-06T15:04:12Z"
}
```

A replay with the same account and key returns the original report with
`"idempotency_hit": true`; it never charges or generates a second report.

## Read the report

### List

`GET /v1/qscore/fraud/reports` returns the reports visible to the caller.
`from` and `to` are required date filters (`YYYY-MM-DD`, organization
timezone, inclusive). `status` is optional. Pagination defaults to 50 and is
capped at 200.

```bash List fraud reports
curl "https://api.qbank.cl/platform/v1/qscore/fraud/reports?from=2026-09-01&to=2026-09-30&status=ready&page=1&page_size=50" \
  -H "Authorization: Bearer pk_live_..."
```

```json 200 OK
{
  "items": [
    {
      "report_id": "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
      "kind": "qscore_fraud",
      "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "country": "CL",
      "doc_id": "76123456-0",
      "subject_type": "company",
      "purpose": "identity_verification",
      "status": "ready",
      "score": 280,
      "band": "B",
      "created_at": "2026-09-06T15:04:12Z"
    }
  ],
  "meta": {"page": 1, "page_size": 50, "total": 1}
}
```

### Detail

`GET /v1/qscore/fraud/reports/{report_id}` returns the same report metadata,
reason codes and verification/PDF links when the report is ready. An ID that
is not a UUID, does not belong to the caller's scope or does not exist returns
`404 not_found`.

### PDF

`GET /v1/qscore/fraud/reports/{report_id}/pdf` downloads the branded PDF with
`Content-Type: application/pdf` and
`Content-Disposition: attachment; filename="qxrisk_fraud_<report_id>.pdf"`.
The download is authenticated and is available only when the report is
`ready`; otherwise the endpoint returns `404 not_found`.

## Score and statuses

The model is `qscore-fraud-v1`, ranges from 1 to 999 and uses the following
fraud-risk bands:

| Band | Score | Meaning |
|---|---:|---|
| `A` | 1–199 | Lower observed fraud risk |
| `B` | 200–399 | Low-to-moderate observed risk |
| `C` | 400–599 | Moderate observed risk |
| `D` | 600–799 | High observed risk |
| `E` | 800–999 | Very high observed risk |

The implemented reason codes are `NEW_SUBJECT`, `VELOCITY`,
`CONTACT_MISMATCH`, `SHARED_DEVICE_IP` and `THIN_FILE`. A missing internal
age signal does not itself create `NEW_SUBJECT`; `THIN_FILE` is reported when
personal bureau evidence is unavailable, even when internal platform signals
are present.

| Status | Meaning | What to do |
|---|---|---|
| `pending` | Report row exists while generation is running | Poll the detail endpoint |
| `ready` | Score, reasons, verification code and PDF are available | Read or download it |
| `failed` | Generation failed after the charge path | Read `error_code`; the fee is refunded; retry with a new key |

## Webhook and email

When the report completes, the account receives one signed
`risk_fraud_score_ready` webhook:

```json risk_fraud_score_ready
{
  "report_id": "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
  "kind": "qscore_fraud",
  "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "country": "CL",
  "doc_id": "76••••••-0",
  "score": 280,
  "band": "B",
  "status": "ready"
}
```

The email is best-effort and branded for the organization. It contains only a
short report reference, the subject document and a link to the account; it
does not include the PDF, score, band or fraud signals.

## Public authenticity verification

`GET /verify/qscore-fraud/{code}` is public and rate-limited. A valid code
returns only authenticity, current status, issue date and issuer:

```json 200 OK
{
  "valid": true,
  "type": "qscore_fraud",
  "status": "ready",
  "date": "2026-09-06",
  "issued_by": "CBPay"
}
```

An invalid or tampered code returns `404` with `valid: false`; the public
endpoint never reveals the document, score or signals.

## Errors

| HTTP | Code | Solution |
|---:|---|---|
| 400 | `invalid_doc_id` | Send a valid document for the selected country |
| 400 | `invalid_purpose` | Use one of the four closed purposes |
| 400 | `invalid_subject_type` | Send `person` or `company` |
| 400 | `idempotency_key_required` | Send the body field or `Idempotency-Key` header |
| 403 | `verification_required` | Complete KYC/KYB for the account |
| 403 | `service_disabled` | Enable the `risk` service for the account |
| 404 | `not_found` | Check the report ID or wait for a ready PDF |
| 429 | `too_many_attempts` | Slow down public verification requests |
| 502 | `generation_failed` | The charge was refunded; retry later with a new key |

## FAQ

#### Is this a credit score?
    No. This is a separate fraud and identity risk score. Higher values mean
    higher observed fraud risk; it must not be interpreted as creditworthiness.
#### Can I generate a score-only response?
    No. The product always creates the full report, PDF and verification code.
#### Does a retry charge twice?
    No. Reuse the same idempotency key to replay the original result. Use a new
    key only when you intentionally start a new assessment.
#### Does the public verification page show the score?
    No. It confirms authenticity without exposing the document, score or
    signals.
