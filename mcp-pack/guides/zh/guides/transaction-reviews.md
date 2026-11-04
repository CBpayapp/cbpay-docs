---
title: "交易审核"
description: "查询并回应交易防火墙对您资金操作的审核"
slug: zh/guides/transaction-reviews
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/transaction-reviews
---
当您所在的组织启用**交易防火墙**后，部分资金操作（付款、加密货币提现、收款、银行转账）可能会在执行前被**挂起以进行人工审核**——如果您的组织还启用了**申请审核**，创建银行资料、注册银行第三方或开卡也可能以同样方式被挂起。本指南介绍如何查询这些审核，以及在被要求提供信息时如何回应。

> **注**
集成测试？在测试环境（`https://cryptobank.qbank.cl/platform`，`pk_test_` 密钥）中，组织启用防火墙后其行为与生产环境完全一致。详见[环境与测试](https://docs.cbpayapp.com/zh/environment-testing)。
## 您会看到什么

当您的操作被挂起时：

1. **状态变为 `in_review`** —— 操作暂不执行。创建它的 `POST` 请求会返回 **`202 Accepted`** 并带有 `review_id`。
2. **您会收到 webhook** `txn_review_status_changed`，携带新状态。
3. **如果被要求提供信息**，您会收到一封邮件，说明原因并附上上传文件的链接。

> **注**
**这是正常现象。** 交易防火墙是您组织为满足合规政策而启用的控制层。大多数审核会在几分钟到几小时内完成。
## 查询您的审核

列出您正在或曾经被审核的操作：

```bash
curl "https://api.qbank.cl/platform/v1/me/txn-reviews?from=2026-07-01&to=2026-08-06" \
  -H "Authorization: Bearer pk_..."
```

响应：

```json
{
  "reviews": [
    {
      "id": "7a3f2b1c-0000-4000-8000-000000000001",
      "kind": "payout",
      "resource_id": "8b4c3d2e-1111-4111-8111-111111111111",
      "status": "info_requested",
      "amount_label": "1500.00",
      "asset": "USD",
      "country": "MX",
      "method": "spei",
      "counterparty": "Juan Pérez",
      "info_request": {
        "message": "Please upload the invoice that justifies this payment",
        "requested_at": "2026-08-06T15:20:00Z"
      },
      "created_at": "2026-08-06T14:32:00Z",
      "updated_at": "2026-08-06T15:20:00Z"
    }
  ],
  "page": 1,
  "page_size": 50,
  "total": 1
}
```

### 过滤条件

- `?status=` —— `in_review`、`info_requested`、`released`、`rejected` 或 `all`（为空 = 未决：`in_review` + `info_requested`）。其他值 ⇒ `400 invalid_status`。
- `?from=` / `?to=` —— 日期范围（`YYYY-MM-DD`，组织时区，均含边界）。日期无效 ⇒ `400 invalid_range`。
- `?page=` / `?page_size=` —— 分页（默认 50，最大 200）。

## 审核详情

```bash
curl https://api.qbank.cl/platform/v1/me/txn-reviews/7a3f2b1c-0000-4000-8000-000000000001 \
  -H "Authorization: Bearer pk_..."
```

响应：

```json
{
  "review": {
    "id": "7a3f2b1c-0000-4000-8000-000000000001",
    "kind": "payout",
    "resource_id": "8b4c3d2e-1111-4111-8111-111111111111",
    "status": "info_requested",
    "amount_label": "1500.00",
    "asset": "USD",
    "country": "MX",
    "method": "spei",
    "counterparty": "Juan Pérez",
    "info_request": {
      "message": "Please upload the invoice that justifies this payment",
      "requested_at": "2026-08-06T15:20:00Z"
    },
    "files": [
      {
        "id": "f1e2d3c4-0000-4000-8000-0000000000aa",
        "review_id": "7a3f2b1c-0000-4000-8000-000000000001",
        "file_name": "invoice-221.pdf",
        "content_type": "application/pdf",
        "size_bytes": 482110,
        "uploaded_by": "account",
        "created_at": "2026-08-06T15:40:00Z"
      }
    ],
    "created_at": "2026-08-06T14:32:00Z",
    "updated_at": "2026-08-06T15:40:00Z"
  }
}
```

属于其他账户的审核将返回 `404 not_found`（绝不返回 `403`，以避免泄露存在性）。审核被拒绝时，详情会包含 `decision_note`（与拒绝邮件相同的文本）和 `decided_at`。

> **重要**
**内部原因绝不对外暴露。** 出于安全考虑且不损害合规调查，最终用户视图只显示状态和信息请求消息——绝不显示内部挂起原因或团队备注。
## 审核状态

| 状态 | 含义 | 您需要做什么 |
|---|---|---|
| `in_review` | 操作正由合规团队审核 | 等待——无需任何操作 |
| `info_requested` | 被要求提供补充信息 | 尽快上传所需文件 |
| `released` | 审核已通过该操作 | 操作已执行（或正在执行中）——对于申请，银行资料或卡片已创建 |
| `rejected` | 审核拒绝了该操作 | 操作已取消；挂起资金退回您的余额——被拒绝的申请将退还其费用 |

> **注**
**按期限自动拒绝。** 如果您的组织配置了审核期限，在该期限内（自审核的最后一次状态变化起算——上传证据会重置时钟）无人决定的审核，将被每小时扫描**自动拒绝**：操作被取消，被扣留的资金退回您的余额，您会收到与手动拒绝相同的邮件和 `txn_review_status_changed` webhook。在详情中，`decision_note` 会带有期限已过期的标准通知。**申请审核永不会被自动拒绝**：被挂起的银行或开卡申请始终等待人工决定，没有期限。
## 被挂起的申请（银行与开卡）

如果您的组织启用了**申请审核**（两个独立开关，分别对应银行和开卡），以下请求也可能在处理前被挂起：

- `POST /v1/banking/customer` —— 开通您自己的银行资料
- `POST /v1/banking/third-parties` —— 注册银行第三方
- `POST /v1/cards` —— 开卡（虚拟卡或实体卡）

被挂起的申请返回 **`202 Accepted`** 而不是 `201`：

```json
{
  "status": "in_review",
  "kind": "card_application",
  "review_id": "7a3f2b1c-0000-4000-8000-000000000001",
  "message": "application received; it is pending review by our compliance team"
}
```

使用相同 `idempotency_key` 的重试会返回相同的 `202` 负载并带有 `idempotency_hit: true`——绝不会创建第二条审核。

- **申请费用在挂起时收取。** 如果审核被拒绝，费用将**自动退还**；如果审核通过，银行资料或卡片会立即创建。
- **通过 webhook `txn_review_status_changed` 跟踪结果**（`kind` 为 `banking_application` 或 `card_application`），或轮询 `GET /v1/me/txn-reviews`。
- 审核也可能要求补充信息（`info_requested`）——上传文件的方式与交易审核完全相同。

## 按要求上传文件

如果您的审核处于 `info_requested` 状态，请上传证明文件。请求体为**原始文件二进制**，文件名通过查询参数 `name` 传递，类型通过 `Content-Type` 请求头传递：

```bash
curl -X POST "https://api.qbank.cl/platform/v1/me/txn-reviews/7a3f2b1c-0000-4000-8000-000000000001/files?name=invoice-221.pdf" \
  -H "Authorization: Bearer pk_..." \
  -H "Content-Type: application/pdf" \
  --data-binary "@invoice-221.pdf"
```

`201` 响应——上传文件后，审核将**回到 `in_review`** 状态，等待团队重新评估：

```json
{
  "file": {
    "id": "f1e2d3c4-0000-4000-8000-0000000000aa",
    "review_id": "7a3f2b1c-0000-4000-8000-000000000001",
    "file_name": "invoice-221.pdf",
    "content_type": "application/pdf",
    "size_bytes": 482110,
    "uploaded_by": "account",
    "created_at": "2026-08-06T15:40:00Z"
  },
  "status": "in_review"
}
```

**限制：**
- 允许的类型：PDF、PNG、JPEG、WEBP、TXT、CSV、DOC(X)、XLS(X)——按 `Content-Type` 请求头校验。
- 最大大小：每个文件 **50 MB**。
- 每条审核最多 **20 个文件**。

## 下载您自己的文件

```bash
curl "https://api.qbank.cl/platform/v1/me/txn-reviews/7a3f2b1c-0000-4000-8000-000000000001/files/f1e2d3c4-0000-4000-8000-0000000000aa" \
  -H "Authorization: Bearer pk_..." \
  -o invoice-221.pdf
```

以原始 `Content-Type` 返回原始二进制内容（其他账户的文件返回 `404 not_found`）。

## Webhook `txn_review_status_changed`

每当您的审核状态发生变化时，都会收到此 webhook：

```json
{
  "event": "txn_review_status_changed",
  "account_id": "ae8cf540-1234-5678-9abc-def012345678",
  "review_id": "7a3f2b1c-0000-4000-8000-000000000001",
  "kind": "payout",
  "resource_id": "8b4c3d2e-1111-4111-8111-111111111111",
  "status": "released",
  "previous_status": "in_review",
  "amount": "1500.00",
  "asset": "USD",
  "timestamp": "2026-08-06T16:30:00Z"
}
```

> **注**
webhook 负载刻意保持**中性**：只携带状态和操作摘要，绝不携带内部审核原因或合规备注。

对于申请审核（`kind`：`banking_application` / `card_application`），负载省略 `amount` 和 `asset`；`method` 携带申请流程（`self`/`third_party`）或卡片类型（`virtual`/`physical`）。
## 专属错误

| HTTP | 错误码 | 解决方案 |
|---|---|---|
| 400 | `invalid_status` | `status` 过滤器必须是 `in_review`、`info_requested`、`released`、`rejected` 或 `all` |
| 400 | `invalid_range` | 检查 `from`/`to` 的 `YYYY-MM-DD` 格式 |
| 400 | `invalid_name` | 通过查询参数 `name` 发送文件名（最多 200 个字符，不含路径分隔符） |
| 400 | `empty_file` | 文件请求体为空 |
| 404 | `not_found` | 审核（或文件）不存在或不属于您的账户 |
| 409 | `not_awaiting_info` | 审核不在 `info_requested` 状态——只有在被要求提供信息时才能上传文件 |
| 413 | `file_too_large` | 文件超过 50 MB |
| 415 | `unsupported_file_type` | 请使用 PDF、PNG、JPEG、WEBP、TXT、CSV、DOC(X) 或 XLS(X)，并携带对应的 `Content-Type` |
| 422 | `file_limit_reached` | 该审核已有 20 个文件 |
| 503 | `storage_unavailable` | 存储暂不可用；请稍后重试 |

完整目录见[错误](https://docs.cbpayapp.com/zh/errors)。

## 常见问题

#### 为什么我的操作被挂起？
您的组织启用了交易防火墙——一个在执行前挂起特定操作以进行人工审核的控制层。具体标准取决于您组织的合规政策。
#### 审核需要多长时间？
大多数审核在几分钟到几小时内完成。如果您的审核超过 24 小时没有回应，您的组织会收到自动警报。如果您的组织配置了决定期限，审核在期限到期时会被自动拒绝——上传所要求的证据会重置该时钟。
#### 如果我的操作被拒绝会怎样？
操作将被取消。如果有挂起的资金（例如付款中的资金），将自动退回您的可用余额。您会收到一封说明拒绝原因的邮件。
#### 我可以取消正在审核的操作吗？
不能直接取消。如需取消，请联系您组织的合规团队——他们可以在其面板中拒绝该操作。
#### 为什么我看不到挂起原因？
出于安全考虑且不损害合规调查，内部原因绝不向最终用户暴露。只有在被要求提供文件时，您才会看到信息请求消息。
#### 我创建了银行资料或卡片，却收到了 202——发生了什么？
您的组织启用了申请审核：请求在处理前被挂起。此时尚未创建任何内容——合规团队批准审核后，银行资料或卡片会自动创建，您会收到带有 `status: released` 的 webhook `txn_review_status_changed`。申请费用在挂起时已收取；如果审核被拒绝，费用将自动退回到您的余额。
