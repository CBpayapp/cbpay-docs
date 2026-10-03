---
title: "Grupo CB 主协议"
description: "为已验证的企业账户签发、查看并完成 Grupo CB 主协议签署"
slug: zh/guides/contract-agreement
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/contract-agreement
---
Grupo CB 主协议是 CBPay 为已验证企业账户生成的预填充文件。创建信封前，
CBPay 会解析企业法定身份、已验证地址、已启用服务、费率以及当前 CBPay
签名。如果必填数据没有可信来源，系统不会创建信封。

签署仪式必须由企业账户的 owner 或 operator 人工完成，并要求明确同意和
一次性新 OTP。API key 不能用于签署。

测试请求请使用 `https://cryptobank.qbank.cl/platform`；只有生产环境使用
`https://api.qbank.cl/platform`。

```mermaid
sequenceDiagram
  participant A as 组织管理员
  participant C as 企业账户
  participant P as CBPay
  participant W as Webhook 订阅者
  A->>P: POST /v1/org/contracts/envelopes
  P-->>A: pending_client 信封
  C->>P: GET 信封和 PDF
  C->>P: POST /sign + X-OTP-Token
  P-->>C: completed 信封和最终 PDF
  P-->>W: contract_envelope_completed
```

## 资格与状态

账户必须是已激活且 KYB 已批准的企业账户。信封按组织和账户隔离；访问
其他账户的 ID 会返回 `404 not_found`。

| 状态 | 含义 | 下一步 |
|---|---|---|
| `pending_client` | CBPay 已冻结预签署文件，客户尚未完成仪式。 | 查看并签署，或让组织管理员 void/reissue。 |
| `completed` | 签名、同意和 OTP claim 成功，最终 PDF 已生成。 | 查看或下载最终文件；不可 void。 |
| `voided` | 组织管理员为待签署信封记录原因并取消。 | 需要修正时签发新信封。 |

系统不存在 `draft` 或通用的 `pending` 状态。

当 `lang=en` 时，组织必须设置 `contract_counsel_approved_en=true`。西班牙语
签发不需要该英文 counsel gate。西班牙语 v13.4 是当前生效的法律来源；
英语 v13.4 仍是等待外部审阅的 draft。信封快照会冻结模板版本和模板
SHA。

## v13.4 法律与渲染基线

西班牙语 v13.4 删除了哥伦比亚，加入 PIX 行，并规定 API 指令接收确认的
p95 小于 2 秒、p99 小于 5 秒；每日切点为创建后下一日的 `00:00 UTC`。
英语文档在外部审阅完成前仍按 draft 处理。

每份 PDF 都使用签发组织的 branding：logo、颜色、封面、footer 和水印
来自组织配置；CBPay 只是默认 branding。信封快照冻结
`template_version` 和模板 SHA，因此可以审计签署人实际审阅的字节。

如果当前模板版本或 SHA 与快照不一致，签署会 fail-closed，返回 HTTP 422
`contract_template_superseded`。不要签署旧文本：先用原因 void
`pending_client` 信封，再使用新的幂等 key 签发新信封并重新审阅 PDF。

## 价格覆盖与显示金额

组织签发 endpoint 会在创建信封前检查价格覆盖。如果已启用的服务没有
effective fee row，系统返回 HTTP 422 `contract_unfillable`，并在
`missing` 数组中使用 `pricing:<flag>` 形式的值。明确的零百分比、零固定
费用表示有效的免费配置；没有 row 不满足覆盖。`transfers` 和 `swaps`
豁免此 fee-row gate。

在运营上，v13.3 正文不再嵌入固定价格表。附录 A 指向客户当前有效的佣金
计划，并按照与门户/管理员定价面板一致的本地化类别对适用条目分组，例如
法币支付、合规、卡片、银行业务、钱包和其他。签发时以 effective 配置为
准；组织管理员应修复缺少的价格覆盖后重新签发信封。

内部 margin `fx_spread`、`settlement_spread` 和 `swap_spread` 不会出现在
账户侧 `fill_snapshot` 或 PDF 价格附录中。org-admin 视图仍保留完整价格
snapshot 供审计。

## 签署仪式

### 列出并打开信封

调用 `GET /v1/me/contracts/envelopes`，再调用
    `GET /v1/me/contracts/envelopes/{envelopeID}`。列表支持 `page` 和
    `page_size`（默认 50，最大 200）。列表响应使用 `items`；详情包含只
    追加的 `events`，每条事件的名称位于 `event`。

```bash
curl "https://api.qbank.cl/platform/v1/me/contracts/envelopes?page=1&page_size=50" \
  -H "Authorization: Bearer <CBPAY_TOKEN>"
```

### 签署前下载文件

`GET /v1/me/contracts/{envelopeID}/pdf` 返回 PDF 二进制。保存并检查
    法定名称、地址、服务和费率。文件已由 CBPay 预签名，但在仪式完成前
    仍然是 `pending_client`。

```bash
curl -o contrato-marco.pdf \
  "https://api.qbank.cl/platform/v1/me/contracts/envelopes/<ENVELOPE_ID>/pdf" \
  -H "Authorization: Bearer <CBPAY_TOKEN>"
```

### 提交签署人身份和同意

签署人姓名和职务放在 JSON 中。`consent` 必须是 JSON 布尔值 `true`。
    OTP **不是** JSON 中的 `code` 字段；请将新的一次性 token 放在
    `X-OTP-Token` header 中。

```bash
curl -X POST \
  "https://api.qbank.cl/platform/v1/me/contracts/envelopes/<ENVELOPE_ID>/sign" \
  -H "Authorization: Bearer <CBPAY_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-OTP-Token: <FRESH_SINGLE_USE_OTP_TOKEN>" \
  -d '{
    "signer_name": "Jordan Lee",
    "signer_title": "Chief Executive Officer",
    "consent": true
  }'
```

### 确认完成

成功响应会将信封返回为 `completed`。再次读取资源并下载 PDF，保存
`final_hash`。`contract_envelope_completed` 事件发送给 org-admin
audience。客户 claim 成功后，平台还会自动记录 Client Journey
milestone `contract_signed`，actor 为 `system:contract-ceremony`；
这不是管理员手工 milestone。
## 签署通知

签发或重新签发信封时，账户会收到通知邮件，邮件附带预签署 PDF。配置门户
URL 后，邮件会显示 **“Ir a firmar”（西班牙语）/“Review and sign”（英语）** 按钮，并在纯文本中包含相同的
`/contracts/{id}` deep-link。邮件发送是 best-effort；请以信封资源和事件
作为事实来源。

## 响应示例

列表响应：

```json
{
  "items": [
    {
      "id": "7c9e2f1a-4b3c-4d5e-8f60-1a2b3c4d5e6f",
      "account_id": "8d0f1a2b-3c4d-4e5f-9012-6a7b8c9d0e1f",
      "template_version": "v13.4",
      "lang": "zh",
      "status": "pending_client",
      "doc_hash": "sha256-of-the-presigned-pdf",
      "cb_signature_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "created_at": "2026-10-01T14:00:00Z",
      "updated_at": "2026-10-01T14:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 50
}
```

完成响应：

```json
{
  "id": "7c9e2f1a-4b3c-4d5e-8f60-1a2b3c4d5e6f",
  "account_id": "8d0f1a2b-3c4d-4e5f-9012-6a7b8c9d0e1f",
  "template_version": "v13.4",
  "lang": "zh",
  "status": "completed",
  "doc_hash": "sha256-of-the-presigned-pdf",
  "final_hash": "sha256-of-the-final-pdf",
  "signer_name": "Jordan Lee",
  "signer_title": "Chief Executive Officer",
  "signer_email": "jordan@example.com",
  "signed_at": "2026-10-01T14:03:12Z",
  "otp_channel": "otp",
  "created_at": "2026-10-01T14:00:00Z",
  "updated_at": "2026-10-01T14:03:12Z",
  "events": [
    {
      "event": "completed",
      "actor": "jordan@example.com",
      "created_at": "2026-10-01T14:03:12Z",
      "detail": {
        "final_hash": "sha256-of-the-final-pdf"
      }
    }
  ]
}
```

## 完成事件

订阅 `contract_envelope_completed` 来更新组织管理员的信封队列。该事件
只发送给 org-admin；账户会通过 email 收到最终 PDF，并可以通过自己的
信封 endpoint 读取。

```json
{
  "event_type": "contract_envelope_completed",
  "account_id": "8d0f1a2b-3c4d-4e5f-9012-6a7b8c9d0e1f",
  "payload": {
    "envelope_id": "7c9e2f1a-4b3c-4d5e-8f60-1a2b3c4d5e6f",
    "final_hash": "sha256-of-the-final-pdf",
    "signer": "Jordan Lee"
  }
}
```

签署时间和语言仍可从信封详情读取。不要用 email 到达作为完成判据；应
使用事件和资源状态。详情中的 `events` 是 append-only；事件名包括
`created`、`viewed_client`、`signed_cbpay`、`notified`、`signed_client`、
`completed`、`resent` 和 `voided`。详情还会显示冻结的
`template_version`；账户侧 snapshot 含模板 SHA，但不暴露内部运营者身份。

## 错误与解决方案

| HTTP | Code | 原因与解决方案 |
|---|---|---|
| 400 | `idempotency_key_required` | body 或 `Idempotency-Key` header 缺少 key；发送稳定的 key。 |
| 400 | `invalid_idempotency_key` | key 超过 256 个字符；缩短后重试。 |
| 403 | `contract_counsel_required` | 缺少英文 counsel 批准；批准英文模板或使用 `lang=es`。 |
| 403 | `human_session_required` | API key 不能签署；改用人工 member session。 |
| 403 | `account_blocked` | 账户未激活；请组织管理员处理账户状态。 |
| 401 | `invalid_otp` | OTP 缺失、过期或已使用；申请新的 token 并放入 `X-OTP-Token`。 |
| 404 | `not_found` | 信封不存在或属于其他账户；使用自己列表中的 ID。 |
| 409 | `contract_invalid_state` | 信封已完成或已 void；不要重复仪式。 |
| 422 | `contract_template_superseded` | 信封基于旧模板；先 void，再签发新信封后签署。 |
| 422 | `invalid_lang` | 只使用 `es` 或 `en`。 |
| 422 | `contract_account_ineligible` | 账户不是 KYB 已批准的活动企业账户。 |
| 422 | `contract_unfillable` | 缺少可信数据或价格覆盖；检查 `missing` 中的 `pricing:<flag>`，修正资料后签发新信封。 |
| 422 | `invalid_consent` | body 必须包含 `"consent": true`。 |
| 422 | `invalid_signer` | 姓名和职务不能为空，且每项最多 120 个字符。 |
| 502 | `storage_failed` | 私有存储失败；先读取并对账信封，再创建新的 key。 |
| 503 | `storage_unavailable` | 私有存储不可用；恢复后再重试。 |

## 常见问题

#### 个人账户可以签署吗？
    不可以。必须是已激活且 KYB 已批准的企业账户，签署人必须是 owner
    或 operator member。
#### 可以把 OTP 放在 JSON 中吗？
    不可以。当前 handler 从 `X-OTP-Token` header 读取新的一次性 token。
    JSON `code` 不是当前签署合同的一部分。
#### 如果 PDF 有空白字段怎么办？
    信封返回 `contract_unfillable`；CBPay 不会发出必填字段未解析的签名 PDF。
#### 已完成的信封可以 void 吗？
    不可以。`completed` 是终态。只有 `pending_client` 可以带原因 void，
    然后重新签发。
#### 可以重试签署吗？
    可以使用同一信封和新的 OTP。原子 claim 会阻止第二次签署；完成的信封
    返回 `contract_invalid_state`。
#### 如果模板已经过时怎么办？
    签署会返回 `contract_template_superseded`。使用原因将
    `pending_client` 信封 void，使用新的幂等 key 签发新信封，并在签署前
    审阅新的 PDF。
