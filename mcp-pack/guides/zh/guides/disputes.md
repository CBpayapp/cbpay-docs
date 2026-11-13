---
title: "争议与欺诈案件"
description: "读取争议案件、跟踪证据时间线，并从账户上传证据。"
slug: zh/guides/disputes
lang: zh
source_url: https://docs.cbpayapp.com/zh/guides/disputes
---
> **环境：** 测试 `https://cryptobank.qbank.cl/platform` (`pk_test_...`) - 正式 `https://api.qbank.cl/platform` (`pk_...`).

CBPay 向付款所属账户提供争议与欺诈案件信息。账户可以读取案件、查看
不可变时间线、上传证据并下载组织生成的证据包。只有组织管理员可以
打开、提交或解决案件。

> **注**
账户 API 不能作出决定。成功上传只会新增不可变证据版本，不会改变案件结果。
## 证据包内容

组织生成证据包后，账户可以下载与案件关联的同一份私有、需要认证的 PDF。
它包含类型化 payin 字段、账本/FIFO 证据和外部资金支出 reference。

对于卡 payin，证据包包含面向处理器的卡交易（交易 reference、授权、金额/
币种/日期、经过掩码的卡片详情、发卡方/国家、3DS、AVS/CVV、决策引擎
结果、设备 fingerprint 以及经过掩码的付款人上下文）。FIFO 支出包含
withdrawal 或 payout ID、资产/币种、状态、目标地址或银行 reference，
以及可用时的交易 hash。商户已验证的 KYB/KYC 身份会按处理器代表商户的
需要完整包含；付款人仍然经过掩码。原始 payin payload 和 PAN 相邻字段
不会包含在内。

## 按标识符打开案件

组织管理员可以从粘贴的标识符列表批量打开案件。去除空格并删除完全
重复的值后，列表必须包含 1–100 个非空唯一值。标识符可以是 payin ID、
幂等键、短引用、`qbank_reference` 或 `qbank_payin_id`。

两个接口都需要组织权限 `disputes:write`。Preview 只读：不会创建案件、
冻结资金或发送 webhook。

### 1. 预览列表

```bash
curl -X POST "https://api.qbank.cl/platform/v1/org/disputes/batch-preview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identifiers": [
      "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      "payin-reference-2026-00041",
      "copied-value-with-no-match"
    ]
  }'
```

响应将唯一匹配与无法解析为单个 payin 的值分开。`ambiguous` 值最多包含
五个候选，每个候选包含 `payin_id`、`currency`、`local_amount` 和
`credited_at`。

```json
{
  "matched": [
    {
      "input": "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      "payin_id": "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      "account_id": "5c4b3a29-1111-4222-8333-444455556666",
      "method": "card",
      "currency": "USD",
      "local_amount": "100.00",
      "credited_usdt": "100.000000",
      "status": "credited",
      "has_open_case": false
    }
  ],
  "unmatched": [
    {
      "input": "copied-value-with-no-match",
      "reason": "not_found"
    }
  ]
}
```

预览也可能显示暂时不符合打开条件的 payin。确认前检查 `status` 和
`has_open_case`：batch-open 只会打开已 credited 且没有开放案件的 payin。

单笔打开案件和手动绑定导入行同样只接受状态为 `credited` 的 payin。
否则返回 `409 payin_not_credited`，不会创建冻结；batch 和导入流程会按项目
或行报告该情况。

### 2. 确认打开

发送相同标识符或完整粘贴列表，并提供一个 batch 幂等键。`kind` 默认是
`dispute`，也可以是 `fraud_hold`。

```bash
curl -X POST "https://api.qbank.cl/platform/v1/org/disputes/batch-open" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: disputes-batch-2026-09-19-001" \
  -d '{
    "identifiers": [
      "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      "payin-reference-2026-00041",
      "copied-value-with-no-match"
    ],
    "kind": "dispute",
    "idempotency_key": "disputes-batch-2026-09-19-001"
  }'
```

服务器会再次解析每个标识符，绝不信任客户端提交的 payin 或账户 ID。
每个已 credited 的 payin 都使用由 batch key 与 payin ID 派生的独立幂等键。

```json
{
  "results": [
    {
      "input": "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      "payin_id": "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      "status": "opened",
      "dispute_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
    },
    {
      "input": "payin-reference-2026-00041",
      "payin_id": "6d5c4b3a-2f1e-4d3c-8b2a-1e0f9a8b7c6d",
      "status": "skipped",
      "reason": "case_already_open"
    },
    {
      "input": "copied-value-with-no-match",
      "status": "skipped",
      "reason": "not_found"
    }
  ],
  "summary": {
    "opened": 1,
    "skipped": 2,
    "failed": 0
  }
}
```

请求有效后，batch 响应始终为 `200`。`case_already_open`、`not_found`、
`ambiguous` 和 `not_credited` 都是逐项的 `skipped` 结果；金额无效或打开
失败是逐项的 `failed` 结果。使用相同 key 重放时，原始项目会以
`opened` 和 `idempotency_hit: true` 返回，不会创建第二个冻结。

空列表、空值、无效 `kind` 或超过 100 个唯一标识符都会返回
`invalid_payload`；不存在单独的顶层 `too_many` 错误码。缺少幂等键返回
`idempotency_key_required`，缺少组织 scope 返回 `org_required`。

## 生命周期

```mermaid
stateDiagram-v2
    [*] --> open: 组织创建案件
    open --> evidence: 上传证据
    evidence --> submitted: 提交申诉材料
    submitted --> won: 组织释放冻结
    submitted --> lost: 组织没收冻结
    open --> expired: 到期扫描
    evidence --> expired: 到期扫描
    submitted --> expired: 到期扫描
    expired --> won: 管理员明确决定
    expired --> lost: 管理员明确决定
```

案件到期后冻结仍然存在。到期只是运营信号，不会自动移动资金。

## 列出案件

```bash
curl "https://api.qbank.cl/platform/v1/disputes?from=2026-09-01&to=2026-09-30&page=1&page_size=50&status=open"   -H "Authorization: Bearer $ACCOUNT_TOKEN"
```

服务器始终按账户隔离数据；支持 `status`、`kind`、`from`、`to`、`page`
和 `page_size`。

```json
{
  "page": 1,
  "page_size": 50,
  "disputes": [
    {
      "dispute_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "account_id": "5c4b3a29-1111-4222-8333-444455556666",
      "kind": "dispute",
      "status": "evidence",
      "currency": "USD",
      "disputed_usdt": "100.000000",
      "held_usdt": "100.000000",
      "underfunded": false,
      "case_number": "CASE-2026-00041",
      "source": "import",
      "opened_by": "admin:2c1...",
      "created_at": "2026-09-19T12:00:00Z",
      "updated_at": "2026-09-19T12:05:00Z",
      "deadline_at": "2026-10-01T00:00:00Z"
    }
  ]
}
```

## 详情、上传和下载证据

`GET /v1/disputes/{id}` 返回案件、`items`、`timeline` 和 `evidence`。
原始支付 payload 不会放入响应。

```bash
curl "https://api.qbank.cl/platform/v1/disputes/7c9e6679-7425-40de-944b-e07fc1f90ae7/evidence"   -H "Authorization: Bearer $ACCOUNT_TOKEN"
```

上传 PDF、PNG 或 JPG，最大 10 MB，multipart 字段必须叫 `file`：

```bash
curl -X POST "https://api.qbank.cl/platform/v1/disputes/7c9e6679-7425-40de-944b-e07fc1f90ae7/evidence"   -H "Authorization: Bearer $ACCOUNT_TOKEN"   -F "file=@receipt.pdf;type=application/pdf"
```

```json
{
  "evidence_id": "1f2...",
  "version": 2,
  "kind": "merchant_doc",
  "sha256": "b4e2...",
  "bytes": 482110,
  "created_at": "2026-09-19T12:10:00Z"
}
```

```bash
curl "https://api.qbank.cl/platform/v1/disputes/7c9e6679-7425-40de-944b-e07fc1f90ae7/evidence/2/download"   -H "Authorization: Bearer $ACCOUNT_TOKEN" -o evidence-v2.pdf
```

## Webhook

通过常规 webhook 订阅 `dispute_status_changed`：

```json
{
  "event": "opened",
  "dispute_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "kind": "dispute",
  "status": "open",
  "account_id": "5c4b3a29-1111-4222-8333-444455556666",
  "disputed_usdt": "100.000000",
  "held_usdt": "100.000000",
  "case_number": "CASE-2026-00041",
  "deadline_at": "2026-10-01T00:00:00Z"
}
```

按 webhook event ID 去重。该事件只报告状态变化，不会替账户批准或拒绝案件。

## 错误

| HTTP | 代码 | 处理 |
|---:|---|---|
| 400 | `invalid_range` | 使用 `YYYY-MM-DD` 的 `from` 和 `to`。 |
| 400 | `invalid_payload` | 发送 multipart 文件和允许的 content type。 |
| 404 | `not_found` | 确认案件属于当前账户。 |
| 409 | `invalid_state` | 案件已关闭或不接受证据。 |
| 503 | `storage_unavailable` | 稍后重试上传，不要创建新案件。 |

完整错误请查看[错误目录](https://docs.cbpayapp.com/zh/errors)。

## FAQ

#### 账户 API 可以释放或没收案件吗？
不可以。决定属于组织管理员，并受 `disputes:write` 和双人审批保护。
#### 案件到期会自动释放冻结吗？
不会。扫描器只把案件设为 `expired` 并记录事件。
#### 提交案件后还能上传证据吗？
可以。`open`、`evidence` 和 `submitted` 接受账户证据；won、lost 和
expired 已关闭。
## 按清单区块上传证据

收到补充证据请求后，在**争议**案件页面上传文件，并选择文件覆盖的区块。
API 字段为 `category`，可选值为：

| 类别 | 应上传的材料 |
|---|---|
| `kyc` | 持有人、证件、国家、等级和验证日期。 |
| `kyb` | 企业材料，或说明付款人为个人。 |
| `screening` | AML/CFT 筛查引擎、结论和日期。 |
| `liveness` | 生物识别方式和结果。 |
| `order` | 用户邮箱、时间、收取与入账金额、目标钱包。 |
| `delivery` | 订单号、链上交易和浏览器链接。 |
| `other` | 六个标准区块之外的佐证材料。 |

门户接受最大 10 MB 的 PDF、PNG 和 JPG。服务器检查实际文件字节，而不只
依赖声明的 MIME 类型。空类别或未知类别会标准化为 `other`；类别选择不会
改变案件决定。

```bash
curl -X POST "https://api.qbank.cl/platform/v1/disputes/<DISPUTE_ID>/evidence" \
  -H "Authorization: Bearer $ACCOUNT_TOKEN" \
  -F "file=@delivery-proof.pdf;type=application/pdf" \
  -F "category=delivery"
```

案件页面会为每份材料显示类别 badge，并显示**清单覆盖**摘要
（`6 个区块中已覆盖数量`）。只有某区块至少有一份对应类别的材料时才算
覆盖；`other` 材料单独计数，不会覆盖标准区块。每次上传创建不可变证据版本，
不会提交、接受或拒绝案件。

## 本地法币

`credit_asset` 为 BOB、MXN、ARS 时返回 `409 dispute_fiat_unsupported`，不创建案件或冻结。批量跳过为 `fiat_unsupported`，导入标记 `payin holds local fiat (unsupported)`。

## USD 作为主账本资产

账户的 `settlement_asset` 与 `payin_settlement_asset` 默认值为 `USD`，可随时用
`PUT /v1/settlement` 更改；进行中的操作不会重新报价。

USD 账本金额使用美分（两位小数）。直接入账、扣账、费用以及支持 USD
资产字段的 payout、checkout、POS 和卡片流程使用 USD。USD 与 USDT 之间
的 swap 按 1:1 计价，不使用 FX 预言机。BOB、MXN、ARS 仍是独立的法币
账本资产；v1 中这些资产的 money-out 定价仍不可用。

USD 主账户的 payin 直接入账时，响应包含 `credit_asset: USD` 以及以美分
表示的 fiat 入账金额；`usdt_credited` 仍用于 USD 等值报表。争议 hold
跟随实际入账资产：USD 入账使用 `hold_asset: USD`。`disputed` 与 `held` 使用 hold 资产的单位；
`disputed_usdt` 与 `held_usdt` 是归一化后的等值字段。

## 搜索案件并查看材料进度

门户列表支持可重复或逗号分隔的 `status`、`kind`、`from`、`to`、最多
120 个字符的 `q`，以及按 `deadline`、`created` 或 `amount` 排序（前缀
`-` 表示降序）。默认按最近截止时间排序：

```bash
curl "https://api.qbank.cl/platform/v1/disputes?status=open,evidence&from=2026-11-01&to=2026-11-30&q=560679&sort=deadline&page=1&page_size=50" \
  -H "Authorization: Bearer $ACCOUNT_TOKEN"
```

每行和详情可以包含 `automation` 对象，用于显示证据进度 chip：

```json
{
  "pack_status": "ready",
  "pack_version": 2,
  "requested_at": "2026-09-19T12:10:00Z",
  "evidence_complete": false,
  "send_status": "pending",
  "send_reason": "waiting_merchant",
  "auto_sends": 0,
  "paused": false
}
```

门户不会显示 ATC 收件人或内部发送历史。chip 只说明材料是否缺失、是否
已准备好审核，以及案件是否继续处理。

## 商户会收到哪些邮件

自动邮件使用 `kontigo-std-v1` 清单。根据账户类型，邮件会请求以下六个
证据区块：

| 区块 | 最低材料 |
|---|---|
| 最终用户 KYC | 持有人、证件、国家、等级和验证日期。 |
| KYB | 公司材料，或付款人为个人的明确说明。 |
| AML/CFT 筛查 | 筛查引擎、结论和日期。 |
| 活体检测 | 生物识别方法和结果。 |
| 订单记录 | 用户 email、日期/时间、扣款与入账金额、目标钱包。 |
| 交付证明 | 订单 ID、链上交易和浏览器链接。 |

个人账户不要求 KYB；其余五个区块仍然需要。请在案件页面上传材料并选择
类别。`other` 可用于补充材料，但不会覆盖标准区块。

所有必需区块覆盖后，worker 会生成或刷新 pack，并发送给组织配置的 ATC
收件人。商户不能通过账户 API 提交 representation；账户 API 的职责是
提供材料并查看案件。上传材料是不可变的，不会单独改变案件决定。

#### 完成清单后会发生什么？
证据进度 chip 会变为完成，worker 必要时刷新 pack，普通争议随后具备自动
发送到 ATC 的条件。发送前仍会重新检查截止时间和安全控制。
#### 为什么仍显示某个区块待处理？
每个标准区块至少需要一份带对应类别的材料。`other` 材料不会覆盖标准
区块。个人账户不需要 KYB；企业账户需要。
