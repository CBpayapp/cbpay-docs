---
title: "KYC/KYB remediation"
description: "Continue the current verification case when compliance requests changes"
slug: en/guides/kyc-remediation
lang: en
source_url: https://docs.cbpayapp.com/en/guides/kyc-remediation
---
> **Environments:** Test `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - Live `https://api.qbank.cl/platform` (`pk_...`).

## Continue the current case

Your account has one **current verification case**. A later `rejected` record
does not invalidate an earlier case that is still actionable for remediation.
When a request is already in progress, `POST /v1/me/verification/link`
returns `409 self_verification_in_progress` without a new URL:

```json
{
  "error": {
    "code": "self_verification_in_progress",
    "message": "a verification is already in progress"
  }
}
```

Call `GET /v1/me/verification` and reopen the existing `link.url`. Do not
create a second case or change the idempotency key.

If a remediation-capable link expires while its submission is still
`changes_requested` or `more_info_required`, opening it automatically
reopens the link for another 90 days. Its state is `opened`, and the response
reports `changes_requested` with `next_step: resubmit`. Terminal and revoked
links remain closed.

## Resubmit in place

While remediation is possible, the current submission exposes:

```json
{
  "submission_id": "sub_123",
  "status": "changes_requested",
  "pending_documents": ["proofOfResidence"],
  "documents_received": ["identity"],
  "changes_requested_comments": "Upload a legible proof of residence.",
  "documents_gate": { "ok": false, "total": 2, "matched": 1 }
}
```

Upload every item in `pending_documents` in the existing wizard. The wizard
resubmits **in place**: the `submission_id` is unchanged and no new
submission is created. When the last required document is accepted, the case
automatically returns to `pending_review` and the portal shows **Waiting for
approval**.

For an invited UBO or director at `/on/ubo/`, if the declaration is still
missing, the review card shows **Your sworn declaration still needs your
signature**. The UBO can sign the declaration inline; signing is sufficient
to continue, and the case remains in review.

An expired-link screen is intentionally distinct and explains that your
progress was saved, then asks you to request a new link.

```mermaid
flowchart LR
  A["changes_requested"] --> B["Upload pending_documents"]
  B --> C["Same submission_id"]
  C --> D["pending_review"]
  D --> E["Waiting for approval"]
```

#### Why did I receive a 409?
    A current self-verification case already exists. Read the current
    verification and reuse its open link.
#### Does resubmission create a new review?
    No. The existing submission is updated and returns to review after the
    requested evidence is complete.
## Resend the case link

If the company needs the same hosted link again, resend it to the email
already attached to the company account:

```bash
curl -X POST \
  "https://api.qbank.cl/platform/v1/me/verifications/kyb/third-party/c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f/resend-link"
```

This action does not use a Bearer token. It never creates a new case, changes
the link, or returns the URL. It is limited to one resend per case every 24
hours.

```json
{
  "sent": true,
  "reminded_to": "owner@ownit.example",
  "expires_at": "2026-11-30T12:00:00Z"
}
```

The `reminded_to` value identifies the company account email selected for
delivery. A known `expires_at` is included; if delivery fails, the response
also includes `email_error`.

| HTTP | Meaning |
|---:|---|
| 409 | The case is already decided and has no live link to resend. |
| 410 | The link expired and the case is not remediable. |
| 422 | The account has no usable email, or the case cannot be resent. |
| 429 | This case was already emailed a resend in the last 24 hours. |

#### Will the link arrive at my email?
    Yes. It is sent to the email attached to the authenticated company
    account, and the response confirms that address in `reminded_to`.
#### Can I resend it to another email address?
    No. The destination is pinned to the company account email. Update the
    account through its supported process before requesting a resend.
See the [error catalog](https://docs.cbpayapp.com/en/errors) for actionable error codes.

## Company's own third-party cases

A company can read its own third-party KYC/KYB cases before the account is
approved. These routes exist to break the remediation loop: they are
read-only, scoped to the authenticated company account, and do not adopt,
create, or change a verification.

### List cases

```bash
curl "https://api.qbank.cl/platform/v1/me/verifications/kyb/third-party?page=1&page_size=50&from=2026-11-01&to=2026-11-07&status=changes_requested" \
  -H "Authorization: Bearer <account-token>"
```

```json
{
  "page": 1,
  "page_size": 50,
  "submissions": [{
    "submission_id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    "kind": "kyb",
    "status": "changes_requested",
    "external_customer_id": "link:7f8e9d0c-1b2a-4c3d-8e4f-0a1b2c3d4e5f",
    "created_at": "2026-11-03T16:18:20Z",
    "updated_at": "2026-11-06T16:37:23Z"
  }]
}
```

The list accepts `page`, `page_size` (maximum 200), `status`, and optional
`from`/`to` filters. When omitted, the API applies its default date range;
passing the range explicitly is recommended for reproducible pagination. It
is a platform mirror and does not make a core request for every row.

### Read remediation detail

```bash
curl "https://api.qbank.cl/platform/v1/me/verifications/kyb/third-party/c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f" \
  -H "Authorization: Bearer <account-token>"
```

```json
{
  "submission_id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
  "kind": "kyb",
  "status": "changes_requested",
  "external_customer_id": "link:7f8e9d0c-1b2a-4c3d-8e4f-0a1b2c3d4e5f",
  "pending_documents": ["proofOfAddress", "financialStatements"],
  "changes_requested_comments": "Please upload the listed documents.",
  "created_at": "2026-11-03T16:18:20Z",
  "updated_at": "2026-11-06T16:37:23Z"
}
```

The detail reads the current core state when available. If that enrichment is
temporarily unavailable, the safe mirror is returned. A migrated case is
reported as `status: "migrated"` with `migrated_from` and `migrated_to`.

| HTTP | Code | Solution |
|---:|---|---|
| 400 | `invalid_range` | Correct malformed `from`/`to` values and use the documented date format. |
| 401 | `unauthorized` | Refresh the account token and send it as a Bearer token. |
| 403 | `company_account_required` | Use a company account; person accounts cannot own third-party cases. |
| 404 | `not_found` | Verify the case belongs to the authenticated account. |

#### Does the account need to be approved first?
    No. The company may read its own third-party cases in any state so it can
    complete remediation. Write operations retain their existing approval and
    permission gates.
#### Does reading create or adopt a case?
    No. Both routes are pure reads. They never create a submission, send a
    decision, adopt an approval, or change account state.
#### How do I submit the requested documents?
    Use the existing hosted flow for the same submission. Keep its
    `submission_id`; do not create a replacement case.
